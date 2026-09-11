import assert from "node:assert/strict";
import { Wallet } from "ethers";
import {
  readStableRecoveryMandateAuthorityVersion,
  recoveryMandateAuthorityVersionKey,
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

const NOW = 1_800_000_000n;
const SERIAL = 193;
const EXPECTED_HOLDER = "0.0.1001";
const OTHER_HOLDER = "0.0.1002";
const wallet = new Wallet(
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412b95e0d3dc89116"
);

function createRedisFixture() {
  const records = new Map();
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
      if (keys.length === 1 && args.length === 0) {
        const current = Number(records.get(keys[0])?.value ?? 0);
        if (!Number.isSafeInteger(current)) return -2;
        if (current % 2 !== 0) return -1;
        const next = current + 1;
        records.set(keys[0], { value: String(next), options: {} });
        return next;
      }
      if (keys.length === 1 && args.length === 1) {
        const current = Number(records.get(keys[0])?.value ?? 0);
        const expected = Number(args[0]);
        if (current !== expected || current % 2 === 0) return -1;
        const next = current + 1;
        records.set(keys[0], { value: String(next), options: {} });
        return next;
      }
      if (keys.length === 2 && args.length === 3) {
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
      throw new Error("unexpected Redis eval shape");
    },
  };
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
    serial: SERIAL,
    sellerAccountId: EXPECTED_HOLDER,
    askPriceHbar: 10,
    royaltyHbar: 1,
    sellerNetHbar: 9,
    active: true,
    createdAt: "2026-09-10T00:00:00.000Z",
  };
}

function makeMandate(suffix) {
  return {
    mandateId: `sec-ledger-006-${suffix}`,
    ownerId: "owner-alice",
    ledgerSignerAddress: wallet.address,
    agentId: "yourturn-concierge",
    bookingTokenId: "0.0.700001",
    bookingSerial: BigInt(SERIAL),
    allowedAction: "resale",
    minimumRecoveryAtomicUnits: 40_000_000n,
    settlementAsset: "0.0.429274",
    expiresAt: NOW + 3_600n,
    nonce: `sec-ledger-006-nonce-${suffix}`,
    cancellationAllowed: false,
    issuedAt: NOW - 30n,
  };
}

function revalidator(live, afterValidation) {
  return async (mandate) => {
    assertRecoveryMandateLiveBookingState({
      mandate,
      live: {
        slot: live.slot,
        listing: live.listing,
        expectedHolderAccountId: EXPECTED_HOLDER,
      },
    });
    if (afterValidation) await afterValidation();
  };
}

async function activateFresh(suffix) {
  const redis = createRedisFixture();
  const replayStore = createRedisRecoveryMandateReplayStore(redis);
  const mandate = makeMandate(suffix);
  const live = { slot: validSlot(), listing: null };
  await storePreparedRecoveryMandate({
    store: redis,
    mandate,
    ownerId: mandate.ownerId,
    nowUnixSeconds: NOW,
  });
  const typed = buildRecoveryMandateTypedData(mandate);
  const signature = await wallet.signTypedData(typed.domain, typed.types, typed.value);
  const activated = await activatePreparedRecoveryMandate({
    store: redis,
    authorityBoundaryStore: redis,
    replayStore,
    mandateId: mandate.mandateId,
    ownerId: mandate.ownerId,
    signature,
    revalidateMutableAuthority: revalidator(live),
    nowUnixSeconds: NOW,
  });
  assert.equal(activated.active.state, "active");
  assert.equal(activated.active.authorityStateVersion, 0);
  return { redis, replayStore, mandate, signature, live };
}

async function guardedLoad(ctx, validate = revalidator(ctx.live)) {
  return loadActiveRecoveryMandate({
    store: ctx.redis,
    authorityBoundaryStore: ctx.redis,
    mandateId: ctx.mandate.mandateId,
    ownerId: ctx.mandate.ownerId,
    revalidateMutableAuthority: validate,
  });
}

// Positive control: a freshly activated mandate at unchanged stable v0 loads.
{
  const ctx = await activateFresh("positive");
  const loaded = await guardedLoad(ctx);
  assert.equal(loaded.record.state, "active");
  assert.equal(loaded.record.authorityStateVersion, 0);
}

// Accepted SEC-LEDGER-006 shape: active@v0 -> serialized relevant mutation -> v2 -> load.
// The stale active Redis record may physically remain, but it must not be loadable as authority.
{
  const ctx = await activateFresh("post-mutation");
  await withRecoveryMandateAuthorityMutation({
    store: ctx.redis,
    bookingSerial: SERIAL,
    mutate: async () => {
      ctx.live.listing = activeListing();
      ctx.live.slot = validSlot({ listingActive: true });
    },
  });
  assert.equal(
    await readStableRecoveryMandateAuthorityVersion({ store: ctx.redis, bookingSerial: SERIAL }),
    2
  );
  assert.ok(await ctx.redis.get(activeRecoveryMandateKey(ctx.mandate.mandateId)));
  await assert.rejects(
    guardedLoad(ctx),
    /stale because booking authority state changed after activation/,
    "post-activation serialized mutation must make the old active record unusable"
  );
}

// Race inside live revalidation: mutation begins and completes after predicates are read.
// The second version read must catch it before authority is returned.
{
  const ctx = await activateFresh("during-revalidation");
  await assert.rejects(
    guardedLoad(
      ctx,
      revalidator(ctx.live, async () => {
        await withRecoveryMandateAuthorityMutation({
          store: ctx.redis,
          bookingSerial: SERIAL,
          mutate: async () => {
            ctx.live.listing = activeListing();
            ctx.live.slot = validSlot({ listingActive: true });
          },
        });
      })
    ),
    /changed while validating the active recovery mandate/,
    "mutation during guarded live validation must fail closed"
  );
}

// Odd/in-flight authority versions must fail closed and never reach live validation.
{
  const ctx = await activateFresh("odd-version");
  const versionKey = recoveryMandateAuthorityVersionKey(SERIAL);
  ctx.redis.records.set(versionKey, { value: "1", options: {} });
  let validationCalls = 0;
  await assert.rejects(
    guardedLoad(ctx, async () => {
      validationCalls += 1;
    }),
    /Booking authority state is changing/,
    "odd authority version must be rejected"
  );
  assert.equal(validationCalls, 0);
}

// Missing current-authority context is not a supported bypass.
{
  const ctx = await activateFresh("missing-context");
  await assert.rejects(
    loadActiveRecoveryMandate({
      store: ctx.redis,
      mandateId: ctx.mandate.mandateId,
      ownerId: ctx.mandate.ownerId,
      revalidateMutableAuthority: revalidator(ctx.live),
    }),
    /requires the authoritative booking state boundary/
  );
  await assert.rejects(
    loadActiveRecoveryMandate({
      store: ctx.redis,
      authorityBoundaryStore: ctx.redis,
      mandateId: ctx.mandate.mandateId,
      ownerId: ctx.mandate.ownerId,
    }),
    /requires live booking authority revalidation/
  );
}

// Even without a version change, fresh mutable predicates must still reject stale state.
for (const [label, mutate, expected] of [
  ["holder", (live) => { live.slot = validSlot({ holderAccountId: OTHER_HOLDER }); }, /holder changed/],
  ["status", (live) => { live.slot = validSlot({ status: "AVAILABLE", holderAccountId: null }); }, /no longer held and transferable/],
  ["provider-policy", (live) => { live.slot = validSlot({ resaleAllowed: false, policy: { ...policy, resaleAllowed: false, version: 2 } }); }, /policy no longer permits/],
  ["listing", (live) => { live.listing = activeListing(); }, /active resale listing/],
]) {
  const ctx = await activateFresh(`live-${label}`);
  mutate(ctx.live);
  await assert.rejects(
    guardedLoad(ctx),
    expected,
    `${label} drift must reject active authority even if version metadata did not move`
  );
}

// One-shot replay stays consumed after a valid activation.
{
  const ctx = await activateFresh("replay");
  await assert.rejects(
    activatePreparedRecoveryMandate({
      store: ctx.redis,
      authorityBoundaryStore: ctx.redis,
      replayStore: ctx.replayStore,
      mandateId: ctx.mandate.mandateId,
      ownerId: ctx.mandate.ownerId,
      signature: ctx.signature,
      revalidateMutableAuthority: revalidator(ctx.live),
      nowUnixSeconds: NOW,
    }),
    /already consumed|replay|already exists|could not be stored/i,
    "an activated one-shot mandate must not reactivate"
  );
}

console.log(JSON.stringify({
  secLedger006: "retest-passed",
  acceptedRaceClosed: true,
  postActivationMutationRejected: true,
  mutationDuringRevalidationRejected: true,
  oddVersionRejected: true,
  missingContextRejected: true,
  staleHolderStatusProviderListingRejected: true,
  replayStillOneShot: true,
  liveDeviceEvidence: false,
}));
