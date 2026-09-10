import assert from "node:assert/strict";
import http from "node:http";
import os from "node:os";
import { spawn } from "node:child_process";

const port = 32147;
const path = "/api/world-id/sandbox/rp-context";

function firstNonLoopbackIpv4() {
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      const isIpv4 = entry.family === "IPv4" || entry.family === 4;
      if (isIpv4 && !entry.internal && entry.address !== "127.0.0.1") {
        return entry.address;
      }
    }
  }
  throw new Error("No non-loopback IPv4 interface available for boundary attack");
}

function request({ connectHost, host = `localhost:${port}`, origin }) {
  return new Promise((resolve, reject) => {
    const headers = { host };
    if (origin !== undefined) headers.origin = origin;

    const req = http.request(
      {
        hostname: connectHost,
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
  const nonLoopbackIp = firstNonLoopbackIpv4();

  // Reach the dev server through an actual non-loopback interface rather than
  // 127.0.0.1. A true loopback-only transport boundary would not accept this
  // connection. The hostile Host additionally proves request.url is not a safe
  // substitute for the external connection/Host boundary in this Next shape.
  const nonLoopbackNoOrigin = await request({
    connectHost: nonLoopbackIp,
    host: `attacker.example:${port}`,
  });
  assert.equal(
    nonLoopbackNoOrigin.status,
    503,
    `expected non-loopback connection to demonstrate guard bypass, got ${nonLoopbackNoOrigin.status}: ${nonLoopbackNoOrigin.body}`,
  );
  assert.equal(
    nonLoopbackNoOrigin.json?.code,
    "WORLD_ID_RP_SIGNING_KEY_NOT_CONFIGURED",
    `non-loopback connection did not reach signer configuration: ${nonLoopbackNoOrigin.body}`,
  );

  // Browser cross-origin traffic is separately rejected. That defense does not
  // make the route local-only because clients without Origin still reach it.
  const crossOrigin = await request({
    connectHost: nonLoopbackIp,
    host: `attacker.example:${port}`,
    origin: "https://attacker.example",
  });
  assert.equal(
    crossOrigin.status,
    404,
    `mismatched browser Origin should be blocked, got ${crossOrigin.status}: ${crossOrigin.body}`,
  );

  const loopbackNoOrigin = await request({ connectHost: "127.0.0.1" });
  assert.equal(loopbackNoOrigin.status, 503);
  assert.equal(loopbackNoOrigin.json?.code, "WORLD_ID_RP_SIGNING_KEY_NOT_CONFIGURED");

  console.log("SEC-WORLD-005 World Sandbox local-only boundary bypass reproduced");
  console.log(
    JSON.stringify(
      {
        serverShape: "next dev without explicit hostname",
        nonLoopbackInterface: nonLoopbackIp,
        hostileHost: `attacker.example:${port}`,
        nonLoopbackConnectionPassedGuard: true,
        reachedCode: nonLoopbackNoOrigin.json?.code,
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
