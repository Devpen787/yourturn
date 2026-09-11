import assert from "node:assert/strict";
import { Wallet } from "ethers";
import { assertRecoveryMandateLiveBookingState } from "../lib/ledger/recovery-mandate-booking-guard.ts";
import {
  readStableRecoveryMandateAuthorityVersion,
  withRecoveryMandateAuthorityMutation,
} from "../lib/ledger/recovery-mandate-authority-boundary.ts";
import { createRedisRecoveryMandateReplayStore } from "../lib/ledger/recovery-mandate-replay.ts";
import { buildRecoveryMandateTypedData } from "../lib/ledger/recovery-mandate.ts";
import {
  activatePreparedRecoveryMandate,
  activeRecoveryMandateKey,
  loadActiveRecoveryMandate,
  storePreparedRecoveryMandate,
} from "../lib/ledger/recovery-mandate-state.ts";

// Independent SEC-LEDGER-005 retest of the new serialized/versioned final
// authority boundary. No network, hardware, secrets, deployment, or asset
// mutation is involved.
const NOW = BigInt(1_800_000_000);
const TEST_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412b95e0d3dc89116";
const wallet = new Wallet(TEST_PRIVATE_KEY);
const EXPECTED_HOLDER = "0.0.1001";
const OTHER_HOLDER = "0.0.1002";
const SERIAL = 193;

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
    bookingSerial: BigInt(SERIAL),
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
    serial: SERIAL,
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
      snapshotId: "policy_v1_security_atomic_retest",
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
    serial: SERIAL,
    sellerAccountId: EXPECTED_HOLDER,
    askPriceHbar: 10,
    royaltyHbar: 1,
    sellerNetHbar: 9,
    active: true,
    createdAt: "2026-09-11T00:00:00.000Z",
  };
}

function createRedisFixture({ beforeConditionalActiveWrite } = {}) {
  const records = new Map();
  let activeWriteHookUsed = false;

  return {
    records,
    async get(key) {
      return records.get(key)?.value ?? null;
    },
    async set(key, value, options = {}) {
      if (options.nx && records.has(key)) return null;
      records.set(key, { value: String(value), options });
      return "OK";
    },
    async eval(_script, keys, args) {
      // BEGIN_MUTATION_SCRIPT: one key, no args.
      if (keys.length === 1 && args.length === 0) {
        const current = Number(records.get(keys[0])?.value ?? "0");
        if (!Number.isFinite(current)) return -2;
        if (current % 2 !== 0) return -1;
        const next = current + 1;
        records.set(keys[0], { value: String(next), options: {} });
        return next;
      }

      // END_MUTATION_SCRIPT: one key, expected odd version arg.
      if (keys.length === 1 && args.length === 1) {
        const current = Number(records.get(keys[0])?.value ?? "0");
        const expected = Number(args[0]);
        if (
          !Number.isFinite(current) ||
          !Number.isFinite(expected) ||
          current !== expected ||
          current % 2 === 0
        ) {
          return -1;
        }
        const next = current + 1;
        records.set(keys[0], { value: String(next), options: {} });
        return next;
      }

      // STORE_ACTIVE_IF_VERSION_UNCHANGED_SCRIPT: version key + active key.
      if (keys.length === 2 && args.length === 3) {
        if (beforeConditionalActiveWrite && !activeWriteHookUsed) {
          activeWriteHookUsed = true;
          await beforeConditionalActiveWrite();
        }
        const current = Number(records.get(keys[0])?.value ?? "0");
        const expected = Number(args[0]);
        if (
          !Number.isFinite(current) ||
          !Number.isFinite(expected) ||
          current !== expected ||
          current % 2 !== 0
        ) {
          return -1;
        }
        if (records.has(keys[1])) return 0;
        records.set(keys[1], {
          value: String(args[1]),
          options: { nx: true, ex: Number(args[2]) },
        });
        return 1;
      }

      throw new Error(
        `Unexpected Redis eval shape in independent security fixture: ${keys.length}/${args.length}`
      );
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

async function prepare(redis, suffix) {
  const mandate = makeMandate(suffix);
  await storePreparedRecoveryMandate({
    store: redis,
    mandate,
    ownerId: mandate.ownerId,
    nowUnixSeconds: NOW,
  });
  return { mandate, signature: await sign(mandate) };
}

async function assertInitialStaleRejected({ suffix, mutate, expected }) {
  const redis = createRedisFixture();
  const replayStore = createRedisRecoveryMandateReplayStore(redis);
  const { mandate, signature } = await prepare(redis, suffix);
  const live = { slot: validSlot(), listing: null };
  mutate(live);

  await assert.rejects(
    activatePreparedRecoveryMandate({
      store: redis,
      authorityBoundaryStore: redis,
      replayStore,
      mandateId: mandate.mandateId,
      ownerId: mandate.ownerId,
      signature,
      revalidateMutableAuthority: revalidatorFor(live),
      nowUnixSeconds: NOW,
    }),
    expected
  );
  assert.equal(
    await redis.get(activeRecoveryMandateKey(mandate.mandateId)),
    null,
    `${suffix} must not create active authority`
  );
  assert.equal(
    [...redis.records.keys()].some((key) =>
      key.startsWith("bookedrights:ledger:mandate-consumed:")
    ),
    false,
    `${suffix} must fail before replay consumption`
  );
}

// Preserve the stale-state negatives from the accepted finding.
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

// Accepted SEC-LEDGER-005 race: both ordinary validations succeed, then a real
// production authority mutation advances the version before the active CAS.
const raceLive = { slot: validSlot(), listing: null };
let raceValidationCount = 0;
let raceRedis;
raceRedis = createRedisFixture({
  async beforeConditionalActiveWrite() {
    assert.equal(raceValidationCount, 2);
    await withRecoveryMandateAuthorityMutation({
      store: raceRedis,
      bookingSerial: SERIAL,
      async mutate() {
        raceLive.listing = activeListing();
      },
    });
  },
});
const raceReplayStore = createRedisRecoveryMandateReplayStore(raceRedis);
const { mandate: raceMandate, signature: raceSignature } = await prepare(
  raceRedis,
  "accepted-final-boundary-race"
);

await assert.rejects(
  activatePreparedRecoveryMandate({
    store: raceRedis,
    authorityBoundaryStore: raceRedis,
    replayStore: raceReplayStore,
    mandateId: raceMandate.mandateId,
    ownerId: raceMandate.ownerId,
    signature: raceSignature,
    revalidateMutableAuthority: revalidatorFor(raceLive, () => {
      raceValidationCount += 1;
    }),
    nowUnixSeconds: NOW,
  }),
  /state changed after final validation/
);
assert.equal(raceValidationCount, 2);
assert.equal(raceLive.listing?.active, true);
assert.equal(
  await raceRedis.get(activeRecoveryMandateKey(raceMandate.mandateId)),
  null,
  "the accepted mutation-after-last-validation race must leave no active authority"
);
assert.equal(
  await readStableRecoveryMandateAuthorityVersion({
    store: raceRedis,
    bookingSerial: SERIAL,
  }),
  2,
  "competing mutation must have advanced the serialized authority version"
);

// Replay remains one-shot even though the final authority CAS rejected.
raceLive.listing = null;
await assert.rejects(
  activatePreparedRecoveryMandate({
    store: raceRedis,
    authorityBoundaryStore: raceRedis,
    replayStore: raceReplayStore,
    mandateId: raceMandate.mandateId,
    ownerId: raceMandate.ownerId,
    signature: raceSignature,
    revalidateMutableAuthority: revalidatorFor(raceLive),
    nowUnixSeconds: NOW,
  }),
  /already been consumed/
);

// New versioned-authority attack: activate successfully, then mutate the same
// booking through the production serialization primitive. The active record's
// captured authorityStateVersion becomes stale. If loadActive still returns it
// as active without checking current version/live predicates, stale authority
// survives the very mutation domain the new version was meant to serialize.
const postLive = { slot: validSlot(), listing: null };
const postRedis = createRedisFixture();
const postReplayStore = createRedisRecoveryMandateReplayStore(postRedis);
const { mandate: postMandate, signature: postSignature } = await prepare(
  postRedis,
  "post-activation-invalidation"
);
const postActivation = await activatePreparedRecoveryMandate({
  store: postRedis,
  authorityBoundaryStore: postRedis,
  replayStore: postReplayStore,
  mandateId: postMandate.mandateId,
  ownerId: postMandate.ownerId,
  signature: postSignature,
  revalidateMutableAuthority: revalidatorFor(postLive),
  nowUnixSeconds: NOW,
});
assert.equal(postActivation.active.authorityStateVersion, 0);

await withRecoveryMandateAuthorityMutation({
  store: postRedis,
  bookingSerial: SERIAL,
  async mutate() {
    postLive.listing = activeListing();
  },
});
const postMutationVersion = await readStableRecoveryMandateAuthorityVersion({
  store: postRedis,
  bookingSerial: SERIAL,
});
assert.equal(postMutationVersion, 2);
await assert.rejects(
  revalidatorFor(postLive)(postMandate),
  /active resale listing/,
  "live booking predicate must now reject the previously authorized mandate"
);

const staleActive = await loadActiveRecoveryMandate({
  store: postRedis,
  mandateId: postMandate.mandateId,
  ownerId: postMandate.ownerId,
});
assert.equal(staleActive.record.state, "active");
assert.equal(staleActive.record.authorityStateVersion, 0);
assert.notEqual(
  staleActive.record.authorityStateVersion,
  postMutationVersion,
  "the active authority record is stale after the serialized booking mutation"
);

postLive.listing = null;
await assert.rejects(
  activatePreparedRecoveryMandate({
    store: postRedis,
    authorityBoundaryStore: postRedis,
    replayStore: postReplayStore,
    mandateId: postMandate.mandateId,
    ownerId: postMandate.ownerId,
    signature: postSignature,
    revalidateMutableAuthority: revalidatorFor(postLive),
    nowUnixSeconds: NOW,
  }),
  /already been consumed/,
  "post-activation invalidation must not weaken replay protection"
);

console.log(
  JSON.stringify(
    {
      secLedger005: "REMAINS_OPEN_NARROWED",
      ownerRepairHead: "96d513ef1286cf06192315263039d631b91a0d18",
      acceptedFinalBoundaryRaceBlocked: true,
      noActiveAuthorityFromAcceptedRace: true,
      staleHolderRejectedBeforeReplay: true,
      staleStatusRejectedBeforeReplay: true,
      staleProviderPolicyRejectedBeforeReplay: true,
      staleListingRejectedBeforeReplay: true,
      replayStillOneShotAfterCasRejection: true,
      postActivationMutationVersionAdvanced: postMutationVersion,
      staleActiveAuthorityStillLoadable: true,
      staleActiveAuthorityVersion: staleActive.record.authorityStateVersion,
      currentAuthorityVersion: postMutationVersion,
      impactBoundary:
        "The new CAS closes the accepted pre-write race. A later serialized booking mutation still leaves the already-created active mandate loadable without comparing its captured authorityStateVersion to current authority state. No downstream asset mutation is asserted here; do not treat active mandate state as sufficient recovery authority until stale active records fail closed or are invalidated.",
    },
    null,
    2
  )
);
