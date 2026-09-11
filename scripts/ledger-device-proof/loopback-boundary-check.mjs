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
if (!external) {
  console.log("  SKIP  no non-loopback IPv4 interface on this host; runtime denial not exercised");
} else {
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

console.log(`\nLedger ceremony transport boundary: ${failures === 0 ? "PASS" : "FAIL"} (${failures} failure(s))`);
console.log("  Evidence class: LOCAL. Proves transport binding semantics only.");
console.log("  Does NOT prove device provenance, route authorization, or that a real ceremony occurred.");
process.exit(failures === 0 ? 0 : 1);
