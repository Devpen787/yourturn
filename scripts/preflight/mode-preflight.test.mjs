/**
 * Positive/negative tests for the mode preflight checker.
 * All environment values here are SYNTHETIC. No real configuration is read:
 * the checker is spawned with an explicitly constructed env, never the ambient one.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const CHECKER = path.join(process.cwd(), "scripts/preflight/mode-preflight.mjs");
let failures = 0;
const check = (ok, msg) => { console.log(`  ${ok ? "PASS" : "FAIL"}  ${msg}`); if (!ok) failures += 1; };

function run(mode, env) {
  const r = spawnSync(process.execPath, [CHECKER, `--mode=${mode}`, "--json"], {
    env: { PATH: process.env.PATH, ...env }, encoding: "utf8",
  });
  let parsed = null;
  try { parsed = JSON.parse(r.stdout)[0]; } catch { /* leave null */ }
  return { code: r.status, out: r.stdout, err: r.stderr, parsed };
}

const SYNTH = {
  kvUrl: "https://synthetic.example.invalid",
  kvToken: "synthetic-token-value",
  sessionSecret: "synthetic-session-secret-value",
  shortSecret: "tooshort",
  approval: "synthetic-approval-secret",
  agent: "0x" + "ab".repeat(20),
  badAgent: "not-an-address",
  tokenId: "0.0.5001",
  badTokenId: "5001",
};

console.log("fixture-preview");
{
  const r = run("fixture-preview", {});
  check(r.code === 0 && r.parsed?.ready === true, "ready with a completely empty environment");
}

console.log("\nstateful-app");
{
  const miss = run("stateful-app", {});
  check(miss.code === 1 && miss.parsed?.ready === false, "not ready with nothing set");
  const names = miss.parsed.variables.filter(v => v.group === "required" && v.status === "MISSING").map(v => v.name);
  check(names.length === 3, `3 required variables reported missing (${names.length})`);

  const full = run("stateful-app", {
    KV_REST_API_URL: SYNTH.kvUrl, KV_REST_API_TOKEN: SYNTH.kvToken, AUTH_SESSION_SECRET: SYNTH.sessionSecret,
  });
  check(full.code === 0 && full.parsed?.ready === true, "ready with synthetic required values");

  const short = run("stateful-app", {
    KV_REST_API_URL: SYNTH.kvUrl, KV_REST_API_TOKEN: SYNTH.kvToken, AUTH_SESSION_SECRET: SYNTH.shortSecret,
  });
  const secretRow = short.parsed.variables.find(v => v.name === "AUTH_SESSION_SECRET");
  check(short.code === 1 && secretRow.status === "INVALID", "short AUTH_SESSION_SECRET reported INVALID, not MISSING");

  const disabled = run("stateful-app", {
    KV_REST_API_URL: SYNTH.kvUrl, KV_REST_API_TOKEN: SYNTH.kvToken,
    AUTH_SESSION_SECRET: SYNTH.sessionSecret, ENABLE_DEMO_LOGIN: "false",
  });
  const demoRow = disabled.parsed.variables.find(v => v.name === "ENABLE_DEMO_LOGIN");
  check(demoRow.status === "INVALID", "ENABLE_DEMO_LOGIN=false flagged INVALID for a demo run");
  check(disabled.parsed.ready === true, "...but it is optional, so the mode stays ready");
}

console.log("\nworld-signed-route");
{
  const miss = run("world-signed-route", {});
  check(miss.parsed?.ready === false, "not ready without the approval secret");
  const ok = run("world-signed-route", { BOOKED_RIGHTS_APPROVAL_SECRET: SYNTH.approval });
  check(ok.parsed?.ready === true, "ready with the approval secret present");
  const bad = run("world-signed-route", { BOOKED_RIGHTS_APPROVAL_SECRET: SYNTH.approval, WORLD_AGENT_ADDRESS: SYNTH.badAgent });
  const agentRow = bad.parsed.variables.find(v => v.name === "WORLD_AGENT_ADDRESS");
  check(agentRow.status === "INVALID", "malformed WORLD_AGENT_ADDRESS reported INVALID");
}

console.log("\nledger-device-ceremony");
{
  const r = run("ledger-device-ceremony", {});
  check(r.code === 0 && r.parsed?.ready === true, "configuration-ready with no variables (device is the real gate)");
  check(r.parsed.notCheckedBoundaries.some(b => /device/i.test(b)), "explicitly states device availability is not checked");
}

console.log("\nhedera-testnet-recovery");
{
  const base = {
    HEDERA_NETWORK: "testnet", BOOKED_RIGHTS_TOKEN_ID: SYNTH.tokenId,
    HEDERA_TREASURY_ID: "0.0.5002", HEDERA_TREASURY_KEY: "synthetic-key-presence-only",
    HEDERA_RECOVERY_HOLDER_ID: "0.0.5003", HEDERA_RECOVERY_SPENDER_ID: "0.0.5004",
    HEDERA_DELEGATION_SERIAL: "12",
  };
  const ok = run("hedera-testnet-recovery", base);
  check(ok.code === 0 && ok.parsed?.ready === true, "ready with a full synthetic testnet role set");

  const mainnet = run("hedera-testnet-recovery", { ...base, HEDERA_NETWORK: "mainnet" });
  const netRow = mainnet.parsed.variables.find(v => v.name === "HEDERA_NETWORK");
  check(mainnet.code === 1 && netRow.status === "INVALID", "mainnet rejected as INVALID");

  const badId = run("hedera-testnet-recovery", { ...base, BOOKED_RIGHTS_TOKEN_ID: SYNTH.badTokenId });
  const idRow = badId.parsed.variables.find(v => v.name === "BOOKED_RIGHTS_TOKEN_ID");
  check(idRow.status === "INVALID", "malformed Hedera id reported INVALID");
}

console.log("\nno-value-disclosure");
{
  const r = run("stateful-app", {
    KV_REST_API_URL: SYNTH.kvUrl, KV_REST_API_TOKEN: SYNTH.kvToken, AUTH_SESSION_SECRET: SYNTH.sessionSecret,
  });
  const blob = r.out + r.err;
  const leaked = [SYNTH.kvUrl, SYNTH.kvToken, SYNTH.sessionSecret].filter(v => blob.includes(v));
  check(leaked.length === 0, `no synthetic value appears in output (${leaked.length} leak(s))`);
  const textual = spawnSync(process.execPath, [CHECKER, "--mode=stateful-app"], {
    env: { PATH: process.env.PATH, KV_REST_API_URL: SYNTH.kvUrl, KV_REST_API_TOKEN: SYNTH.kvToken, AUTH_SESSION_SECRET: SYNTH.sessionSecret },
    encoding: "utf8",
  });
  const leaked2 = [SYNTH.kvUrl, SYNTH.kvToken, SYNTH.sessionSecret].filter(v => (textual.stdout + textual.stderr).includes(v));
  check(leaked2.length === 0, "no synthetic value appears in human-readable output either");
}

console.log("\nunknown mode");
{
  const r = run("not-a-mode", {});
  check(r.code === 2, "unknown mode exits 2 with a usage error");
}

console.log(`\nMODE PREFLIGHT TESTS: ${failures === 0 ? "PASS" : "FAIL"} (${failures} failure(s))`);
process.exit(failures === 0 ? 0 : 1);
