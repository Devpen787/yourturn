import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import { isLocalWorldIdSandboxRequest } from "../../lib/world-id/sandbox-server-guard.ts";

const HOST = "127.0.0.1";
const ROUTE = "/api/world-id/sandbox/rp-context";
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function withEnv(patch, fn) {
  const keys = ["NODE_ENV", "WORLD_ID_SANDBOX_PROOF_ENABLED", "WORLD_ID_SANDBOX_TRANSPORT"];
  const old = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    for (const k of keys) patch[k] === undefined ? delete process.env[k] : process.env[k] = patch[k];
    return fn();
  } finally {
    for (const k of keys) old[k] === undefined ? delete process.env[k] : process.env[k] = old[k];
  }
}

function guard(url, origin, patch = {}) {
  const headers = new Headers();
  if (origin !== undefined) headers.set("origin", origin);
  return withEnv({
    NODE_ENV: "development",
    WORLD_ID_SANDBOX_PROOF_ENABLED: "true",
    WORLD_ID_SANDBOX_TRANSPORT: "loopback-v1",
    ...patch,
  }, () => isLocalWorldIdSandboxRequest(new Request(url, { headers })));
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer().once("error", reject);
    s.listen(0, HOST, () => {
      const a = s.address();
      if (!a || typeof a === "string") return reject(new Error("no loopback port"));
      s.close((e) => e ? reject(e) : resolve(a.port));
    });
  });
}

function connect(host, port, timeout = 800) {
  return new Promise((resolve) => {
    const s = net.createConnection({ host, port });
    let done = false;
    const finish = (v) => { if (!done) { done = true; s.destroy(); resolve(v); } };
    s.setTimeout(timeout).once("connect", () => finish(true)).once("error", () => finish(false)).once("timeout", () => finish(false));
  });
}

function request(host, port, headers = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host, port, path: ROUTE, method: "POST", headers }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => body += c);
      res.once("end", () => resolve({ status: res.statusCode ?? 0, body: body.slice(0, 12000) }));
    });
    r.once("error", reject); r.end();
  });
}

function start(command, args, env) {
  const child = spawn(command, args, { cwd: process.cwd(), env, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] });
  let logs = "";
  child.stdout?.on("data", (c) => logs = (logs + c).slice(-12000));
  child.stderr?.on("data", (c) => logs = (logs + c).slice(-12000));
  child.getLogs = () => logs;
  return child;
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
  try { process.platform === "win32" ? child.kill("SIGTERM") : process.kill(-child.pid, "SIGTERM"); } catch { child.kill("SIGTERM"); }
  await Promise.race([new Promise((r) => child.once("exit", r)), sleep(5000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

async function withServer(label, child, port, fn) {
  try {
    const end = Date.now() + 45000;
    while (Date.now() < end && !(await connect(HOST, port, 250))) {
      if (child.exitCode !== null) throw new Error(`${label} exited ${child.exitCode}`);
      await sleep(250);
    }
    assert(await connect(HOST, port, 250), `${label} never listened`);
    await fn();
  } catch (e) {
    console.error(child.getLogs?.() ?? "");
    throw e;
  } finally { await stop(child); }
}

console.log("Independent World Sandbox Origin regression retest");
const p = 43123;
const req127 = `http://127.0.0.1:${p}${ROUTE}`;
const reqLocal = `http://localhost:${p}${ROUTE}`;
for (const [url, origin] of [
  [req127, `http://127.0.0.1:${p}`], [req127, `http://localhost:${p}`],
  [reqLocal, `http://127.0.0.1:${p}`], [reqLocal, `http://localhost:${p}`],
  [req127, `HTTP://LOCALHOST:${p}`],
]) assert(guard(url, origin), `valid loopback alias rejected: ${origin}`);
for (const origin of [
  `https://127.0.0.1:${p}`, `http://127.0.0.1:${p + 1}`, `http://localhost:${p + 1}`,
  `http://attacker.example:${p}`, `http://localhost.attacker.example:${p}`,
  `http://127.0.0.1.nip.io:${p}`, `http://[::1]:${p}`, "null",
]) assert(!guard(req127, origin), `confusion Origin admitted: ${origin}`);
assert(!guard(`http://attacker.example:${p}${ROUTE}`, `http://attacker.example:${p}`), "non-loopback request URL admitted");
assert(!guard(req127, `http://127.0.0.1:${p}`, { NODE_ENV: "production" }), "production admitted route");
assert(!guard(req127, `http://127.0.0.1:${p}`, { WORLD_ID_SANDBOX_TRANSPORT: "" }), "generic dev admitted route");
assert(!guard(req127, `http://127.0.0.1:${p}`, { WORLD_ID_SANDBOX_PROOF_ENABLED: "false" }), "disabled proof admitted route");

const ifaces = Object.values(os.networkInterfaces()).flatMap((x) => x ?? []).filter((x) => x.family === "IPv4" && !x.internal && x.address !== HOST).map((x) => x.address);
assert(ifaces.length > 0, "no non-loopback interface available");
const baseEnv = { ...process.env, NODE_ENV: "development", WORLD_ID_SANDBOX_PROOF_ENABLED: "true", WORLD_ID_RP_SIGNING_KEY: "", NEXT_TELEMETRY_DISABLED: "1" };

const genericPort = await freePort();
const generic = start(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", String(genericPort)], { ...baseEnv, WORLD_ID_SANDBOX_TRANSPORT: "" });
await withServer("generic dev", generic, genericPort, async () => {
  const local = await request(HOST, genericPort, { origin: `http://localhost:${genericPort}` });
  assert(local.status === 404, `generic dev enabled route (${local.status})`);
  for (const addr of ifaces) if (await connect(addr, genericPort)) {
    const remote = await request(addr, genericPort, { origin: `http://localhost:${genericPort}` });
    assert(remote.status === 404, `generic remote route enabled on ${addr} (${remote.status})`);
  }
});

const sandboxPort = await freePort();
const sandbox = start("npm", ["run", "world:sandbox:dev"], { ...baseEnv, PORT: String(sandboxPort), WORLD_ID_SANDBOX_TRANSPORT: "" });
await withServer("supported Sandbox", sandbox, sandboxPort, async () => {
  for (const origin of [`http://127.0.0.1:${sandboxPort}`, `http://localhost:${sandboxPort}`]) {
    const r = await request(HOST, sandboxPort, { origin });
    assert(r.status === 503, `${origin} failed browser compatibility (${r.status})`);
    assert(!r.body.includes("WORLD_ID_RP_SIGNING_KEY="), "RP key material reflected");
  }
  for (const origin of [`https://127.0.0.1:${sandboxPort}`, `http://127.0.0.1:${sandboxPort + 1}`, `http://attacker.example:${sandboxPort}`, `http://localhost.attacker.example:${sandboxPort}`, `http://127.0.0.1.nip.io:${sandboxPort}`]) {
    const r = await request(HOST, sandboxPort, { origin });
    assert(r.status === 404, `confusion Origin passed live guard: ${origin}`);
  }
  const spoof = await request(HOST, sandboxPort, { origin: `http://localhost:${sandboxPort}`, host: `attacker.example:${sandboxPort}`, "x-forwarded-for": "203.0.113.77", "x-forwarded-host": `attacker.example:${sandboxPort}` });
  assert(spoof.status === 503, `headers altered transport semantics (${spoof.status})`);
  assert(!spoof.body.includes("203.0.113.77"), "attacker transport metadata reflected");
  for (const addr of ifaces) assert(!(await connect(addr, sandboxPort)), `supported launch accepted non-loopback TCP on ${addr}`);
});

console.log(JSON.stringify({ secWorld005Regression: false, productionFailClosed: true, genericDevFailClosed: true, loopbackAliasCompatibility: true, originConfusionRejected: true, nonLoopbackTransportReachable: false, rpKeyLoaded: false, signatureProduced: false }, null, 2));
