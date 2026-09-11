/**
 * Parity tests for the mode preflight checker.
 *
 * Every value here is SYNTHETIC and the checker is always spawned with an
 * explicitly constructed environment, never the ambient one. No .env file is
 * read, no key is loaded, and no live runner is invoked — the runners have
 * network effects, so parity is asserted against their documented rejection
 * conditions rather than by executing them.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const CHECKER = path.join(process.cwd(), "scripts/preflight/mode-preflight.mjs");
let failures = 0;
const check = (ok, msg) => { console.log(`  ${ok ? "PASS" : "FAIL"}  ${msg}`); if (!ok) failures += 1; };

function run(mode, env) {
  const r = spawnSync(process.execPath, [CHECKER, `--mode=${mode}`, "--json"],
    { env: { PATH: process.env.PATH, ...env }, encoding: "utf8" });
  let parsed = null; try { parsed = JSON.parse(r.stdout)[0]; } catch {}
  return { code: r.status, out: r.stdout, err: r.stderr, parsed };
}
const varOf = (r, n) => r.parsed.variables.find((v) => v.name === n);
const relOf = (r, id) => r.parsed.relations.find((x) => x.id === id);

// Synthetic. The Hedera defaults mirror the runner's own constants so role
// relationships can be exercised without inventing accounts the runner rejects.
const S = {
  kvUrl: "https://synthetic.example.invalid", kvToken: "synthetic-token",
  secret: "synthetic-session-secret-value", shortSecret: "tooshort",
  approval: "synthetic-approval-secret", adminApproval: "synthetic-admin-approval",
  agentKey: "synthetic-agent-key-presence-only", agent: "0x" + "ab".repeat(20),
  badAgent: "not-an-address",
  guestA: "0.0.8504405", treasury: "0.0.8504300", guestB: "0.0.8504715",
  token: "0.0.8505698", guestAKey: "synthetic-guestA-key", treasuryKey: "synthetic-treasury-key",
};
const hederaBase = {
  HEDERA_DELEGATION_SERIAL: "12",
  HEDERA_RECOVERY_HOLDER_ID: S.guestA,
  HEDERA_RECOVERY_SPENDER_ID: S.treasury,
  HEDERA_GUEST_A_KEY: S.guestAKey,
  HEDERA_TREASURY_KEY: S.treasuryKey,
};

console.log("fixture-preview");
check(run("fixture-preview", {}).parsed?.configurationReady === true, "ready on an empty environment");

console.log("\nstateful-app");
{
  const ok = run("stateful-app", { KV_REST_API_URL: S.kvUrl, KV_REST_API_TOKEN: S.kvToken, AUTH_SESSION_SECRET: S.secret });
  check(ok.parsed.configurationReady === true, "ready with synthetic required values");
  const short = run("stateful-app", { KV_REST_API_URL: S.kvUrl, KV_REST_API_TOKEN: S.kvToken, AUTH_SESSION_SECRET: S.shortSecret });
  check(varOf(short, "AUTH_SESSION_SECRET").status === "INVALID" && !short.parsed.configurationReady,
    "short AUTH_SESSION_SECRET is INVALID and blocks");
  const off = run("stateful-app", { KV_REST_API_URL: S.kvUrl, KV_REST_API_TOKEN: S.kvToken, AUTH_SESSION_SECRET: S.secret, ENABLE_DEMO_LOGIN: "false" });
  check(varOf(off, "ENABLE_DEMO_LOGIN").blocks === true && !off.parsed.configurationReady,
    "ENABLE_DEMO_LOGIN=false blocks (demo login is disabled)");
}

console.log("\nworld split — server / target-state / signer");
{
  const srv = run("world-server", { BOOKED_RIGHTS_APPROVAL_SECRET: S.approval });
  check(srv.parsed.configurationReady === true, "world-server ready with the approval secret");
  check(run("world-server", {}).parsed.configurationReady === false, "world-server not ready without it");

  const tgtFlag = run("world-target-state", {});
  check(varOf(tgtFlag, "WORLD_RECOVERY_PROOF_SERIAL").status === "MISSING_OR_FLAG",
    "serial reported as satisfiable by --serial flag, not a hard MISSING");
  const tgtBadActor = run("world-target-state", { WORLD_RECOVERY_PROOF_SERIAL: "7", WORLD_RECOVERY_PROOF_ACTOR: "mallory" });
  check(varOf(tgtBadActor, "WORLD_RECOVERY_PROOF_ACTOR").blocks === true, "actor outside guestA/guestB blocks");
  const tgtRemote = run("world-target-state", { WORLD_RECOVERY_PROOF_SERIAL: "7", WORLD_RECOVERY_PROOF_ALLOW_REMOTE: "yes" });
  check(varOf(tgtRemote, "WORLD_RECOVERY_PROOF_ALLOW_REMOTE").blocks === true,
    "remote execution ack must match exactly (fail-closed)");
  check(tgtFlag.parsed.notChecked.some((b) => /holder|listing|slot/i.test(b)),
    "target-state mode declares slot/holder/listing as NOT_CHECKED");

  const signerMissing = run("world-signer", {});
  check(signerMissing.parsed.configurationReady === false, "world-signer not ready with nothing set");
  const signerAlt = run("world-signer", { WORLD_AGENT_PRIVATE_KEY: S.agentKey, BOOKED_RIGHTS_APPROVAL_SECRET: S.approval });
  check(varOf(signerAlt, "BOOKED_RIGHTS_APPROVAL_ADMIN_SECRET").status === "OK_VIA_ALTERNATIVE" && signerAlt.parsed.configurationReady,
    "approval secret satisfies the admin-secret requirement via the permitted alternative");
  const signerAdmin = run("world-signer", { WORLD_AGENT_PRIVATE_KEY: S.agentKey, BOOKED_RIGHTS_APPROVAL_ADMIN_SECRET: S.adminApproval });
  check(signerAdmin.parsed.configurationReady === true, "admin secret alone is sufficient");
  const badAddr = run("world-signer", { WORLD_AGENT_PRIVATE_KEY: S.agentKey, BOOKED_RIGHTS_APPROVAL_SECRET: S.approval, WORLD_AGENT_ADDRESS: S.badAgent });
  check(varOf(badAddr, "WORLD_AGENT_ADDRESS").status === "INVALID" && badAddr.parsed.configurationReady === false,
    "malformed WORLD_AGENT_ADDRESS BLOCKS (runner getAddress would reject) — parity fix");
  const absentAddr = run("world-signer", { WORLD_AGENT_PRIVATE_KEY: S.agentKey, BOOKED_RIGHTS_APPROVAL_SECRET: S.approval });
  check(absentAddr.parsed.configurationReady === true, "absent optional address is fine (runner has a default)");
}

console.log("\nledger-helper-config");
{
  const r = run("ledger-helper-config", {});
  check(r.parsed.configurationReady === true, "helper configuration ready with no variables");
  check(r.parsed.notChecked.some((b) => /device|USB|HID/i.test(b)), "declares device availability NOT_CHECKED");
  check(r.parsed.notChecked.some((b) => /#16|#42|hold/i.test(b)), "declares the dependency/device hold still in force");
  check(r.parsed.executionReady === null, "never asserts execution readiness");
}

console.log("\nhedera-testnet-recovery — parity with the live runner");
{
  const ok = run("hedera-testnet-recovery", hederaBase);
  check(ok.parsed.configurationReady === true, "ready with guest-A holder / treasury spender and both signer keys");

  const noGuestKey = run("hedera-testnet-recovery", { ...hederaBase, HEDERA_GUEST_A_KEY: "" });
  check(varOf(noGuestKey, "HEDERA_GUEST_A_KEY").blocks === true,
    "missing HEDERA_GUEST_A_KEY blocks — parity fix (signerMaterialFor needs it)");
  const noTreasuryKey = run("hedera-testnet-recovery", { ...hederaBase, HEDERA_TREASURY_KEY: "" });
  check(varOf(noTreasuryKey, "HEDERA_TREASURY_KEY").blocks === true, "missing HEDERA_TREASURY_KEY blocks");

  const same = run("hedera-testnet-recovery", { ...hederaBase, HEDERA_RECOVERY_SPENDER_ID: S.guestA });
  check(relOf(same, "holder-spender-distinct").status === "INVALID" && !same.parsed.configurationReady,
    "holder == spender blocks (usdc_recovery_holder_spender_must_differ)");

  const outside = run("hedera-testnet-recovery", { ...hederaBase, HEDERA_RECOVERY_HOLDER_ID: "0.0.5003", HEDERA_RECOVERY_SPENDER_ID: "0.0.5004" });
  check(relOf(outside, "roles-within-keyed-accounts").status === "INVALID" && !outside.parsed.configurationReady,
    "roles outside guest-A/treasury block (usdc_recovery_live_role_outside_existing_keyed_accounts) — parity fix");

  const mainnet = run("hedera-testnet-recovery", { ...hederaBase, HEDERA_NETWORK: "mainnet" });
  check(varOf(mainnet, "HEDERA_NETWORK").blocks === true, "mainnet blocks (usdc_recovery_live_refuses_non_testnet)");
  const netAbsent = run("hedera-testnet-recovery", hederaBase);
  check(varOf(netAbsent, "HEDERA_NETWORK").blocks === false, "absent HEDERA_NETWORK does not block (runner defaults to testnet)");

  const badSerial = run("hedera-testnet-recovery", { ...hederaBase, HEDERA_DELEGATION_SERIAL: "0" });
  check(varOf(badSerial, "HEDERA_DELEGATION_SERIAL").blocks === true, "non-positive serial blocks");
  const badToken = run("hedera-testnet-recovery", { ...hederaBase, BOOKED_RIGHTS_TOKEN_ID: "8505698" });
  check(varOf(badToken, "BOOKED_RIGHTS_TOKEN_ID").blocks === true, "malformed token id blocks even though optional");
}

console.log("\nno-value-disclosure");
{
  const all = [S.kvUrl, S.kvToken, S.secret, S.approval, S.adminApproval, S.agentKey, S.guestAKey, S.treasuryKey];
  const env = { KV_REST_API_URL: S.kvUrl, KV_REST_API_TOKEN: S.kvToken, AUTH_SESSION_SECRET: S.secret,
                BOOKED_RIGHTS_APPROVAL_SECRET: S.approval, BOOKED_RIGHTS_APPROVAL_ADMIN_SECRET: S.adminApproval,
                WORLD_AGENT_PRIVATE_KEY: S.agentKey, ...hederaBase };
  for (const fmt of [["--json"], []]) {
    const r = spawnSync(process.execPath, [CHECKER, ...fmt], { env: { PATH: process.env.PATH, ...env }, encoding: "utf8" });
    const blob = r.stdout + r.stderr;
    const leaked = all.filter((v) => blob.includes(v));
    check(leaked.length === 0, `no synthetic value in ${fmt.length ? "json" : "text"} output (${leaked.length} leak(s))`);
  }
}

console.log("\nmisc");
check(run("not-a-mode", {}).code === 2, "unknown mode exits 2");

console.log(`\nMODE PREFLIGHT PARITY TESTS: ${failures === 0 ? "PASS" : "FAIL"} (${failures} failure(s))`);
process.exit(failures === 0 ? 0 : 1);
