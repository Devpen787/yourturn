import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Wallet } from "ethers";
import { assertRecoveryMandateLiveBookingState } from "../lib/ledger/recovery-mandate-booking-guard.ts";
import { buildRecoveryMandateTypedData } from "../lib/ledger/recovery-mandate.ts";
import { createRedisRecoveryMandateReplayStore } from "../lib/ledger/recovery-mandate-replay.ts";
import {
  activatePreparedRecoveryMandate,
  activeRecoveryMandateKey,
  loadActiveRecoveryMandate,
  storePreparedRecoveryMandate,
} from "../lib/ledger/recovery-mandate-state.ts";

// Independent SEC-LEDGER-005 retest. This intentionally attacks only the
// repaired activation boundary: mutable booking predicates vs one-shot Redis
// activation. No hardware, network, secret, or asset mutation is involved.
const NOW = BigInt(1_800_000_000);
const TEST_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412b95e0d3dc89116";
const wallet = new Wallet(TEST_PRIVATE_KEY);
const EXPECTED_HOLDER = "0.0.1001";
const OTHER_HOLDER = "0.0.1002";

const policy = {
  resaleAllowed: true,
  ownerRoyaltyPercent: 10,
  releaseAllowed: true,
  waitlistEnabled: true,
  scheduleAutomationEnabled: true,
  version: 1,
  label: "Provider recovery policy v1",
};

function makeMandate(suffix) {
  return {
    mandateId: `security-ledger-005-${suffix}`,
    ownerId: "owner-alice",
    ledgerSignerAddress: wallet.address,
    agentId: "yourturn-concierge",
    bookingTokenId: "0.0.700001",
    bookingSerial: BigInt(193),
    allowedAction: "resale",
    minimumRecoveryAtomicUnits: BigInt(40_000_000),
    settlementAsset: "0.0.429274",
    expiresAt: NOW + BigInt(3_600),
    nonce: `security-ledger-005-${suffix}-nonce`,
    cancellationAllowed: false,
    issuedAt: NOW - BigInt(30),
  };
}

function validSlot(overrides = {}) {
  return {
    tokenId: "0.0.700001",
    serial: 193,
    slotId: "slot-193",
    title: "Friday Yoga",
    startTime: "2026-09-11T16:00:00.000Z",
    endTime: "2026-09-11T17:00:00.000Z",
    location: "Zurich",
    primaryPriceHbar: 10,
    resaleAllowed: true,
    policy: { ...policy },
    policySnapshot: {
      ...policy,
      snapshotId: "policy_v1_security_retest",
      capturedAt: "2026-09-10T00:00:00.000Z",
      source: "owner_policy",
    },
    listingActive: false,
    status: "HELD",
    holderAccountId: EXPECTED_HOLDER,
    ...overrides,
  };
}

function activeListing() {
  return {
    tokenId: "0.0.700001",
    serial: 193,
    sellerAccountId: EXPECTED_HOLDER,
    askPriceHbar: 10,
    royaltyHbar: 1,
    sellerNetHbar: 9,
    active: true,
    createdAt: "2026-09-10T00:00:00.000Z",
  };
}

function createRedisFixture({ beforeActiveSet } = {}) {
  const records = new Map();
  return {
    records,
    async get(key) {
      return records.get(key)?.value ?? null;
    },
    async set(key, value, options = {}) {
      if (options.nx && records.has(key)) return null;
      if (key.startsWith("bookedrights:ledger:mandate-active:") && beforeActiveSet) {
        await beforeActiveSet({ key, value, options, records });
      }
      records.set(key, { value, options });
      return "OK";
    },
  };
}

async function sign(mandate) {
  const { domain, types, value } = buildRecoveryMandateTypedData(mandate);
  return wallet.signTypedData(domain, types, value);
}

function revalidatorFor(liveState, onValidate = () => {}) {
  return async (mandate) => {
    onValidate();
    assertRecoveryMandateLiveBookingState({
      mandate,
      live: {
        slot: liveState.slot,
        listing: liveState.listing,
        expectedHolderAccountId: EXPECTED_HOLDER,
      },
    });
  };
}

async function assertInitialStaleRejected({ suffix, mutate, expected }) {
  const redis = createRedisFixture();
  const replayStore = createRedisRecoveryMandateReplayStore(redis);
  const mandate = makeMandate(suffix);
  await storePreparedRecoveryMandate({
    store: redis,
    mandate,
    ownerId: mandate.ownerId,
    nowUnixSeconds: NOW,
  });
  const signature = await sign(mandate);
  const liveState = { slot: validSlot(), listing: null };
  mutate(liveState);

  await assert.rejects(
    activatePreparedRecoveryMandate({
      store: redis,
      replayStore,
      mandateId: mandate.mandateId,
      ownerId: mandate.ownerId,
      signature,
      revalidateMutableAuthority: revalidatorFor(liveState),
      nowUnixSeconds: NOW,
    }),
    expected,
    `${suffix} must fail before active authority creation`
  );

  await assert.rejects(
    loadActiveRecoveryMandate({
      store: redis,
      mandateId: mandate.mandateId,
      ownerId: mandate.ownerId,
    }),
    /not found|expired/,
    `${suffix} must not leave an active authority record`
  );
}

// The owner repair closes the original coarse stale-precondition reproducer:
// each mutable predicate is now re-read before replay consumption.
await assertInitialStaleRejected({
  suffix: "stale-holder",
  mutate(live) {
    live.slot = validSlot({ holderAccountId: OTHER_HOLDER });
  },
  expected: /holder changed/,
});
await assertInitialStaleRejected({
  suffix: "stale-status",
  mutate(live) {
    live.slot = validSlot({ status: "AVAILABLE", holderAccountId: null });
  },
  expected: /no longer held and transferable/,
});
await assertInitialStaleRejected({
  suffix: "stale-provider-policy",
  mutate(live) {
    live.slot = validSlot({
      resaleAllowed: false,
      policy: { ...policy, resaleAllowed: false, version: 2 },
    });
  },
  expected: /policy no longer permits/,
});
await assertInitialStaleRejected({
  suffix: "stale-listing",
  mutate(live) {
    live.listing = activeListing();
  },
  expected: /active resale listing/,
});

// Remaining TOCTOU: the repair does a second live read, but that read and the
// Redis creation of the active authority are not one atomic/version-bound
// operation with booking/listing state. Model a concurrent resale-list write
// after the second revalidation has returned but before the active Redis SET.
const raceLive = { slot: validSlot(), listing: null };
let validationCount = 0;
let listingChangedAtActiveBoundary = false;
const raceRedis = createRedisFixture({
  async beforeActiveSet() {
    assert.equal(
      validationCount,
      2,
      "active write should be reached only after both repaired revalidations"
    );
    // Yield once to model a competing request getting scheduled at this exact
    // boundary, then make the previously-valid booking actively listed.
    await Promise.resolve();
    raceLive.listing = activeListing();
    listingChangedAtActiveBoundary = true;
  },
});
const raceReplayStore = createRedisRecoveryMandateReplayStore(raceRedis);
const raceMandate = makeMandate("post-second-check-listing-race");
await storePreparedRecoveryMandate({
  store: raceRedis,
  mandate: raceMandate,
  ownerId: raceMandate.ownerId,
  nowUnixSeconds: NOW,
});
const raceSignature = await sign(raceMandate);

const racedActivation = await activatePreparedRecoveryMandate({
  store: raceRedis,
  replayStore: raceReplayStore,
  mandateId: raceMandate.mandateId,
  ownerId: raceMandate.ownerId,
  signature: raceSignature,
  revalidateMutableAuthority: revalidatorFor(raceLive, () => {
    validationCount += 1;
  }),
  nowUnixSeconds: NOW,
});

assert.equal(validationCount, 2, "repair must perform both live checks");
assert.equal(listingChangedAtActiveBoundary, true);
assert.equal(raceLive.listing?.active, true);
assert.equal(racedActivation.active.state, "active");

const survivingActive = await loadActiveRecoveryMandate({
  store: raceRedis,
  mandateId: raceMandate.mandateId,
  ownerId: raceMandate.ownerId,
});
assert.equal(
  survivingActive.record.state,
  "active",
  "active Ledger authority currently survives a listing race after the second live check"
);
assert.equal(
  activeRecoveryMandateKey(raceMandate.mandateId),
  `bookedrights:ledger:mandate-active:${raceMandate.mandateId}`
);

// Preserve the one-shot property even in the reproduced race: once the first
// activation consumed the signature, resetting the booking to a valid state
// must not make that exact signed mandate reusable.
raceLive.listing = null;
await assert.rejects(
  activatePreparedRecoveryMandate({
    store: raceRedis,
    replayStore: raceReplayStore,
    mandateId: raceMandate.mandateId,
    ownerId: raceMandate.ownerId,
    signature: raceSignature,
    revalidateMutableAuthority: revalidatorFor(raceLive),
    nowUnixSeconds: NOW,
  }),
  /already been consumed/,
  "the final-boundary race must not weaken one-shot replay protection"
);

// Keep the repaired public route on the dedicated mandate activation path. A
// comment may mention the legacy grant, but executable code must not call it.
const activateRoute = readFileSync(
  new URL(
    "../app/api/ledger/recovery-mandate/activate/route.ts",
    import.meta.url
  ),
  "utf8"
);
assert.doesNotMatch(
  activateRoute,
  /fetch\s*\([^\n]*\/api\/agent\/approval-grant/,
  "Ledger activation must not call the legacy approval-grant route"
);
assert.doesNotMatch(
  activateRoute,
  /from\s+["'][^"']*approval-grant[^"']*["']/,
  "Ledger activation must not import legacy approval-grant authority"
);

console.log(
  JSON.stringify(
    {
      secLedger005: "REMAINS_OPEN",
      ownerRepairHead: "dfb3fec6328c5db22aa6b6eb222b5e0a57f3b54a",
      originalStaleHolderRejected: true,
      originalStaleStatusRejected: true,
      originalStaleProviderPolicyRejected: true,
      originalStaleListingRejected: true,
      preReplayLiveReadPresent: true,
      postReplayLiveReadPresent: true,
      finalBoundaryListingRaceReproduced: true,
      activeAuthoritySurvivedChangedPredicate: true,
      oneShotReplayStillEnforced: true,
      legacyApprovalGrantExecutablePathAbsent: true,
      impactBoundary:
        "No downstream asset mutation is asserted here. The remaining issue is a TOCTOU window between the second live-state read and creation of the Redis active-authority record; close it before active mandate state becomes sufficient recovery authority.",
    },
    null,
    2
  )
);
