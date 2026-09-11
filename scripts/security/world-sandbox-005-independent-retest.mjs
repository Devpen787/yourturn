import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import os from "node:os";

import { isLocalWorldIdSandboxRequest } from "../../lib/world-id/sandbox-server-guard.ts";

const LOOPBACK = "127.0.0.1";
const ROUTE = "/api/world-id/sandbox/rp-context";
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

function canConnect(host, port, timeoutMs = 900) {
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
      throw new Error(`server exited before listening (code ${child.exitCode})`);
    }
    if (await canConnect(host, port, 250)) return;
    await delay(250);
  }
  throw new Error(`timed out waiting for ${host}:${port}`);
}

function request(host, port, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host,
        port,
        path: ROUTE,
        method: "POST",
        headers,
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
          if (body.length > 16_000) body = body.slice(0, 16_000);
        });
        res.once("end", () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.once("error", reject);
    req.end();
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
    if (logs.length > 12_000) logs = logs.slice(-12_000);
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

async function withServer(label, child, host, port, fn) {
  try {
    await waitForListener(child, host, port);
    await fn();
  } catch (error) {
    const logs = child.getLogs?.();
    if (logs) console.error(`\n${label} server output:\n${logs}`);
    throw error;
  } finally {
    await stop(child);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function withGuardEnv(env, fn) {
  const names = [
    "NODE_ENV",
    "WORLD_ID_SANDBOX_PROOF_ENABLED",
    "WORLD_ID_SANDBOX_TRANSPORT",
  ];
  const before = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    for (const name of names) {
      if (Object.prototype.hasOwnProperty.call(env, name)) {
        const value = env[name];
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
    return fn();
  } finally {
    for (const name of names) {
      const value = before[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

console.log("Independent SEC-WORLD-005 retest");
console.log("=================================");

// Application-level fail-closed backstop: even if the feature flag and the
// non-secret dedicated-launch marker are present, production mode must never
// admit the Sandbox API. This deliberately treats URL/Origin as metadata only.
const localRequest = new Request(`http://${LOOPBACK}:3000${ROUTE}`);
assert(
  withGuardEnv(
    {
      NODE_ENV: "production",
      WORLD_ID_SANDBOX_PROOF_ENABLED: "true",
      WORLD_ID_SANDBOX_TRANSPORT: "loopback-v1",
    },
    () => !isLocalWorldIdSandboxRequest(localRequest),
  ),
  "production mode admitted the World Sandbox guard",
);

assert(
  withGuardEnv(
    {
      NODE_ENV: "development",
      WORLD_ID_SANDBOX_PROOF_ENABLED: "true",
      WORLD_ID_SANDBOX_TRANSPORT: "",
    },
    () => !isLocalWorldIdSandboxRequest(localRequest),
  ),
  "generic development mode admitted the World Sandbox guard without its launch marker",
);

assert(
  withGuardEnv(
    {
      NODE_ENV: "development",
      WORLD_ID_SANDBOX_PROOF_ENABLED: "true",
      WORLD_ID_SANDBOX_TRANSPORT: "loopback-v1",
    },
    () => isLocalWorldIdSandboxRequest(localRequest),
  ),
  "dedicated local development mode did not admit the intended loopback request",
);
console.log("ok  guard fails closed in production and generic development mode");

const interfaces = nonLoopbackIpv4Addresses();
assert(interfaces.length > 0, "no non-loopback IPv4 interface available for transport attack");

const baseEnv = {
  ...process.env,
  NODE_ENV: "development",
  WORLD_ID_SANDBOX_PROOF_ENABLED: "true",
  WORLD_ID_RP_SIGNING_KEY: "",
  NEXT_TELEMETRY_DISABLED: "1",
};

// Reproduce the old vulnerable launch shape. The generic Next listener may be
// externally reachable, but the API must stay dark because only the dedicated
// Sandbox command is allowed to set the marker.
const genericPort = await getFreePort();
const generic = start(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "-p", String(genericPort)],
  {
    ...baseEnv,
    WORLD_ID_SANDBOX_TRANSPORT: "",
  },
);

await withServer("generic dev", generic, LOOPBACK, genericPort, async () => {
  const local = await request(LOOPBACK, genericPort, {
    host: `attacker.example:${genericPort}`,
    "x-forwarded-for": "203.0.113.77",
    "x-forwarded-host": `localhost:${genericPort}`,
  });
  assert(local.status === 404, `generic dev local/header attack returned ${local.status}, expected 404`);

  let reachableRemoteInterfaces = 0;
  for (const address of interfaces) {
    if (!(await canConnect(address, genericPort))) continue;
    reachableRemoteInterfaces += 1;
    const remote = await request(address, genericPort, {
      host: `attacker.example:${genericPort}`,
      "x-forwarded-for": "203.0.113.77",
      "x-forwarded-host": `localhost:${genericPort}`,
    });
    assert(
      remote.status === 404,
      `old non-loopback attack shape reached enabled Sandbox API on ${address} (${remote.status})`,
    );
  }

  console.log(
    `ok  generic next dev kept Sandbox API dark across ${reachableRemoteInterfaces} reachable non-loopback interface(s)`,
  );
});

// Attack the exact supported command. It may enable the guarded route locally,
// but the listener itself must not accept a TCP connection on any non-loopback
// interface. Header spoofing is deliberately exercised over the permitted local
// transport to prove it is not being mistaken for peer-address evidence.
const sandboxPort = await getFreePort();
const sandbox = start("npm", ["run", "world:sandbox:dev"], {
  ...baseEnv,
  PORT: String(sandboxPort),
  // The script must establish its own marker; do not provide it from the test.
  WORLD_ID_SANDBOX_TRANSPORT: "",
});

await withServer("supported Sandbox", sandbox, LOOPBACK, sandboxPort, async () => {
  const local = await request(LOOPBACK, sandboxPort, {
    host: `attacker.example:${sandboxPort}`,
    "x-forwarded-for": "203.0.113.77",
    "x-forwarded-host": `attacker.example:${sandboxPort}`,
  });
  assert(
    local.status === 503,
    `supported local Sandbox request did not reach missing-key boundary (${local.status})`,
  );
  assert(
    !local.body.includes("203.0.113.77") && !local.body.includes("attacker.example"),
    "local Sandbox error reflected attacker transport metadata",
  );

  const badOrigin = await request(LOOPBACK, sandboxPort, {
    origin: "http://attacker.example",
  });
  assert(badOrigin.status === 404, `mismatched Origin returned ${badOrigin.status}, expected 404`);

  for (const address of interfaces) {
    assert(
      !(await canConnect(address, sandboxPort)),
      `supported Sandbox listener accepted a non-loopback TCP connection on ${address}`,
    );
  }

  console.log("ok  exact npm run world:sandbox:dev route is enabled only on 127.0.0.1");
  console.log(`ok  supported listener rejected ${interfaces.length} non-loopback interface(s)`);
  console.log("ok  Host/forwarding metadata is not a transport trust anchor; bad Origin still fails closed");
});

console.log(
  JSON.stringify(
    {
      secWorld005Reproduced: false,
      productionGuardFailedClosed: true,
      genericDevApiFailedClosed: true,
      supportedLaunchLoopbackReachable: true,
      supportedLaunchNonLoopbackReachable: false,
      mismatchedOriginRejected: true,
      rpKeyLoaded: false,
      signatureProduced: false,
      providerCalled: false,
    },
    null,
    2,
  ),
);
