#!/usr/bin/env node
/**
 * Mode-specific CONFIGURATION readiness checker.
 *
 * Answers exactly one question per mode: is the configuration this command
 * actually consumes present and well-formed? It reports variable NAMES and a
 * status only — never values, signatures, secret-bearing URLs or headers, and
 * it never dumps the environment.
 *
 * CONFIGURATION_READY is NOT execution-ready. Each mode lists its own
 * NOT_CHECKED boundaries: connection health, initialized booking/target state,
 * key possession, device availability and successful execution are all out of
 * scope here and are never asserted.
 *
 * Offline and non-mutating: no network call, no device open, no live runner
 * invocation, and no .env file is read. `process.env` only.
 *
 * Does NOT replace scripts/ethglobal-preflight.mjs (historic docs/continuity
 * gate) or scripts/submission-readiness.mjs (evidence-pack manifest gate).
 *
 * Usage:
 *   node scripts/preflight/mode-preflight.mjs
 *   node scripts/preflight/mode-preflight.mjs --mode=hedera-testnet-recovery
 *   node scripts/preflight/mode-preflight.mjs --json
 */

const HEDERA_ID = /^0\.0\.[1-9]\d*$/;
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const REMOTE_ACK = "NON_PRODUCTION_PREVIEW_ONLY";

const present = (v) => typeof v === "string" && v.trim().length > 0;
const minLen = (n) => (v) => present(v) && v.trim().length >= n;
const matches = (re) => (v) => present(v) && re.test(v.trim());
const positiveInt = (v) => present(v) && /^[1-9]\d*$/.test(v.trim()) && Number.isSafeInteger(Number(v.trim()));
const equals = (x) => (v) => present(v) && v.trim() === x;
const oneOfCI = (...a) => (v) => present(v) && a.includes(v.trim().toLowerCase());

/**
 * `blockingWhenInvalid` marks inputs the real command consumes and rejects.
 * An optional input that is ABSENT is fine; the same input SUPPLIED-BUT-INVALID
 * blocks, because the runner would reject it (e.g. getAddress on a malformed
 * WORLD_AGENT_ADDRESS, or a non-testnet HEDERA_NETWORK).
 */
const MODES = {
  "fixture-preview": {
    title: "Fixture preview (/product-preview)",
    command: "npm run build && npm start, then open /product-preview",
    required: [], optional: [],
    notes: ["Serves with no environment, no Redis and no session.",
            "Fixture product evidence; never live execution."],
    notChecked: [],
  },

  "stateful-app": {
    title: "Authenticated / stateful application",
    command: "npm start, then /api/auth/demo-login and /api/init",
    required: [
      { name: "KV_REST_API_URL", validate: present, why: "lib/store/redis.ts throws without it" },
      { name: "KV_REST_API_TOKEN", validate: present, why: "lib/store/redis.ts throws without it" },
      { name: "AUTH_SESSION_SECRET", validate: minLen(16),
        why: "lib/auth/session.ts requires >=16 chars when NODE_ENV=production; npm start is production" },
    ],
    optional: [
      { name: "ENABLE_DEMO_LOGIN", validate: (v) => !present(v) || v.trim() !== "false",
        blockingWhenInvalid: true, why: "lib/auth/demo-users.ts disables demo login when exactly 'false'" },
      { name: "NEXT_PUBLIC_APP_URL", validate: present, why: "absolute links" },
    ],
    notChecked: [
      "Redis reachability and credential validity.",
      "Whether the demo token/plan is initialized (/api/init).",
    ],
  },

  // --- World is split into three: server config, target state, local signer ---
  "world-server": {
    title: "World signed-route — server configuration",
    command: "the running YourTurn server that /api/agent/confirm is served from",
    required: [
      { name: "BOOKED_RIGHTS_APPROVAL_SECRET", validate: present,
        why: "app/api/agent/confirm/route.ts refuses World-protected recovery without it" },
    ],
    optional: [],
    notes: ["Composes with stateful-app: the server also needs that mode's configuration."],
    notChecked: [
      "That the server is actually running and reachable.",
      "AgentBook reachability and agent registration.",
    ],
  },

  "world-target-state": {
    title: "World signed-route — target state inputs",
    command: "node scripts/world-recovery-live-proof.mjs --serial=<n> [--actor=guestA|guestB]",
    required: [
      { name: "WORLD_RECOVERY_PROOF_SERIAL", validate: positiveInt,
        why: "runner requires a positive serial (--serial flag may supply it instead)",
        satisfiedByFlag: "--serial" },
    ],
    optional: [
      { name: "WORLD_RECOVERY_PROOF_ACTOR", validate: oneOfCI("guesta", "guestb"),
        blockingWhenInvalid: true, why: "runner accepts only guestA or guestB" },
      { name: "YOURTURN_BASE_URL", validate: present, why: "defaults to http://localhost:3000" },
      { name: "WORLD_RECOVERY_PROOF_ALLOW_REMOTE", validate: equals(REMOTE_ACK),
        blockingWhenInvalid: true,
        why: `remote execution is fail-closed unless exactly ${REMOTE_ACK}` },
      { name: "WORLD_RECOVERY_PROOF_ASK_HBAR", validate: (v) => !present(v) || Number(v) > 0,
        blockingWhenInvalid: true, why: "runner requires a positive ask" },
    ],
    notes: ["The runner performs a NON-SECRET target-state preflight (/api/agent/read) BEFORE loading any key.",
            "That ordering must be preserved; this checker does not perform it."],
    notChecked: [
      "Slot status, resale policy, current holder and absence of an active listing.",
      "That the target server is initialized. This checker makes no network call.",
    ],
  },

  "world-signer": {
    title: "World signed-route — local signer readiness",
    command: "same runner, after the non-secret target-state preflight succeeds",
    required: [
      { name: "WORLD_AGENT_PRIVATE_KEY", validate: present,
        why: "runner loads it AFTER the target-state preflight (presence only; never inspected)" },
      { name: "BOOKED_RIGHTS_APPROVAL_ADMIN_SECRET", validate: present,
        why: "runner accepts this OR BOOKED_RIGHTS_APPROVAL_SECRET",
        alternative: "BOOKED_RIGHTS_APPROVAL_SECRET" },
    ],
    optional: [
      { name: "WORLD_AGENT_ADDRESS", validate: matches(EVM_ADDRESS), blockingWhenInvalid: true,
        why: "runner calls getAddress(); malformed input is rejected. Absent falls back to the registered agent" },
    ],
    notChecked: [
      "That the private key resolves to the registered delegated agent (the runner checks this at execution).",
      "Key possession is asserted only as presence; no key material is read or validated here.",
    ],
  },

  "ledger-helper-config": {
    title: "Ledger device ceremony — helper configuration only",
    command: "scripts/ledger-device-proof/ (separate CLI package)",
    required: [], optional: [],
    notes: ["scripts/ledger-device-proof/ reads no environment variables.",
            "This mode reports helper CONFIGURATION only. It cannot establish ceremony readiness."],
    notChecked: [
      "USB/HID transport, device unlock and app selection. This checker never opens a device.",
      "Server-side prepare/activate readiness for a ceremony.",
      "The separate dependency/device hold tracked in #16 / PR #42 remains in force and is not overridden here.",
    ],
  },

  "hedera-testnet-recovery": {
    title: "Hedera testnet recovery execution",
    command: "node scripts/hedera-policy-usdc-recovery-live.mjs",
    required: [
      { name: "HEDERA_DELEGATION_SERIAL", validate: positiveInt,
        why: "runner throws usdc_recovery_live_requires_preflight_serial" },
      { name: "HEDERA_RECOVERY_HOLDER_ID", validate: matches(HEDERA_ID), why: "holder role" },
      { name: "HEDERA_RECOVERY_SPENDER_ID", validate: matches(HEDERA_ID), why: "delegated spender role" },
      { name: "HEDERA_GUEST_A_KEY", validate: present,
        why: "signerMaterialFor() resolves guest-A signing material (presence only)" },
      { name: "HEDERA_TREASURY_KEY", validate: present,
        why: "signerMaterialFor() resolves treasury signing material (presence only)" },
    ],
    optional: [
      { name: "HEDERA_NETWORK", validate: oneOfCI("testnet"), blockingWhenInvalid: true,
        why: "runner throws usdc_recovery_live_refuses_non_testnet; defaults to testnet when absent" },
      { name: "HEDERA_GUEST_A_ID", validate: matches(HEDERA_ID), blockingWhenInvalid: true, why: "defaults to the runner's guest-A" },
      { name: "HEDERA_TREASURY_ID", validate: matches(HEDERA_ID), blockingWhenInvalid: true, why: "defaults to the runner's treasury" },
      { name: "HEDERA_GUEST_B_ID", validate: matches(HEDERA_ID), blockingWhenInvalid: true, why: "receiver; defaults to the runner's guest-B" },
      { name: "BOOKED_RIGHTS_TOKEN_ID", validate: matches(HEDERA_ID), blockingWhenInvalid: true, why: "booking token; has a runner default" },
    ],
    // Role relationships the runner enforces before any network call.
    relations: [
      {
        id: "holder-spender-distinct",
        why: "runner throws usdc_recovery_holder_spender_must_differ",
        check: (env) => {
          const h = env.HEDERA_RECOVERY_HOLDER_ID?.trim();
          const s = env.HEDERA_RECOVERY_SPENDER_ID?.trim();
          if (!h || !s) return "SKIPPED";
          return h === s ? "INVALID" : "OK";
        },
      },
      {
        id: "roles-within-keyed-accounts",
        why: "runner throws usdc_recovery_live_role_outside_existing_keyed_accounts; holder and spender must each be guest-A or treasury",
        check: (env) => {
          const h = env.HEDERA_RECOVERY_HOLDER_ID?.trim();
          const s = env.HEDERA_RECOVERY_SPENDER_ID?.trim();
          if (!h || !s) return "SKIPPED";
          const guestA = env.HEDERA_GUEST_A_ID?.trim() || "0.0.8504405";
          const treasury = env.HEDERA_TREASURY_ID?.trim() || "0.0.8504300";
          const keyed = [guestA, treasury];
          return keyed.includes(h) && keyed.includes(s) ? "OK" : "INVALID";
        },
      },
    ],
    notChecked: [
      "Account balances and USDC liquidity.",
      "Token association and allowance state.",
      "Mirror-node reachability. No transaction is built or submitted here.",
    ],
  },
};

function evaluate(mode, env) {
  const spec = MODES[mode];
  const rows = [];
  for (const group of ["required", "optional"]) {
    for (const item of spec[group] ?? []) {
      const raw = env[item.name];
      const altRaw = item.alternative ? env[item.alternative] : undefined;
      let status;
      if (!present(raw)) {
        status = present(altRaw) ? "OK_VIA_ALTERNATIVE"
               : item.satisfiedByFlag ? "MISSING_OR_FLAG"
               : "MISSING";
      } else {
        status = item.validate(raw) ? "OK" : "INVALID";
      }
      const blocks =
        (group === "required" && !["OK", "OK_VIA_ALTERNATIVE", "MISSING_OR_FLAG"].includes(status)) ||
        (status === "INVALID" && item.blockingWhenInvalid === true);
      rows.push({ name: item.name, group, status, blocks, why: item.why,
                  ...(item.alternative ? { alternative: item.alternative } : {}),
                  ...(item.satisfiedByFlag ? { satisfiedByFlag: item.satisfiedByFlag } : {}) });
    }
  }
  const relations = (spec.relations ?? []).map((r) => {
    const status = r.check(env);
    return { id: r.id, status, blocks: status === "INVALID", why: r.why };
  });
  const blocking = [...rows, ...relations].filter((x) => x.blocks);
  return { mode, title: spec.title, command: spec.command, rows, relations, blocking,
           configurationReady: blocking.length === 0, spec };
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
  console.log(JSON.stringify(results.map((r) => ({
    mode: r.mode,
    configurationReady: r.configurationReady,
    executionReady: null, // never asserted by this checker
    variables: r.rows.map(({ name, group, status, blocks }) => ({ name, group, status, blocks })),
    relations: r.relations.map(({ id, status, blocks }) => ({ id, status, blocks })),
    notChecked: r.spec.notChecked,
  })), null, 2));
} else {
  console.log("YourTurn mode-specific CONFIGURATION readiness");
  console.log("(names and status only — never values; configuration-ready is not execution-ready)\n");
  for (const r of results) {
    console.log(`${r.configurationReady ? "CONFIGURATION_READY" : "NOT_READY          "}  ${r.mode}`);
    console.log(`    ${r.title}`);
    console.log(`    command: ${r.command}`);
    for (const row of r.rows) {
      const mark = row.status === "OK" || row.status === "OK_VIA_ALTERNATIVE" ? "ok     "
                 : row.status === "MISSING_OR_FLAG" ? "flag?  "
                 : row.status === "INVALID" ? "INVALID" : "MISSING";
      const tag = row.group === "required" ? "[required]" : "[optional]";
      console.log(`    ${mark}  ${tag} ${row.name}${row.blocks ? "  <-- BLOCKS" : ""}`);
      if (row.blocks) console.log(`             reason: ${row.why}`);
    }
    for (const rel of r.relations) {
      const mark = rel.status === "OK" ? "ok     " : rel.status === "SKIPPED" ? "skipped" : "INVALID";
      console.log(`    ${mark}  [relation] ${rel.id}${rel.blocks ? "  <-- BLOCKS" : ""}`);
      if (rel.blocks) console.log(`             reason: ${rel.why}`);
    }
    for (const n of r.spec.notes ?? []) console.log(`    note: ${n}`);
    for (const b of r.spec.notChecked) console.log(`    NOT_CHECKED: ${b}`);
    console.log("");
  }
  const notReady = results.filter((r) => !r.configurationReady).map((r) => r.mode);
  console.log(notReady.length ? `not configuration-ready: ${notReady.join(", ")}`
                              : "all selected modes are CONFIGURATION_READY (execution readiness is NOT asserted)");
}
process.exit(results.every((r) => r.configurationReady) ? 0 : 1);
