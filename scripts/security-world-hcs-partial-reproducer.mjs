import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bookingPortSource = await readFile("lib/adapters/booking-port.ts", "utf8");
const consensusSource = await readFile("lib/hedera/consensus.ts", "utf8");
const confirmRouteSource = await readFile("app/api/agent/confirm/route.ts", "utf8");
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

const addListingIndex = createListing.indexOf("await addListing(listing)");
const slotFlagIndex = createListing.indexOf("await updateSlotListingActive(prepared.serial, true)");
const hcsIndex = createListing.indexOf("await submitLifecycleEvent(prepared.topicId");
assert.ok(addListingIndex >= 0, "create-listing path must persist the listing");
assert.ok(slotFlagIndex > addListingIndex, "slot listing flag must follow listing persistence");
assert.ok(hcsIndex > slotFlagIndex, "reproducer expects HCS submission after both local mutations");

const beforeHcs = createListing.slice(0, hcsIndex);
const afterHcs = createListing.slice(hcsIndex);
assert.ok(!beforeHcs.includes("try {"), "unexpected rollback/transaction wrapper appeared before HCS");
assert.ok(!afterHcs.includes("deactivateListing"), "unexpected listing rollback appeared after HCS call");
assert.ok(!afterHcs.includes("updateSlotListingActive(prepared.serial, false)"), "unexpected slot-flag rollback appeared after HCS call");

// Prove that the failing boundary is a real credential-bearing Hedera HCS submit,
// not a log-only helper.
assert.match(consensusSource, /new TopicMessageSubmitTransaction\(\)/);
assert.match(consensusSource, /await tx\.sign\(issuer\.privateKey\)/);
assert.match(consensusSource, /await signed\.execute\(client\)/);
assert.match(consensusSource, /await response\.getReceipt\(client\)/);

// The World gate consumes replay before the booking-port mutation executes.
assert.ok(
  confirmRouteSource.indexOf("await authorizeWorldRecoveryWrite") <
    confirmRouteSource.indexOf("await bookingPort.confirmCreateListing"),
  "World authorization should precede the create-listing mutation"
);
const consumeIndex = verifierSource.indexOf("await nonceStore.consume(nonceKey)");
const allowedReturnIndex = verifierSource.lastIndexOf("verification,");
assert.ok(consumeIndex >= 0, "World verifier must contain nonce consumption");
assert.ok(
  allowedReturnIndex > consumeIndex,
  "authorized request nonce must be consumed before the allowed result is returned"
);

// Fault-injection model of the exact observed implementation order. The HCS
// submit fails after both local mutations. There is intentionally no compensating
// rollback because the exact source segment above contains none.
const state = {
  listing: null,
  listingActive: false,
  hcsSubmitted: false,
};

async function executeObservedOrder({ addListing, updateSlotListingActive, submitLifecycleEvent }) {
  const listing = { serial: 213, active: true };
  await addListing(listing);
  await updateSlotListingActive(213, true);
  const auditTxId = await submitLifecycleEvent("0.0.123", { eventType: "LISTED", serial: 213 });
  return { listing, auditTxId };
}

await assert.rejects(
  executeObservedOrder({
    addListing: async (listing) => {
      state.listing = { ...listing };
    },
    updateSlotListingActive: async (_serial, active) => {
      state.listingActive = active;
    },
    submitLifecycleEvent: async () => {
      throw new Error("injected HCS submission failure");
    },
  }),
  /injected HCS submission failure/
);

assert.deepEqual(state.listing, { serial: 213, active: true });
assert.equal(state.listingActive, true);
assert.equal(state.hcsSubmitted, false);

console.log(
  JSON.stringify(
    {
      ok: true,
      finding: "WORLD_SIGNED_ROUTE_PARTIAL_WRITE_ON_HCS_FAILURE",
      sourceOrder: ["addListing", "updateSlotListingActive(true)", "submitLifecycleEvent"],
      injectedFailure: "submitLifecycleEvent",
      survivingState: {
        listingActive: state.listing?.active === true,
        slotListingActive: state.listingActive,
        hcsReceiptAbsent: true,
      },
      replayBoundary: "World nonce is consumed before bookingPort.confirmCreateListing executes",
      impact: "authorized request can return failure after local listing state commits, while its signed HCS audit event is absent and the same AgentKit nonce cannot be retried",
    },
    null,
    2
  )
);
