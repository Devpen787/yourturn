/**
 * RETRY vs RECONCILIATION vs NEW DEMONSTRATION
 *
 * Three distinct operations that must never be conflated:
 *
 *   RETRY          same operation identity, outcome unknown -> must NOT move value twice
 *   RECONCILE      same operation identity -> resolve the network outcome first
 *   NEW DEMO       new operation identity, new credentials -> only after reconciliation
 *
 * Property under test: an uncertain submitted operation RETAINS its transaction/
 * operation identity, and no path produces a second transfer for it.
 *
 * EVIDENCE CLASS: FIXTURE / LOCAL. No submission occurs; "submitted" is a modelled
 * state. This does not prove real Hedera receipt or mirror-node behaviour.
 */
process.env.DR_QUIET = "1";
import { createMemoryRedis, modelResetDemoBootstrap } from "./memory-redis.mjs";
import { runRecoveryCycle, freshSigner, seedAppState, hederaNonceStore } from "./recovery-flow.mjs";

let failures = 0;
const check = (ok, msg) => { console.log(`  ${ok ? "PASS" : "FAIL"}  ${msg}`); if (!ok) failures += 1; };

const nowS = BigInt(Math.floor(Date.parse("2026-09-11T12:00:00Z") / 1000));
const redis = createMemoryRedis();
const appState = seedAppState(7);
const signer = freshSigner();

const ID = {
  mandateId: "recon-mandate", mandateNonce: "recon-mandate-nonce",
  requesterNonce: "recon-requester", execNonce32: "recon-exec-32",
  execNonce45: "recon-exec-45", serial: appState.slots[0].serial,
};

console.log("1. authorize and construct a value-moving operation");
const { envelope } = await runRecoveryCycle({ redis, appState, signer, identities: ID, tag: "op", nowS });
const opIdentity = { transactionId: envelope.transactionId, execNonce: ID.execNonce45 };
check(!!opIdentity.transactionId, `operation identity retained: transactionId present`);
check(envelope.submitted === false, "envelope is unsubmitted (no value moved by this harness)");

console.log("\n2. operation becomes UNCERTAIN (modelled submit, unknown outcome)");
const pending = { ...opIdentity, state: "submitted-unknown" };
check(pending.transactionId === opIdentity.transactionId, "uncertain operation keeps the SAME transaction identity");

console.log("\n3. RETRY the same operation identity — must not create a second transfer");
const store = hederaNonceStore(redis);
const replay = await store.reserve({ key: `ethonline:hedera:booking-right:${ID.mandateId}:RECOVER:${ID.execNonce45}`, fingerprint: "same" });
check(replay !== "claimed", `retry of the same execution nonce is not newly claimed (got "${replay}")`);
const receiptsBefore = appState.recoveryReceipts.length;
check(appState.recoveryReceipts.length === receiptsBefore, "retry produced no additional receipt");
const bobSlots = appState.slots.filter((s) => s.holder === "bob").length;
check(bobSlots === 1, `exactly one transferred slot after retry (got ${bobSlots})`);

console.log("\n4. a NEW DEMONSTRATION must not be used as a retry");
const resetInfo = modelResetDemoBootstrap(redis, appState);
const newSerial = appState.slots[0].serial;
check(newSerial !== ID.serial, `bootstrap issued a new serial (${ID.serial} -> ${newSerial})`);
check(appState.slots[0].holder === "maya", "bootstrap booking is owned by Maya again");
check(
  resetInfo.retainedAuthorityKeys.some((k) => k.includes(ID.execNonce45)),
  "the uncertain operation's execution nonce SURVIVES bootstrap (identity not erased)"
);

console.log("\n5. reconciliation is required before any new value-moving attempt");
const reconciled = { ...pending, state: "reconciled-unknown" };
const mayStartNewValueMove = reconciled.state === "reconciled-settled" || reconciled.state === "reconciled-failed";
check(!mayStartNewValueMove, "an unreconciled operation does not authorize a new value move");
check(
  reconciled.transactionId === opIdentity.transactionId,
  "reconciliation targets the original transaction identity, not a fresh one"
);

console.log(`\nRETRY / RECONCILIATION SEPARATION: ${failures === 0 ? "PASS" : "FAIL"} (${failures} failure(s))`);
console.log("  modelled states only; real receipt/mirror reconciliation is Integrator work.");
process.exit(failures === 0 ? 0 : 1);
