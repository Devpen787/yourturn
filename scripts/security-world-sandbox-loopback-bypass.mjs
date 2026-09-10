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
            // Keep the raw body only for diagnostics; no secret is configured.
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

// Run the same Next development-server shape used by `npm run dev`. This is the
// human Sandbox path documented by the candidate. No RP key is configured, so
// the test cannot sign anything; a 503 key error means the local guard was passed.
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

  const nonLoopbackHost = await request({ host: `attacker.example:${port}` });
  assert.equal(
    nonLoopbackHost.status,
    404,
    `non-loopback Host control should be blocked, got ${nonLoopbackHost.status}: ${nonLoopbackHost.body}`,
  );

  const crossOrigin = await request({
    origin: "https://attacker.example",
  });
  assert.equal(
    crossOrigin.status,
    404,
    `mismatched browser Origin should be blocked, got ${crossOrigin.status}: ${crossOrigin.body}`,
  );

  const noOrigin = await request({});
  assert.equal(
    noOrigin.status,
    503,
    `remote-marked request with spoofed loopback Host and no Origin reached unexpected status ${noOrigin.status}: ${noOrigin.body}`,
  );
  assert.equal(
    noOrigin.json?.code,
    "WORLD_ID_RP_SIGNING_KEY_NOT_CONFIGURED",
    `request should have passed the local guard and reached the signing-key check: ${noOrigin.body}`,
  );

  const matchingSpoofedOrigin = await request({
    origin: `http://localhost:${port}`,
  });
  assert.equal(
    matchingSpoofedOrigin.status,
    503,
    `remote-marked request with matching spoofed Origin reached unexpected status ${matchingSpoofedOrigin.status}: ${matchingSpoofedOrigin.body}`,
  );
  assert.equal(
    matchingSpoofedOrigin.json?.code,
    "WORLD_ID_RP_SIGNING_KEY_NOT_CONFIGURED",
    `matching spoofed Origin should demonstrate the same peer-address blind spot: ${matchingSpoofedOrigin.body}`,
  );

  console.log("SEC-WORLD-SANDBOX loopback-boundary attack reproduced");
  console.log(
    JSON.stringify(
      {
        serverShape: "next dev (same as npm run dev)",
        nonLoopbackHostBlocked: true,
        crossOriginBlocked: true,
        remoteHeaders: {
          "x-forwarded-for": remoteIp,
          "x-real-ip": remoteIp,
        },
        spoofedLoopbackHostNoOriginPassedGuard: true,
        spoofedLoopbackHostMatchingOriginPassedGuard: true,
        reachedCode: noOrigin.json?.code,
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
