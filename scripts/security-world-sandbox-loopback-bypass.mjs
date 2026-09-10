import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";

const port = 32147;
const path = "/api/world-id/sandbox/rp-context";
const remoteIp = "203.0.113.77";

function request({ host = `localhost:${port}`, origin }) {
  return new Promise((resolve, reject) => {
    const headers = {
      host,
      "x-forwarded-for": remoteIp,
      "x-real-ip": remoteIp,
      forwarded: `for=${remoteIp};proto=http;host=${host}`,
    };
    if (origin !== undefined) headers.origin = origin;

    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: "POST",
        headers,
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(body);
          } catch {
            // Raw body is diagnostics only; no signing key is configured.
          }
          resolve({ status: res.statusCode, json, body });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

async function waitForServer(child) {
  const deadline = Date.now() + 30_000;
  let lastError;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Next server exited early with code ${child.exitCode}`);
    }
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(
          { hostname: "127.0.0.1", port, path: "/", headers: { host: `127.0.0.1:${port}` } },
          (res) => {
            res.resume();
            res.on("end", resolve);
          },
        );
        req.on("error", reject);
      });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw lastError ?? new Error("Timed out waiting for Next server");
}

const env = {
  ...process.env,
  WORLD_ID_SANDBOX_PROOF_ENABLED: "true",
  WORLD_ID_RP_SIGNING_KEY: "",
  PORT: String(port),
};

// Exact supported human Sandbox launch shape: package.json uses `next dev -p 3000`
// with no explicit loopback hostname. No RP key is configured, so a 503 key error
// proves the request passed the local-only guard without producing a signature.
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "-p", String(port)],
  { env, stdio: ["ignore", "pipe", "pipe"] },
);

let serverLog = "";
child.stdout.on("data", (chunk) => {
  serverLog += chunk.toString();
});
child.stderr.on("data", (chunk) => {
  serverLog += chunk.toString();
});

try {
  await waitForServer(child);

  // Remote-marked request with a non-loopback Host. A true peer/local boundary
  // must reject this before touching signer configuration. Current `next dev`
  // rewrites the route Request URL to its internal localhost origin, so the guard
  // accepts it when Origin is absent.
  const hostileHostNoOrigin = await request({ host: `attacker.example:${port}` });
  assert.equal(
    hostileHostNoOrigin.status,
    503,
    `expected hostile Host/no-Origin request to demonstrate guard bypass, got ${hostileHostNoOrigin.status}: ${hostileHostNoOrigin.body}`,
  );
  assert.equal(
    hostileHostNoOrigin.json?.code,
    "WORLD_ID_RP_SIGNING_KEY_NOT_CONFIGURED",
    `hostile Host/no-Origin request did not reach signer configuration: ${hostileHostNoOrigin.body}`,
  );

  // Browser-style cross-origin traffic is separately rejected. This control shows
  // Origin comparison works but is not a substitute for the claimed local-only
  // transport boundary because non-browser/no-Origin requests are accepted.
  const crossOrigin = await request({
    origin: "https://attacker.example",
  });
  assert.equal(
    crossOrigin.status,
    404,
    `mismatched browser Origin should be blocked, got ${crossOrigin.status}: ${crossOrigin.body}`,
  );

  const loopbackNoOrigin = await request({});
  assert.equal(loopbackNoOrigin.status, 503);
  assert.equal(loopbackNoOrigin.json?.code, "WORLD_ID_RP_SIGNING_KEY_NOT_CONFIGURED");

  console.log("SEC-WORLD-005 World Sandbox local-only boundary bypass reproduced");
  console.log(
    JSON.stringify(
      {
        serverShape: "next dev without explicit hostname",
        remoteMarker: remoteIp,
        hostileHost: `attacker.example:${port}`,
        hostileHostNoOriginPassedGuard: true,
        reachedCode: hostileHostNoOrigin.json?.code,
        crossOriginBrowserRequestBlocked: true,
        signingKeyConfigured: false,
        signatureProduced: false,
      },
      null,
      2,
    ),
  );
} catch (error) {
  if (serverLog) console.error(serverLog);
  throw error;
} finally {
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 3_000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}
