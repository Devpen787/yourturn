import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bookingPortSource = await readFile("lib/adapters/booking-port.ts", "utf8");
const consensusSource = await readFile("lib/hedera/consensus.ts", "utf8");
const confirmRouteSource = await readFile("app/api/agent/confirm/route.ts", "utf8");
const gateSource = await readFile("lib/world-agentkit/recovery-write-gate.ts", "utf8");
const verifierSource = await readFile("lib/world-agentkit/server-verifier.ts", "utf8");

function between(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert.ok(start >= 0, `missing start marker: ${startNeedle}`);
  assert.ok(end > start, `missing end marker: ${endNeedle}`);
  return source.slice(start, end);
}

const createListing = between(
  bookingPortSource,
  "async function executeCreateListing",
  "async function prepareBuyListing"
);
const cancelRelease = between(
  bookingPortSource,
  "async function executeCancelRelease",
  "function buildPreview"
);

const addListingIndex = createListing.indexOf("await addListing(listing)");
const slotFlagIndex = createListing.indexOf("await updateSlotListingActive(prepared.serial, true)");
const listingHcsIndex = createListing.indexOf("await submitLifecycleEvent(prepared.topicId");
assert.ok(addListingIndex >= 0, "create-listing path must persist the listing");
assert.ok(slotFlagIndex > addListingIndex, "slot listing flag must follow listing persistence");
assert.ok(listingHcsIndex > slotFlagIndex, "reproducer expects HCS submission after both local mutations");
assert.ok(!createListing.slice(0, listingHcsIndex).includes("try {"), "unexpected create-listing transaction wrapper appeared before HCS");
assert.ok(!createListing.slice(listingHcsIndex).includes("deactivateListing"), "unexpected listing rollback appeared after HCS call");
assert.ok(!createListing.slice(listingHcsIndex).includes("updateSlotListingActive(prepared.serial, false)"), "unexpected slot-flag rollback appeared after HCS call");

const transferIndex = cancelRelease.indexOf("await refundAndTransferNftFromHolderToTreasury");
const burnIndex = cancelRelease.indexOf("await burnUsedSlot");
const cancelHcsIndex = cancelRelease.indexOf("await submitLifecycleEvent(prepared.topicId");
assert.ok(transferIndex >= 0, "cancel-release path must perform the refund/NFT transfer");
assert.ok(burnIndex > transferIndex, "burn must occur after the refund/NFT transfer");
assert.ok(cancelHcsIndex > burnIndex, "HCS audit must occur after transfer and burn in current implementation");
assert.ok(!cancelRelease.includes("try {"), "unexpected cancel-release transaction/compensation wrapper appeared");

// Both paths are inside the World-protected recovery boundary.
assert.match(gateSource, /action === "create_listing" \|\| action === "cancel_release"/);

// Prove that the final audit boundary is a real credential-bearing Hedera HCS
// submit, not a log-only helper.
assert.match(consensusSource, /new TopicMessageSubmitTransaction\(\)/);
assert.match(consensusSource, /await tx\.sign\(issuer\.privateKey\)/);
assert.match(consensusSource, /await signed\.execute\(client\)/);
assert.match(consensusSource, /await response\.getReceipt\(client\)/);

// The World gate consumes replay before either booking-port mutation executes.
const authorizeIndex = confirmRouteSource.indexOf("await authorizeWorldRecoveryWrite");
assert.ok(authorizeIndex >= 0, "World authorization call missing");
assert.ok(authorizeIndex < confirmRouteSource.indexOf("await bookingPort.confirmCreateListing"));
assert.ok(authorizeIndex < confirmRouteSource.indexOf("await bookingPort.confirmCancelRelease"));
const consumeIndex = verifierSource.indexOf("await nonceStore.consume(nonceKey)");
const allowedReturnIndex = verifierSource.lastIndexOf("verification,");
assert.ok(consumeIndex >= 0, "World verifier must contain nonce consumption");
assert.ok(allowedReturnIndex > consumeIndex, "nonce must be consumed before the allowed result is returned");

// Fault injection 1: create_listing commits local listing state, then the signed
// HCS audit fails. The API rejects, but local state survives with no HCS receipt.
const listingState = { listing: null, listingActive: false };
async function executeObservedCreateListing({ addListing, updateSlotListingActive, submitLifecycleEvent }) {
  const listing = { serial: 213, active: true };
  await addListing(listing);
  await updateSlotListingActive(213, true);
  const auditTxId = await submitLifecycleEvent("0.0.123", { eventType: "LISTED", serial: 213 });
  return { listing, auditTxId };
}
await assert.rejects(
  executeObservedCreateListing({
    addListing: async (listing) => { listingState.listing = { ...listing }; },
    updateSlotListingActive: async (_serial, active) => { listingState.listingActive = active; },
    submitLifecycleEvent: async () => { throw new Error("injected HCS submission failure"); },
  }),
  /injected HCS submission failure/
);
assert.deepEqual(listingState.listing, { serial: 213, active: true });
assert.equal(listingState.listingActive, true);

// Fault injection 2: cancel_release's first Hedera asset transaction succeeds,
// then burn fails. The caller receives failure after the refund/NFT transfer has
// already committed, with neither burn nor HCS audit completed.
const burnFailureState = { transferCommitted: false, burnCommitted: false, hcsCommitted: false };
async function executeObservedCancelRelease({ transfer, burn, audit }) {
  const transferTxId = await transfer();
  const burnTxId = await burn();
  const auditTxId = await audit();
  return { transferTxId, burnTxId, auditTxId };
}
await assert.rejects(
  executeObservedCancelRelease({
    transfer: async () => { burnFailureState.transferCommitted = true; return "transfer-tx"; },
    burn: async () => { throw new Error("injected burn failure"); },
    audit: async () => { burnFailureState.hcsCommitted = true; return "audit-tx"; },
  }),
  /injected burn failure/
);
assert.deepEqual(burnFailureState, {
  transferCommitted: true,
  burnCommitted: false,
  hcsCommitted: false,
});

// Fault injection 3: both cancel_release asset transactions commit, then HCS
// fails. The API still rejects even though refund/transfer + burn already happened.
const hcsFailureState = { transferCommitted: false, burnCommitted: false, hcsCommitted: false };
await assert.rejects(
  executeObservedCancelRelease({
    transfer: async () => { hcsFailureState.transferCommitted = true; return "transfer-tx"; },
    burn: async () => { hcsFailureState.burnCommitted = true; return "burn-tx"; },
    audit: async () => { throw new Error("injected HCS submission failure"); },
  }),
  /injected HCS submission failure/
);
assert.deepEqual(hcsFailureState, {
  transferCommitted: true,
  burnCommitted: true,
  hcsCommitted: false,
});

console.log(JSON.stringify({
  ok: true,
  finding: "WORLD_PROTECTED_RECOVERY_PARTIAL_COMMIT",
  createListing: {
    failure: "HCS audit submission",
    survivingState: { listingActive: true, slotListingActive: true, hcsReceiptAbsent: true },
  },
  cancelRelease: {
    burnFailure: burnFailureState,
    hcsFailure: hcsFailureState,
  },
  replayBoundary: "World nonce is consumed before bookingPort protected recovery execution",
  impact: "a World-authorized recovery can return failure after durable local or Hedera asset effects have already committed; the consumed AgentKit nonce cannot replay the same request",
}, null, 2));
