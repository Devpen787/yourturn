import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Wallet } from "ethers";
import { resolveEnrolledLedgerSignerAddress } from "../lib/ledger/ledger-signer-enrollment.ts";
import {
  readStableRecoveryMandateAuthorityVersion,
  withRecoveryMandateAuthorityMutation,
} from "../lib/ledger/recovery-mandate-authority-boundary.ts";
import { assertRecoveryMandateLiveBookingState } from "../lib/ledger/recovery-mandate-booking-guard.ts";
import { buildRecoveryMandateTypedData } from "../lib/ledger/recovery-mandate.ts";
import { createRedisRecoveryMandateReplayStore } from "../lib/ledger/recovery-mandate-replay.ts";
import {
  activatePreparedRecoveryMandate,
  activeRecoveryMandateKey,
  loadActiveRecoveryMandate,
  storePreparedRecoveryMandate,
} from "../lib/ledger/recovery-mandate-state.ts";

const NOW = BigInt(1_800_000_000);
const TEST_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412b95e0d3dc89116";
const wallet = new Wallet(TEST_PRIVATE_KEY);
const substituteWallet = Wallet.createRandom();
const EXPECTED_HOLDER = "0.0.1001";
const OTHER_HOLDER = "0.0.1002";
const SERIAL = 193;

const configuredSigners = {
  LEDGER_GUEST_A_SIGNER_ADDRESS: wallet.address,
  LEDGER_GUEST_B_SIGNER_ADDRESS: substituteWallet.address,
};
assert.equal(
  resolveEnrolledLedgerSignerAddress("guestA", configuredSigners),
  wallet.address,
  "guestA signer must come from server-side enrollment configuration"
);
assert.equal(
  resolveEnrolledLedgerSignerAddress("guestB", configuredSigners),
  substituteWallet.address,
  "guestB signer must have an independent server-side enrollment"
);
assert.throws(
  () => resolveEnrolledLedgerSignerAddress("guestA", {}),
  /not configured/,
  "missing server enrollment must fail closed"
);
assert.throws(
  () =>
    resolveEnrolledLedgerSignerAddress("guestA", {
      LEDGER_GUEST_A_SIGNER_ADDRESS: "not-an-evm-address",
    }),
  /invalid/,
  "malformed server enrollment must fail closed"
);

function makeMandate(overrides = {}) {
  return {
    mandateId: "mandate-runtime-193",
    ownerId: "owner-alice",
    ledgerSignerAddress: wallet.address,
    agentId: "yourturn-concierge",
    bookingTokenId: "0.0.700001",
    bookingSerial: BigInt(SERIAL),
    allowedAction: "resale",
    minimumRecoveryAtomicUnits: BigInt(40_000_000),
    settlementAsset: "0.0.429274",
    expiresAt: NOW + BigInt(3_600),
    nonce: "runtime-nonce-193",
    cancellationAllowed: false,
    issuedAt: NOW - BigInt(30),
    ...overrides,
  };
}

function createRedisFixture(options = {}) {
  const records = new Map();
  let beforeConditionalAuthorityWrite =
    options.beforeConditionalAuthorityWrite ?? null;
  return {
    records,
    setBeforeConditionalAuthorityWrite(hook) {
      beforeConditionalAuthorityWrite = hook;
    },
    async get(key) {
      return records.get(key)?.value ?? null;
    },
    async set(key, value, options = {}) {
      if (options.nx && records.has(key)) return null;
      records.set(key, { value: String(value), options });
      return "OK";
    },
    async eval(_script, keys, args) {
      // BEGIN_MUTATION_SCRIPT.
      if (keys.length === 1 && args.length === 0) {
        const current = Number(records.get(keys[0])?.value ?? 0);
        if (!Number.isSafeInteger(current)) return -2;
        if (current % 2 !== 0) return -1;
        const next = current + 1;
        records.set(keys[0], { value: String(next), options: {} });
        return next;
      }
      // END_MUTATION_SCRIPT.
      if (keys.length === 1 && args.length === 1) {
        const current = Number(records.get(keys[0])?.value ?? 0);
        const expected = Number(args[0]);
        if (current !== expected || current % 2 === 0) return -1;
        const next = current + 1;
        records.set(keys[0], { value: String(next), options: {} });
        return next;
      }
      // Atomic current-pointer successor; same booking-version race injection.
      if (keys.length === 3 && args.length === 5) {
        if (Number(args[2]) <= Number(NOW)) return -4;
        if (beforeConditionalAuthorityWrite) {
          const hook = beforeConditionalAuthorityWrite;
          beforeConditionalAuthorityWrite = null;
          await hook();
        }
        const current = Number(records.get(keys[0])?.value ?? 0);
        if (current !== Number(args[0]) || current % 2 !== 0) return -1;
        if ((records.get(keys[2])?.value ?? "") !== args[3]) return -3;
        if (records.has(keys[1])) return 0;
        records.set(keys[1], { value: String(args[1]), options: { nx: true, exat: Number(args[2]) } });
        records.set(keys[2], { value: String(args[4]), options: {} });
        return 1;
      }
      // STORE_ACTIVE_IF_VERSION_UNCHANGED_SCRIPT.
      if (keys.length === 2 && args.length === 3) {
        if (beforeConditionalAuthorityWrite) {
          const hook = beforeConditionalAuthorityWrite;
          beforeConditionalAuthorityWrite = null;
          await hook();
        }
        const current = Number(records.get(keys[0])?.value ?? 0);
        const expected = Number(args[0]);
        if (current !== expected || current % 2 !== 0) return -1;
        if (records.has(keys[1])) return 0;
        records.set(keys[1], {
          value: String(args[1]),
          options: { nx: true, ex: Number(args[2]) },
        });
        return 1;
      }
      throw new Error("Unexpected authority-boundary eval shape in fixture");
    },
  };
}

async function sign(mandate) {
  const { domain, types, value } = buildRecoveryMandateTypedData(mandate);
  return wallet.signTypedData(domain, types, value);
}

const policy = {
  resaleAllowed: true,
  ownerRoyaltyPercent: 10,
  releaseAllowed: true,
  waitlistEnabled: true,
  scheduleAutomationEnabled: true,
  version: 1,
  label: "Provider recovery policy v1",
};

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
      snapshotId: "policy_v1_test",
      capturedAt: "2026-09-10T00:00:00.000Z",
      source: "owner_policy",
    },
    listingActive: false,
    status: "HELD",
    holderAccountId: EXPECTED_HOLDER,
    ...overrides,
  };
}

function activeListing(overrides = {}) {
  return {
    tokenId: "0.0.700001",
    serial: SERIAL,
    sellerAccountId: EXPECTED_HOLDER,
    askPriceHbar: 10,
    royaltyHbar: 1,
    sellerNetHbar: 9,
    active: true,
    createdAt: "2026-09-10T00:00:00.000Z",
    ...overrides,
  };
}

function revalidatorFor(liveState, afterValidation) {
  return async (mandate) => {
    assertRecoveryMandateLiveBookingState({
      mandate,
      live: {
        slot: liveState.slot,
        listing: liveState.listing,
        expectedHolderAccountId: EXPECTED_HOLDER,
      },
    });
    if (afterValidation) await afterValidation(mandate);
  };
}

async function prepare(redis, mandate) {
  await storePreparedRecoveryMandate({
    store: redis,
    mandate,
    ownerId: mandate.ownerId,
    nowUnixSeconds: NOW,
  });
  return sign(mandate);
}

async function activateFixture({
  redis,
  replayStore,
  mandate,
  signature,
  ownerId = mandate.ownerId,
  revalidateMutableAuthority,
}) {
  return activatePreparedRecoveryMandate({
    store: redis,
    authorityBoundaryStore: redis,
    replayStore,
    mandateId: mandate.mandateId,
    ownerId,
    signature,
    revalidateMutableAuthority,
    nowUnixSeconds: NOW,
  });
}

async function loadCurrentFixture({ redis, mandate, liveState }) {
  return loadActiveRecoveryMandate({
    store: redis,
    authorityBoundaryStore: redis,
    mandateId: mandate.mandateId,
    ownerId: mandate.ownerId,
    revalidateMutableAuthority: revalidatorFor(liveState),
  });
}

async function assertInitialStaleStateFails({
  label,
  expectedError,
  mutate,
}) {
  const redis = createRedisFixture();
  const replayStore = createRedisRecoveryMandateReplayStore(redis);
  const suffix = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const mandate = makeMandate({
    mandateId: `mandate-stale-${suffix}`,
    nonce: `runtime-stale-${suffix}`,
  });
  const signature = await prepare(redis, mandate);
  const liveState = { slot: validSlot(), listing: null };
  mutate(liveState);

  await assert.rejects(
    activateFixture({
      redis,
      replayStore,
      mandate,
      signature,
      revalidateMutableAuthority: revalidatorFor(liveState),
    }),
    expectedError,
    `${label} must fail closed before active authority exists`
  );
  await assert.rejects(
    loadActiveRecoveryMandate({
      store: redis,
      authorityBoundaryStore: redis,
      mandateId: mandate.mandateId,
      ownerId: mandate.ownerId,
      revalidateMutableAuthority: revalidatorFor(liveState),
    }),
    /not found|expired/,
    `${label} must not create active authority`
  );

  // Initial stale rejection is before replay consumption. A corrected live
  // state may therefore activate the same already-signed mandate once.
  liveState.slot = validSlot();
  liveState.listing = null;
  const recovered = await activateFixture({
    redis,
    replayStore,
    mandate,
    signature,
    revalidateMutableAuthority: revalidatorFor(liveState),
  });
  assert.equal(recovered.active.state, "active");
}

// Baseline one-shot activation, owner isolation and guarded active load.
const redis = createRedisFixture();
const replayStore = createRedisRecoveryMandateReplayStore(redis);
const mandate = makeMandate();
const signature = await prepare(redis, mandate);
const validLiveState = { slot: validSlot(), listing: null };

await assert.rejects(
  activateFixture({
    redis,
    replayStore,
    mandate,
    signature,
    ownerId: "owner-bob",
    revalidateMutableAuthority: revalidatorFor(validLiveState),
  }),
  /does not belong/
);

const results = await Promise.allSettled([
  activateFixture({
    redis,
    replayStore,
    mandate,
    signature,
    revalidateMutableAuthority: revalidatorFor(validLiveState),
  }),
  activateFixture({
    redis,
    replayStore,
    mandate,
    signature,
    revalidateMutableAuthority: revalidatorFor(validLiveState),
  }),
]);
assert.equal(
  results.filter((result) => result.status === "fulfilled").length,
  1,
  "exactly one concurrent activation may succeed"
);
assert.equal(
  results.filter((result) => result.status === "rejected").length,
  1,
  "duplicate concurrent activation must fail"
);

const active = await loadCurrentFixture({ redis, mandate, liveState: validLiveState });
assert.equal(active.record.state, "active");
assert.equal(active.record.authorityStateVersion, 0);
assert.equal(active.mandate.agentId, "yourturn-concierge");
assert.equal(active.mandate.bookingSerial, BigInt(SERIAL));
assert.equal(active.mandate.minimumRecoveryAtomicUnits, BigInt(40_000_000));
assert.equal(active.mandate.settlementAsset, "0.0.429274");
assert.equal(active.mandate.cancellationAllowed, false);

// An active record cannot be interpreted as authority without current booking
// boundary + live predicate validation context.
await assert.rejects(
  loadActiveRecoveryMandate({
    store: redis,
    mandateId: mandate.mandateId,
    ownerId: mandate.ownerId,
  }),
  /requires the authoritative booking state boundary/,
  "raw active-state inspection must not be an authorization API"
);

// Wrong signer must not poison replay; the correct signature can still win.
const badSignatureMandate = makeMandate({
  mandateId: "mandate-runtime-bad-signature",
  nonce: "runtime-nonce-bad-signature",
});
const correctAfterBadSignature = await prepare(redis, badSignatureMandate);
const badTyped = buildRecoveryMandateTypedData(badSignatureMandate);
const wrongSignature = await substituteWallet.signTypedData(
  badTyped.domain,
  badTyped.types,
  badTyped.value
);
await assert.rejects(
  activateFixture({
    redis,
    replayStore,
    mandate: badSignatureMandate,
    signature: wrongSignature,
    revalidateMutableAuthority: revalidatorFor(validLiveState),
  }),
  /signature signer mismatch/
);
await activateFixture({
  redis,
  replayStore,
  mandate: badSignatureMandate,
  signature: correctAfterBadSignature,
  revalidateMutableAuthority: revalidatorFor(validLiveState),
});

// Preserve the accepted stale prepare/activation negatives.
await assertInitialStaleStateFails({
  label: "stale holder",
  expectedError: /holder changed/,
  mutate(live) {
    live.slot = validSlot({ holderAccountId: OTHER_HOLDER });
  },
});
await assertInitialStaleStateFails({
  label: "stale status",
  expectedError: /no longer held and transferable/,
  mutate(live) {
    live.slot = validSlot({ status: "AVAILABLE", holderAccountId: null });
  },
});
await assertInitialStaleStateFails({
  label: "stale provider policy",
  expectedError: /policy no longer permits/,
  mutate(live) {
    live.slot = validSlot({
      resaleAllowed: false,
      policy: { ...policy, resaleAllowed: false, version: 2 },
    });
  },
});
await assertInitialStaleStateFails({
  label: "stale listing",
  expectedError: /active resale listing/,
  mutate(live) {
    live.listing = activeListing();
  },
});

// Accepted SEC-LEDGER-005 combined stale-state reproducer.
const reproRedis = createRedisFixture();
const reproReplayStore = createRedisRecoveryMandateReplayStore(reproRedis);
const reproMandate = makeMandate({
  mandateId: "security-stale-activation-193",
  nonce: "security-stale-activation-nonce-193",
});
const reproSignature = await prepare(reproRedis, reproMandate);
const staleReproLive = {
  slot: validSlot({
    status: "AVAILABLE",
    holderAccountId: OTHER_HOLDER,
    resaleAllowed: false,
    policy: { ...policy, resaleAllowed: false, version: 2 },
    listingActive: true,
  }),
  listing: activeListing(),
};
await assert.rejects(
  activateFixture({
    redis: reproRedis,
    replayStore: reproReplayStore,
    mandate: reproMandate,
    signature: reproSignature,
    revalidateMutableAuthority: revalidatorFor(staleReproLive),
  }),
  /no longer held|policy no longer permits|active resale listing|holder changed/
);
assert.equal(
  await reproRedis.get(activeRecoveryMandateKey(reproMandate.mandateId)),
  null
);

// SEC-LEDGER-005 earlier race: the second live validation catches a listing
// appearing after the first validation. Replay remains consumed after this
// final-boundary failure.
const raceRedis = createRedisFixture();
const raceReplayStore = createRedisRecoveryMandateReplayStore(raceRedis);
const raceMandate = makeMandate({
  mandateId: "mandate-final-revalidation-race",
  nonce: "runtime-final-revalidation-race",
});
const raceSignature = await prepare(raceRedis, raceMandate);
let raceValidationCount = 0;
const raceRevalidator = async (signedMandate) => {
  raceValidationCount += 1;
  assertRecoveryMandateLiveBookingState({
    mandate: signedMandate,
    live: {
      slot: validSlot(),
      listing: raceValidationCount === 1 ? null : activeListing(),
      expectedHolderAccountId: EXPECTED_HOLDER,
    },
  });
};
await assert.rejects(
  activateFixture({
    redis: raceRedis,
    replayStore: raceReplayStore,
    mandate: raceMandate,
    signature: raceSignature,
    revalidateMutableAuthority: raceRevalidator,
  }),
  /active resale listing/
);
assert.equal(raceValidationCount, 2);
assert.equal(await raceRedis.get(activeRecoveryMandateKey(raceMandate.mandateId)), null);
await assert.rejects(
  activateFixture({
    redis: raceRedis,
    replayStore: raceReplayStore,
    mandate: raceMandate,
    signature: raceSignature,
    revalidateMutableAuthority: revalidatorFor(validLiveState),
  }),
  /already been consumed/
);

// Accepted SEC-LEDGER-005 final-boundary race: both ordinary validations pass,
// then a serialized listing mutation lands immediately before active CAS.
const finalRaceLive = { slot: validSlot(), listing: null };
const finalRaceRedis = createRedisFixture();
const finalRaceReplayStore = createRedisRecoveryMandateReplayStore(finalRaceRedis);
const finalRaceMandate = makeMandate({
  mandateId: "mandate-atomic-final-boundary-race",
  nonce: "runtime-atomic-final-boundary-race",
});
const finalRaceSignature = await prepare(finalRaceRedis, finalRaceMandate);
let finalRaceValidationCount = 0;
const finalRaceRevalidator = async (signedMandate) => {
  finalRaceValidationCount += 1;
  assertRecoveryMandateLiveBookingState({
    mandate: signedMandate,
    live: {
      slot: finalRaceLive.slot,
      listing: finalRaceLive.listing,
      expectedHolderAccountId: EXPECTED_HOLDER,
    },
  });
};
finalRaceRedis.setBeforeConditionalAuthorityWrite(async () => {
  await withRecoveryMandateAuthorityMutation({
    store: finalRaceRedis,
    bookingSerial: finalRaceMandate.bookingSerial,
    mutate: async () => {
      finalRaceLive.slot = validSlot({ listingActive: true });
      finalRaceLive.listing = activeListing();
    },
  });
});
await assert.rejects(
  activateFixture({
    redis: finalRaceRedis,
    replayStore: finalRaceReplayStore,
    mandate: finalRaceMandate,
    signature: finalRaceSignature,
    revalidateMutableAuthority: finalRaceRevalidator,
  }),
  /state changed after final validation/
);
assert.equal(finalRaceValidationCount, 2);
assert.equal(
  await finalRaceRedis.get(activeRecoveryMandateKey(finalRaceMandate.mandateId)),
  null
);
assert.equal(
  await readStableRecoveryMandateAuthorityVersion({
    store: finalRaceRedis,
    bookingSerial: SERIAL,
  }),
  2
);
await assert.rejects(
  activateFixture({
    redis: finalRaceRedis,
    replayStore: finalRaceReplayStore,
    mandate: finalRaceMandate,
    signature: finalRaceSignature,
    revalidateMutableAuthority: revalidatorFor(validLiveState),
  }),
  /already been consumed/
);

// SEC-LEDGER-006 accepted reproducer: activation is valid at version 0. A later
// relevant serialized mutation advances authority state to 2. The guarded
// loader must reject the old active record instead of returning it as current
// recovery authority. Replay remains one-shot.
const postLive = { slot: validSlot(), listing: null };
const postRedis = createRedisFixture();
const postReplayStore = createRedisRecoveryMandateReplayStore(postRedis);
const postMandate = makeMandate({
  mandateId: "mandate-post-activation-invalidation",
  nonce: "runtime-post-activation-invalidation",
});
const postSignature = await prepare(postRedis, postMandate);
const postActivation = await activateFixture({
  redis: postRedis,
  replayStore: postReplayStore,
  mandate: postMandate,
  signature: postSignature,
  revalidateMutableAuthority: revalidatorFor(postLive),
});
assert.equal(postActivation.active.authorityStateVersion, 0);
await withRecoveryMandateAuthorityMutation({
  store: postRedis,
  bookingSerial: SERIAL,
  mutate: async () => {
    postLive.listing = activeListing();
  },
});
const postMutationVersion = await readStableRecoveryMandateAuthorityVersion({
  store: postRedis,
  bookingSerial: SERIAL,
});
assert.equal(postMutationVersion, 2);
await assert.rejects(
  loadActiveRecoveryMandate({
    store: postRedis,
    authorityBoundaryStore: postRedis,
    mandateId: postMandate.mandateId,
    ownerId: postMandate.ownerId,
    revalidateMutableAuthority: revalidatorFor(postLive),
  }),
  /stale because booking authority state changed after activation/,
  "serialized post-activation mutation must invalidate the old active authority"
);
assert.notEqual(
  JSON.parse(
    await postRedis.get(activeRecoveryMandateKey(postMandate.mandateId))
  ).authorityStateVersion,
  postMutationVersion,
  "stored evidence may remain for audit, but its stale version must be unusable"
);
postLive.listing = null;
await assert.rejects(
  activateFixture({
    redis: postRedis,
    replayStore: postReplayStore,
    mandate: postMandate,
    signature: postSignature,
    revalidateMutableAuthority: revalidatorFor(postLive),
  }),
  /already been consumed/,
  "post-activation invalidation must not weaken replay protection"
);

// A mutation racing the guarded active load after a successful live predicate
// read is also detected by the second stable-version read before return.
const loadRaceLive = { slot: validSlot(), listing: null };
const loadRaceRedis = createRedisFixture();
const loadRaceReplayStore = createRedisRecoveryMandateReplayStore(loadRaceRedis);
const loadRaceMandate = makeMandate({
  mandateId: "mandate-active-load-race",
  nonce: "runtime-active-load-race",
});
const loadRaceSignature = await prepare(loadRaceRedis, loadRaceMandate);
await activateFixture({
  redis: loadRaceRedis,
  replayStore: loadRaceReplayStore,
  mandate: loadRaceMandate,
  signature: loadRaceSignature,
  revalidateMutableAuthority: revalidatorFor(loadRaceLive),
});
let activeLoadValidationCount = 0;
await assert.rejects(
  loadActiveRecoveryMandate({
    store: loadRaceRedis,
    authorityBoundaryStore: loadRaceRedis,
    mandateId: loadRaceMandate.mandateId,
    ownerId: loadRaceMandate.ownerId,
    revalidateMutableAuthority: revalidatorFor(loadRaceLive, async () => {
      activeLoadValidationCount += 1;
      await withRecoveryMandateAuthorityMutation({
        store: loadRaceRedis,
        bookingSerial: SERIAL,
        mutate: async () => {
          loadRaceLive.listing = activeListing();
        },
      });
    }),
  }),
  /changed while validating the active recovery mandate/,
  "mutation after successful live revalidation must fail before guarded load returns"
);
assert.equal(activeLoadValidationCount, 1);

// Static non-bypass checks for production seams.
const prepareRoute = readFileSync(
  new URL("../app/api/ledger/recovery-mandate/prepare/route.ts", import.meta.url),
  "utf8"
);
const activateRoute = readFileSync(
  new URL("../app/api/ledger/recovery-mandate/activate/route.ts", import.meta.url),
  "utf8"
);
const activationStateSource = readFileSync(
  new URL("../lib/ledger/recovery-mandate-state.ts", import.meta.url),
  "utf8"
);
const authorityBoundarySource = readFileSync(
  new URL("../lib/ledger/recovery-mandate-authority-boundary.ts", import.meta.url),
  "utf8"
);
const bookingGuardSource = readFileSync(
  new URL("../lib/ledger/recovery-mandate-booking-guard.ts", import.meta.url),
  "utf8"
);
const resaleListRoute = readFileSync(
  new URL("../app/api/resale-list/route.ts", import.meta.url),
  "utf8"
);
const resaleBuyRoute = readFileSync(
  new URL("../app/api/resale-buy/route.ts", import.meta.url),
  "utf8"
);
const freezeRoute = readFileSync(
  new URL("../app/api/freeze/route.ts", import.meta.url),
  "utf8"
);
const unfreezeRoute = readFileSync(
  new URL("../app/api/unfreeze/route.ts", import.meta.url),
  "utf8"
);
const markUsedRoute = readFileSync(
  new URL("../app/api/mark-used/route.ts", import.meta.url),
  "utf8"
);
const agentConfirmRoute = readFileSync(
  new URL("../app/api/agent/confirm/route.ts", import.meta.url),
  "utf8"
);

for (const source of [prepareRoute, activateRoute]) {
  assert.doesNotMatch(source, /mintApprovalGrant|verifyApprovalGrant/);
  assert.doesNotMatch(source, /HEDERA_OPERATOR_KEY|booked-rights-approval-secret/);
}
assert.match(activateRoute, /getRedis\(\)/);
assert.match(activateRoute, /createRedisRecoveryMandateReplayStore\(redis\)/);
assert.match(activateRoute, /authorityBoundaryStore:\s*redis/);
assert.match(activateRoute, /activatePreparedRecoveryMandate/);
assert.match(activateRoute, /bookingPort\.getSlot\(serial\)/);
assert.match(activateRoute, /bookingPort\.getListing\(serial\)/);
assert.match(activateRoute, /assertRecoveryMandateLiveBookingState/);
assert.match(activateRoute, /expectedHolderAccountId/);
assert.match(activationStateSource, /await input\.revalidateMutableAuthority\(mandate\)/);
assert.match(activationStateSource, /await input\.revalidateMutableAuthority\(verified\.mandate\)/);
assert.match(activationStateSource, /readStableRecoveryMandateAuthorityVersion/);
assert.match(activationStateSource, /swapCurrentMandate/);
assert.match(activationStateSource, /predecessor: prepared.expectedCurrentMandate/);
assert.doesNotMatch(
  activationStateSource,
  /input\.store\.set\(\s*activeRecoveryMandateKey/,
  "active authority must not regress to a separate ordinary SET NX"
);
assert.match(
  activationStateSource,
  /authorityStateVersionBefore !== record\.authorityStateVersion/,
  "active loading must reject a record invalidated after activation"
);
assert.match(
  activationStateSource,
  /await input\.revalidateMutableAuthority\(mandate\)/,
  "active loading must re-read mutable booking authority"
);
assert.match(
  activationStateSource,
  /authorityStateVersionAfter !== record\.authorityStateVersion/,
  "active loading must detect mutation racing live revalidation"
);
assert.match(authorityBoundarySource, /current ~= expected/);
assert.match(authorityBoundarySource, /"NX", "EX"/);
assert.match(authorityBoundarySource, /withRecoveryMandateAuthorityMutation/);
for (const source of [
  resaleListRoute,
  resaleBuyRoute,
  freezeRoute,
  unfreezeRoute,
  markUsedRoute,
  agentConfirmRoute,
]) {
  assert.match(
    source,
    /withRecoveryMandateAuthorityMutation/,
    "booking/listing mutation surface must participate in the shared serialized authority boundary"
  );
}
assert.match(bookingGuardSource, /slot\.status !== "HELD"/);
assert.match(bookingGuardSource, /slot\.policySnapshot\.resaleAllowed/);
assert.match(bookingGuardSource, /slot\.policy\.resaleAllowed/);
assert.match(bookingGuardSource, /slot\.resaleAllowed/);
assert.match(bookingGuardSource, /slot\.listingActive \|\| listing\?\.active/);
assert.match(
  bookingGuardSource,
  /accountsEqual\(\s*slot\.holderAccountId,\s*expectedHolderAccountId\s*\)/
);
assert.match(prepareRoute, /YOURTURN_AGENT_NAME/);
assert.match(prepareRoute, /slot\.policySnapshot\.resaleAllowed/);
assert.match(prepareRoute, /slot\.holderAccountId/);
assert.match(
  prepareRoute,
  /resolveEnrolledLedgerSignerAddress\(\s*appUser\.hederaPersona\s*\)/
);
assert.match(prepareRoute, /\.strict\(\)/);
assert.doesNotMatch(prepareRoute, /ledgerSignerAddress:\s*z\./);
assert.match(prepareRoute, /signerSource:\s*"server_enrollment"/);

console.log(
  JSON.stringify(
    {
      ok: true,
      evidenceLevel: "CI_CONFIGURED",
      checks: [
        "prepared mandate is bound to authenticated owner state",
        "expected Ledger signer is resolved from server-controlled enrollment keyed by signed session persona",
        "client signer override is absent from and rejected by the strict prepare schema",
        "missing or malformed signer enrollment fails closed",
        "wrong session owner cannot activate another owner's mandate",
        "bad signature does not consume the valid mandate",
        "concurrent duplicate activation has exactly one winner",
        "active state preserves agent/serial/minimum/asset/cancellation scope",
        "Ledger-specific routes never mint or verify legacy reusable approval grants",
        "activation route instantiates the real Redis replay and authority-boundary adapters",
        "activation re-reads holder/status/booked-policy/current-policy/listing predicates before replay consumption and at final authority creation",
        "stale holder/status/provider-policy/listing each fail closed before activation",
        "accepted SEC-LEDGER-005 combined stale-state reproducer cannot activate authority",
        "booking/listing/status mutation surfaces share an odd/even serialized authority version",
        "final active creation atomically compares the validated stable version and SET NX writes authority",
        "accepted SEC-LEDGER-005 final-boundary race leaves no active authority and preserves one-shot replay",
        "SEC-LEDGER-006 post-activation serialized mutation makes the previously active mandate fail closed on guarded load",
        "guarded active load compares captured/current stable version and revalidates mutable booking predicates",
        "mutation racing guarded active revalidation is detected by the second stable-version read",
        "active record cannot be treated as authority without current boundary and live revalidation context",
      ],
      secLedger005: "CLOSED_INDEPENDENTLY",
      secLedger006: "BUILDER_REPAIRED_PENDING_INDEPENDENT_RETEST",
      postActivationMutationVersion: postMutationVersion,
      deviceProof: false,
      downstreamRecoveryExecution: false,
      claimBoundary:
        "CI now fails closed when a serialized holder/status/provider-policy/listing mutation makes an already-active Recovery Mandate stale, while preserving the SEC-LEDGER-005 activation CAS, server-controlled signer enrollment, and one-shot Redis replay. The stored active record may remain as audit evidence but guarded loading refuses it as current authority. This does not prove Ledger hardware provenance or downstream Hedera recovery enforcement.",
    },
    null,
    2
  )
);