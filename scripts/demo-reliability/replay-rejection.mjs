/**
 * REPLAY-REJECTION TEST  (supersedes the mislabelled "two-run-acceptance")
 *
 * Property under test: fixed credentials are NOT reusable.
 * Replaying the same mandateId / signed-mandate nonce / requester nonce /
 * execution nonce / booking serial after a reset MUST be refused, or return a
 * previously recorded result WITHOUT a second mutation.
 *
 * Rejection is SUCCESS here. Exit 0 = the security property holds.
 *
 * This test does NOT show that a fresh demo run is impossible — see
 * fresh-run-repeatability.mjs. It must never be used to justify deleting
 * consumed-replay records.
 *
 * EVIDENCE CLASS: FIXTURE / LOCAL. See recovery-flow.mjs for named substitutes.
 */
process.env.DR_QUIET = process.env.DR_QUIET ?? "1";
import { createMemoryRedis, modelResetDemoBootstrap } from "./memory-redis.mjs";
import { runRecoveryCycle, freshSigner, seedAppState } from "./recovery-flow.mjs";

const nowS = BigInt(Math.floor(Date.parse("2026-09-11T12:00:00Z") / 1000));
const redis = createMemoryRedis();
const signer = freshSigner();
const appState = seedAppState(7);

const FIXED = {
  mandateId: "demo-friday-yoga-mandate",
  mandateNonce: "demo-mandate-nonce",
  requesterNonce: "demo-requester-nonce",
  execNonce32: "demo-exec-32",
  execNonce45: "demo-exec-45",
  serial: 7,
};

console.log("run 1 — fixed staged credentials");
await runRecoveryCycle({ redis, appState, signer, identities: FIXED, tag: "run1", nowS });
console.log("  run 1 completed\n");

const reset = modelResetDemoBootstrap(redis, appState);
console.log(`reset/bootstrap — reminted serials ${reset.mintedSerials.join(",")}`);
console.log(`  authority/replay keys retained by design: ${reset.retainedAuthorityKeys.length}`);
const receiptsAfterReset = appState.recoveryReceipts.length;
console.log(`  receipts after reset: ${receiptsAfterReset}\n`);

console.log("run 2 — REPLAY of the identical credentials (must be refused)");
let refused = false, detail = "";
try {
  await runRecoveryCycle({ redis, appState, signer, identities: FIXED, tag: "run2", nowS });
} catch (e) { refused = true; detail = e.message; }

if (!refused) {
  console.log("  REPLAY ACCEPTED — credential reuse was permitted");
  console.log("\nREPLAY-REJECTION: FAIL");
  process.exit(1);
}
console.log(`  refused: ${detail}`);

// The refusal must not have produced any value-moving mutation.
// Reset legitimately clears receipts, so the baseline after reset is 0.
if (appState.recoveryReceipts.length !== receiptsAfterReset) {
  console.log(`\nREPLAY-REJECTION: FAIL — receipts moved ${receiptsAfterReset} -> ${appState.recoveryReceipts.length}; the refused replay still mutated value`);
  process.exit(1);
}
const stillBob = appState.slots.filter((s) => s.holder === "bob").length;
if (stillBob !== 0) {
  console.log(`\nREPLAY-REJECTION: FAIL — refused replay left ${stillBob} slot(s) transferred`);
  process.exit(1);
}
console.log(`  no new receipt (${receiptsAfterReset} -> ${appState.recoveryReceipts.length}) and no holder change`);
console.log("\nREPLAY-REJECTION: PASS (fixed credentials are not reusable)");
