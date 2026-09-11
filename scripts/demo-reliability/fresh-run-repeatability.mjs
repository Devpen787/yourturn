/**
 * FRESH-RUN REPEATABILITY TEST
 *
 * Property under test: after a reset/bootstrap, a SECOND independently
 * authorized demonstration can proceed — WITHOUT deleting any consumed-replay
 * record and WITHOUT reusing any credential.
 *
 * Run 2 uses:
 *   - a fresh mandateId and a fresh signed-mandate nonce;
 *   - fresh requester and execution nonces;
 *   - the NEW booking serial that reset/bootstrap minted;
 *   - a currently valid holder (reset returns the booking to Maya).
 *
 * All run-1 consumed/replay evidence and monotonic authority versions are
 * RETAINED. No namespace is renamed and no key is deleted — a run label must
 * never make an old signature valid again.
 *
 * Finally it re-asserts that run 1's old credentials are STILL refused, so
 * repeatability has not been bought by weakening replay protection.
 *
 * EVIDENCE CLASS: FIXTURE / LOCAL. Substitutes are named in recovery-flow.mjs.
 */
process.env.DR_QUIET = process.env.DR_QUIET ?? "1";
import { createMemoryRedis, modelResetDemoBootstrap } from "./memory-redis.mjs";
import { runRecoveryCycle, freshSigner, seedAppState } from "./recovery-flow.mjs";

const nowS = BigInt(Math.floor(Date.parse("2026-09-11T12:00:00Z") / 1000));
const redis = createMemoryRedis();
const appState = seedAppState(7);

// A fresh ceremony means a fresh device-signed mandate. Each run signs its own.
const signer1 = freshSigner();
const signer2 = freshSigner();

const RUN1 = {
  mandateId: "demo-mandate-run1", mandateNonce: "mandate-nonce-run1",
  requesterNonce: "requester-nonce-run1", execNonce32: "exec-32-run1",
  execNonce45: "exec-45-run1", serial: appState.slots[0].serial,
};

console.log("run 1");
await runRecoveryCycle({ redis, appState, signer: signer1, identities: RUN1, tag: "run1", nowS });
const keysAfterRun1 = redis.keys("").length;
console.log(`  run 1 completed (${keysAfterRun1} state keys)\n`);

const reset = modelResetDemoBootstrap(redis, appState);
console.log("reset/bootstrap (models mintSlotNfts returning NEW serials)");
console.log(`  minted serials: ${reset.mintedSerials.join(",")}`);
console.log(`  retained authority/replay keys: ${reset.retainedAuthorityKeys.length} (nothing deleted)`);
const freshSerial = appState.slots[0].serial;
if (freshSerial === RUN1.serial) { console.log("  FAIL — bootstrap did not produce a new serial"); process.exit(1); }
console.log(`  booking serial ${RUN1.serial} -> ${freshSerial}, holder=${appState.slots[0].holder}\n`);

const RUN2 = {
  mandateId: "demo-mandate-run2", mandateNonce: "mandate-nonce-run2",
  requesterNonce: "requester-nonce-run2", execNonce32: "exec-32-run2",
  execNonce45: "exec-45-run2", serial: freshSerial,
};

console.log("run 2 — fresh credentials, fresh serial, retained replay history");
try {
  await runRecoveryCycle({ redis, appState, signer: signer2, identities: RUN2, tag: "run2", nowS });
} catch (e) {
  console.log(`  run 2 FAILED: ${e.message}`);
  console.log("\nFRESH-RUN REPEATABILITY: FAIL");
  process.exit(1);
}
console.log("  run 2 completed\n");

// Repeatability must not have weakened replay protection.
console.log("re-assert: run 1 credentials must STILL be refused");
let stillRefused = false, detail = "";
try {
  await runRecoveryCycle({ redis, appState, signer: signer1, identities: RUN1, tag: "replay", nowS });
} catch (e) { stillRefused = true; detail = e.message; }
if (!stillRefused) {
  console.log("  run 1 credentials were ACCEPTED again");
  console.log("\nFRESH-RUN REPEATABILITY: FAIL — repeatability weakened replay protection");
  process.exit(1);
}
console.log(`  still refused: ${detail}`);

// And run 1's consumed evidence must still exist.
const consumed = redis.keys("bookedrights:ledger:mandate-consumed:");
if (consumed.length < 2) { console.log(`\nFAIL — expected retained consumed digests, found ${consumed.length}`); process.exit(1); }
console.log(`  retained consumed digests: ${consumed.length}`);

console.log("\nFRESH-RUN REPEATABILITY: PASS");
console.log("  a second independently authorized run proceeds with zero replay-key deletion");
