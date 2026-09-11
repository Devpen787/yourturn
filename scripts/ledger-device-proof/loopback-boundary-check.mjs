/**
 * Ledger ceremony transport boundary — executable denial evidence.
 *
 * Security condition (#16 comment 5638105252): the supported ceremony launch must
 * be transport-bound to loopback, with deliberate IPv4/IPv6 behaviour, and a
 * client-side base-URL allowlist is explicitly insufficient.
 *
 * This proves the boundary three ways, without Next, hardware, credentials or a
 * network write. It binds throwaway listeners on ephemeral ports on this host only.
 *
 *   1 CONTRACT  package.json `dev:ceremony` carries an explicit loopback host flag,
 *               and the runbook directs the ceremony at that script.
 *   2 DENIAL    a listener bound to 127.0.0.1 REFUSES a connection addressed to this
 *               host's non-loopback IPv4 address, while 127.0.0.1 still succeeds.
 *   3 LOAD-BEARING  the same listener with NO host bound (what `next dev -p 3000`
 *               does today) IS reachable on that same non-loopback address —
 *               so the denial in (2) is caused by the flag, not by the environment.
 *
 * Exit 0 = boundary holds. Exit 1 = boundary not established.
 * If the host has no non-loopback IPv4 address, (2) and (3) are reported SKIPPED
 * rather than silently passing.
 */
import net from "node:net";
import { spawn } from "node:child_process";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";

let failures = 0;
const ok = (c, m) => { console.log(`  ${c ? "PASS" : "FAIL"}  ${m}`); if (!c) failures += 1; };

function nonLoopbackIpv4() {
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === "IPv4" && !a.internal) return a.address;
    }
  }
  return null;
}

function listen(host) {
  return new Promise((resolve, reject) => {
    // Client probes destroy immediately; swallow the resulting peer resets so the
    // probe cannot crash the check with an unhandled socket error event.
    const srv = net.createServer((s) => { s.on("error", () => {}); s.end("ok"); });
    srv.on("error", reject);
    host === undefined ? srv.listen(0, () => resolve(srv)) : srv.listen(0, host, () => resolve(srv));
  });
}

function connect(host, port, timeout = 1500) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    const done = (r) => { try { s.destroy(); } catch {} resolve(r); };
    s.setTimeout(timeout);
    s.once("connect", () => done({ connected: true }));
    s.once("timeout", () => done({ connected: false, reason: "timeout" }));
    s.once("error", (e) => done({ connected: false, reason: e.code || e.message }));
    s.connect(port, host);
  });
}

const root = path.resolve(process.cwd(), process.cwd().endsWith("ledger-device-proof") ? "../.." : ".");

// ---- 1. contract ----
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const ceremony = pkg.scripts?.["dev:ceremony"];
ok(typeof ceremony === "string", "package.json defines a dev:ceremony script");
ok(/\s-H\s+127\.0\.0\.1(\s|$)/.test(ceremony ?? ""), `dev:ceremony binds an explicit IPv4 loopback host  [${ceremony ?? "absent"}]`);
ok(!/\s-H\s+0\.0\.0\.0/.test(ceremony ?? ""), "dev:ceremony does not bind the unspecified address");

const runbookPath = path.join(root, "docs/ethonline-2026/ledger/DEVICE_QUALIFICATION_RUNBOOK.md");
const runbook = fs.readFileSync(runbookPath, "utf8");
ok(runbook.includes("npm run dev:ceremony"), "runbook launches the ceremony via dev:ceremony");
ok(!/\bnpm run dev:clean\b/.test(runbook), "runbook no longer launches the ceremony via an unbound dev:clean");

// ---- 2 + 3. runtime denial ----
const external = nonLoopbackIpv4();
let runtimeExercised = false;
if (!external) {
  // Security condition: this branch must NOT be accepted as confinement evidence.
  // Printing SKIP and still exiting 0 would let a no-interface host masquerade as a
  // passing denial proof, so the check reports NOT EXERCISED and fails.
  console.log("  NOT EXERCISED  no non-loopback IPv4 interface on this host");
  console.log("                 runtime denial was not proven; this is NOT confinement evidence");
  failures += 1;
} else {
  runtimeExercised = true;
  console.log(`  (probing against this host's non-loopback IPv4: ${external.replace(/\d+$/, "x")})`);

  const bound = await listen("127.0.0.1");
  const boundPort = bound.address().port;
  const viaLoopback = await connect("127.0.0.1", boundPort);
  const viaExternal = await connect(external, boundPort);
  bound.close();
  ok(viaLoopback.connected, "loopback-bound listener ACCEPTS 127.0.0.1");
  ok(!viaExternal.connected, `loopback-bound listener REFUSES the non-loopback address  [${viaExternal.reason ?? "connected"}]`);

  const unbound = await listen(undefined);
  const unboundPort = unbound.address().port;
  const unboundExternal = await connect(external, unboundPort);
  unbound.close();
  ok(unboundExternal.connected,
    "control: an UNBOUND listener (today's `next dev -p 3000`) IS reachable on that address — the flag is load-bearing");
}

// --- OPT-IN: actual Next process binding evidence (--with-next) ---
// Off by default so CI stays fast and deterministic. When enabled it starts the REAL
// `next dev -H 127.0.0.1` on an ephemeral port with NO application env, probes it, and
// kills it. No credentials, no device, no mandate, no transaction: this is a transport
// probe of the supported launch flag, not the ceremony.
if (process.argv.includes("--with-next")) {
  console.log("\n  --with-next: starting the real Next dev server bound to 127.0.0.1 (no app env)");
  const port = 39871;
  const child = spawn("npx", ["next", "dev", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: root, stdio: "ignore", env: { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: "development" },
  });
  const waitReady = async () => {
    for (let i = 0; i < 60; i += 1) {
      const r = await connect("127.0.0.1", port, 500);
      if (r.connected) return true;
      await new Promise((z) => setTimeout(z, 1000));
    }
    return false;
  };
  try {
    const up = await waitReady();
    ok(up, "real Next dev server accepted a connection on 127.0.0.1");
    if (up) {
      if (external) {
        const ext = await connect(external, port);
        ok(!ext.connected, `real Next dev server REFUSES the non-loopback address  [${ext.reason ?? "connected"}]`);
      }
      // -H 127.0.0.1 binds IPv4 only; ::1 must therefore also be unreachable.
      const v6 = await connect("::1", port);
      ok(!v6.connected, `real Next dev server REFUSES IPv6 ::1 (IPv4-only bind is deliberate)  [${v6.reason ?? "connected"}]`);
    }
  } finally {
    try { child.kill("SIGKILL"); } catch {}
  }
}

// --- runbook / CI install consistency (both must enforce the committed helper lock) ---
const runbookTxt = fs.readFileSync(runbookPath, "utf8");
const ciPath = path.join(root, ".github/workflows/ethonline-ci.yml");
const ci = fs.readFileSync(ciPath, "utf8");
ok(!/npm install\s+--no-package-lock/.test(runbookTxt),
   "runbook does NOT install the helper with --no-package-lock");
ok(/cd scripts\/ledger-device-proof\s*\nnpm ci --legacy-peer-deps/.test(runbookTxt),
   "runbook installs the helper with lock-enforcing npm ci --legacy-peer-deps");
ok(!/npm install\s+--no-package-lock/.test(ci),
   "CI does NOT install the helper with --no-package-lock");
ok(/npm ci --legacy-peer-deps/.test(ci),
   "CI installs the helper with lock-enforcing npm ci --legacy-peer-deps");
ok(fs.existsSync(path.join(root, "scripts/ledger-device-proof/package-lock.json")),
   "helper lockfile that both paths depend on is committed");

console.log(`\nLedger ceremony transport boundary: ${failures === 0 ? "PASS" : "FAIL"} (${failures} failure(s))`);
console.log(`  runtime denial branch: ${runtimeExercised ? "EXERCISED" : "NOT EXERCISED"}`);
console.log("  Evidence class: LOCAL. Generic Node TCP listeners + static command/runbook assertions.");
console.log(process.argv.includes("--with-next")
  ? "  --with-next exercised the REAL Next dev process binding; still no HTTP/browser-Origin authorization check."
  : "  Does NOT execute Next; run with --with-next for real-process binding evidence. No browser-Origin check either way.");
console.log("  Does NOT prove device provenance, route authorization, or that a real ceremony occurred.");
process.exit(failures === 0 ? 0 : 1);
