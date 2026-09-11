#!/usr/bin/env node
/**
 * Mode-specific readiness checker.
 *
 * Answers ONE question: for a chosen demo mode, is the required CONFIGURATION
 * present and well-formed? It reports variable NAMES and a status only.
 * It never prints values, signatures, secret-bearing URLs, headers, or an
 * environment dump.
 *
 * Configuration presence is NOT:
 *   - connection health (Redis/mirror/provider reachability)
 *   - initialized booking state (token minted, demo plan saved)
 *   - device availability (a Ledger plugged in and unlocked)
 *   - successful execution (a settled transaction)
 * Those boundaries are reported separately and never asserted here.
 *
 * Offline and non-mutating by default: it makes no network call, opens no
 * device, and reads no .env file. It inspects process.env only.
 *
 * This does NOT replace scripts/ethglobal-preflight.mjs (historic docs/continuity
 * gate) or scripts/submission-readiness.mjs (evidence-pack manifest gate).
 *
 * Usage:
 *   node scripts/preflight/mode-preflight.mjs                 # all modes
 *   node scripts/preflight/mode-preflight.mjs --mode=stateful-app
 *   node scripts/preflight/mode-preflight.mjs --json
 */

const HEDERA_ID = /^0\.0\.[1-9]\d*$/;
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

const present = (v) => typeof v === "string" && v.trim().length > 0;
const minLen = (n) => (v) => present(v) && v.trim().length >= n;
const matches = (re) => (v) => present(v) && re.test(v.trim());
const oneOf = (...allowed) => (v) => present(v) && allowed.includes(v.trim().toLowerCase());

/**
 * Each entry: { name, validate, why }
 * `why` explains the gate in code terms so a reviewer can verify the claim.
 */
const MODES = {
  "fixture-preview": {
    title: "Fixture preview (/product-preview)",
    required: [],
    optional: [],
    notes: [
      "Verified to serve with no environment, no Redis and no session.",
      "This mode is fixture product evidence; it is never live execution.",
    ],
    boundaries: [],
  },

  "stateful-app": {
    title: "Authenticated / stateful application",
    required: [
      { name: "KV_REST_API_URL", validate: present, why: "lib/store/redis.ts throws without it" },
      { name: "KV_REST_API_TOKEN", validate: present, why: "lib/store/redis.ts throws without it" },
      { name: "AUTH_SESSION_SECRET", validate: minLen(16),
        why: "lib/auth/session.ts requires >=16 chars when NODE_ENV=production; a production build (npm start) is production" },
    ],
    optional: [
      { name: "ENABLE_DEMO_LOGIN", validate: (v) => !present(v) || v !== "false",
        why: "lib/auth/demo-users.ts disables demo login only when exactly 'false'" },
      { name: "NEXT_PUBLIC_APP_URL", validate: present, why: "absolute links" },
    ],
    boundaries: [
      "Redis reachability and credential validity are NOT checked here.",
      "Whether the demo token/plan is initialized (/api/init) is NOT checked here.",
    ],
  },

  "world-signed-route": {
    title: "World signed-route execution",
    required: [
      { name: "BOOKED_RIGHTS_APPROVAL_SECRET", validate: present,
        why: "app/api/agent/confirm/route.ts refuses World-protected recovery without it" },
    ],
    optional: [
      { name: "BOOKED_RIGHTS_APPROVAL_ADMIN_SECRET", validate: present,
        why: "scripts/world-recovery-live-proof.mjs prefers it, falling back to the approval secret" },
      { name: "WORLD_AGENT_ADDRESS", validate: matches(EVM_ADDRESS),
        why: "scripts/world-recovery-live-proof.mjs; falls back to the built-in registered agent" },
    ],
    boundaries: [
      "AgentBook reachability and registration are NOT checked here.",
      "Possession of the registered agent key is NOT checked here.",
      "No World provider call is made by this checker.",
    ],
  },

  "ledger-device-ceremony": {
    title: "Ledger device ceremony",
    required: [],
    optional: [],
    notes: [
      "scripts/ledger-device-proof/ reads no environment variables.",
      "This mode is gated by physical device availability, not configuration.",
    ],
    boundaries: [
      "USB/HID transport, device unlock and app selection are NOT checked here.",
      "This checker never opens a device.",
    ],
  },

  "hedera-testnet-recovery": {
    title: "Hedera testnet recovery execution",
    required: [
      { name: "HEDERA_NETWORK", validate: oneOf("testnet"),
        why: "scripts/hedera-policy-usdc-recovery-live.mjs refuses any non-testnet network" },
      { name: "BOOKED_RIGHTS_TOKEN_ID", validate: matches(HEDERA_ID), why: "booking token" },
      { name: "HEDERA_TREASURY_ID", validate: matches(HEDERA_ID), why: "signer/payer role" },
      { name: "HEDERA_TREASURY_KEY", validate: present, why: "signer role (presence only; value never inspected)" },
      { name: "HEDERA_RECOVERY_HOLDER_ID", validate: matches(HEDERA_ID), why: "current holder role" },
      { name: "HEDERA_RECOVERY_SPENDER_ID", validate: matches(HEDERA_ID), why: "delegated spender role" },
      { name: "HEDERA_DELEGATION_SERIAL", validate: (v) => present(v) && /^[1-9]\d*$/.test(v.trim()),
        why: "live runner requires a preflighted serial" },
    ],
    optional: [
      { name: "HEDERA_GUEST_A_ID", validate: matches(HEDERA_ID), why: "demo persona" },
      { name: "HEDERA_GUEST_B_ID", validate: matches(HEDERA_ID), why: "demo persona" },
      { name: "HEDERA_USDC_TOKEN_ID", validate: matches(HEDERA_ID), why: "defaults to the pinned testnet USDC id" },
    ],
    boundaries: [
      "Account balances and USDC liquidity are NOT checked here.",
      "Token association and allowance state are NOT checked here.",
      "No transaction is built or submitted by this checker.",
    ],
  },
};

function evaluate(mode, env) {
  const spec = MODES[mode];
  const rows = [];
  for (const group of ["required", "optional"]) {
    for (const item of spec[group]) {
      const raw = env[item.name];
      const status = !present(raw) ? "MISSING" : item.validate(raw) ? "OK" : "INVALID";
      rows.push({ name: item.name, group, status, why: item.why });
    }
  }
  const blocking = rows.filter((r) => r.group === "required" && r.status !== "OK");
  return { mode, title: spec.title, rows, blocking, ready: blocking.length === 0, spec };
}

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const modeArg = args.find((a) => a.startsWith("--mode="))?.split("=")[1];
const selected = modeArg ? [modeArg] : Object.keys(MODES);

for (const m of selected) {
  if (!MODES[m]) {
    console.error(`Unknown mode: ${m}. Known: ${Object.keys(MODES).join(", ")}`);
    process.exit(2);
  }
}

const results = selected.map((m) => evaluate(m, process.env));

if (asJson) {
  // Names and statuses only — no values are ever serialised.
  console.log(JSON.stringify(results.map((r) => ({
    mode: r.mode, ready: r.ready,
    variables: r.rows.map(({ name, group, status }) => ({ name, group, status })),
    notCheckedBoundaries: r.spec.boundaries,
  })), null, 2));
} else {
  console.log("YourTurn mode-specific readiness checker");
  console.log("(configuration presence only — names and status, never values)\n");
  for (const r of results) {
    console.log(`${r.ready ? "READY    " : "NOT READY"}  ${r.mode} — ${r.title}`);
    for (const row of r.rows) {
      const mark = row.status === "OK" ? "ok     " : row.status === "MISSING" ? "MISSING" : "INVALID";
      console.log(`    ${mark}  ${row.group === "required" ? "[required]" : "[optional]"} ${row.name}`);
      if (row.status !== "OK" && row.group === "required") console.log(`             reason: ${row.why}`);
    }
    for (const n of r.spec.notes ?? []) console.log(`    note: ${n}`);
    for (const b of r.spec.boundaries) console.log(`    not checked: ${b}`);
    console.log("");
  }
  const notReady = results.filter((r) => !r.ready).map((r) => r.mode);
  console.log(notReady.length ? `not ready: ${notReady.join(", ")}` : "all selected modes are configuration-ready");
}

process.exit(results.every((r) => r.ready) ? 0 : 1);
