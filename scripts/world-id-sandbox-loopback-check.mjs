import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import os from "node:os";

const ROUTE = "/api/world-id/sandbox/rp-context";
const LOOPBACK = "127.0.0.1";
const START_TIMEOUT_MS = 45_000;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, LOOPBACK, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a loopback test port"));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

function canConnect(host, port, timeoutMs = 750) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;

    const finish = (connected) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(connected);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.once("timeout", () => finish(false));
  });
}

async function waitForListener(child, host, port) {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited before listening (code ${child.exitCode})`);
    }
    if (await canConnect(host, port, 250)) return;
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${host}:${port}`);
}

function requestStatus(host, port, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        host,
        port,
        path: ROUTE,
        method: "POST",
        headers,
      },
      (response) => {
        response.resume();
        response.once("end", () => resolve(response.statusCode ?? 0));
      },
    );
    request.once("error", reject);
    request.end();
  });
}

function nonLoopbackIpv4Addresses() {
  return Object.values(os.networkInterfaces())
    .flatMap((entries) => entries ?? [])
    .filter(
      (entry) =>
        entry.family === "IPv4" &&
        !entry.internal &&
        entry.address !== LOOPBACK,
    )
    .map((entry) => entry.address);
}

function start(command, args, env) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });

  let logs = "";
  const append = (chunk) => {
    logs += chunk.toString();
    if (logs.length > 8_000) logs = logs.slice(-8_000);
  };
  child.stdout?.on("data", append);
  child.stderr?.on("data", append);
  child.getLogs = () => logs;
  return child;
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;

  try {
    if (process.platform === "win32") child.kill("SIGTERM");
    else process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }

  const exited = await Promise.race([
    new Promise((resolve) => child.once("exit", () => resolve(true))),
    delay(5_000).then(() => false),
  ]);

  if (!exited && child.exitCode === null) {
    try {
      if (process.platform === "win32") child.kill("SIGKILL");
      else process.kill(-child.pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
  }
}

async function withServer(label, child, host, port, test) {
  try {
    await waitForListener(child, host, port);
    await test();
  } catch (error) {
    const logs = child.getLogs?.();
    if (logs) console.error(`\n${label} server output:\n${logs}`);
    throw error;
  } finally {
    await stop(child);
  }
}

const baseEnv = {
  ...process.env,
  WORLD_ID_SANDBOX_PROOF_ENABLED: "true",
  WORLD_ID_RP_SIGNING_KEY: "",
};

console.log("World ID Sandbox loopback boundary check");
console.log("========================================");

// First prove the route is dark in a production runtime even if both the
// non-secret launch marker and feature flag are supplied. This runs before any
// `next dev` process can replace the production .next build created by CI.
const productionPort = await getFreePort();
const production = start(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "-H",
    LOOPBACK,
    "-p",
    String(productionPort),
  ],
  {
    ...baseEnv,
    NODE_ENV: "production",
    WORLD_ID_SANDBOX_TRANSPORT: "loopback-v1",
  },
);

await withServer("production", production, LOOPBACK, productionPort, async () => {
  const status = await requestStatus(LOOPBACK, productionPort);
  if (status !== 404) {
    throw new Error(`Sandbox API must fail closed in production; received ${status}`);
  }
  console.log("ok  Sandbox API returns 404 outside development mode");
});

// Re-run the old unsafe launch shape. The generic dev server may listen on a
// non-loopback interface, but the Sandbox API must remain disabled because the
// dedicated transport marker is absent.
const genericPort = await getFreePort();
const genericDev = start("npm", ["run", "dev"], {
  ...baseEnv,
  NODE_ENV: "development",
  PORT: String(genericPort),
});

await withServer("generic dev", genericDev, LOOPBACK, genericPort, async () => {
  const loopbackStatus = await requestStatus(LOOPBACK, genericPort);
  if (loopbackStatus !== 404) {
    throw new Error(
      `Sandbox API must stay dark under generic dev launch; received ${loopbackStatus}`,
    );
  }

  const interfaces = nonLoopbackIpv4Addresses();
  for (const address of interfaces) {
    if (await canConnect(address, genericPort)) {
      const remoteStatus = await requestStatus(address, genericPort);
      if (remoteStatus !== 404) {
        throw new Error(
          `Generic non-loopback listener reached Sandbox API with status ${remoteStatus}`,
        );
      }
    }
  }
  console.log("ok  generic dev launch cannot enable the Sandbox API");
});

// The supported Sandbox command is the actual transport boundary. It must be
// reachable on IPv4 loopback, enable the guarded route there, and be unreachable
// through every non-loopback IPv4 interface visible to the runner.
const sandboxPort = await getFreePort();
const sandboxDev = start("npm", ["run", "world:sandbox:dev"], {
  ...baseEnv,
  NODE_ENV: "development",
  PORT: String(sandboxPort),
});

await withServer("supported Sandbox", sandboxDev, LOOPBACK, sandboxPort, async () => {
  const localStatus = await requestStatus(LOOPBACK, sandboxPort);
  if (localStatus !== 503) {
    throw new Error(
      `Expected guarded local Sandbox route to reach missing-key check (503); received ${localStatus}`,
    );
  }

  const originStatus = await requestStatus(LOOPBACK, sandboxPort, {
    origin: "http://attacker.example",
  });
  if (originStatus !== 404) {
    throw new Error(`Mismatched Origin must be rejected; received ${originStatus}`);
  }

  const interfaces = nonLoopbackIpv4Addresses();
  if (interfaces.length === 0) {
    throw new Error(
      "No non-loopback IPv4 interface is available; cannot prove transport isolation",
    );
  }

  for (const address of interfaces) {
    if (await canConnect(address, sandboxPort)) {
      throw new Error(
        "Supported Sandbox launch accepted a TCP connection through a non-loopback interface",
      );
    }
  }

  console.log("ok  supported Sandbox launch is reachable on 127.0.0.1");
  console.log("ok  mismatched browser Origin is rejected as defense-in-depth");
  console.log(
    `ok  supported Sandbox launch rejected non-loopback transport on ${interfaces.length} interface(s)`,
  );
});

console.log("\nSEC-WORLD-005 repair has executable CI evidence; independent Security retest is still required.");
