import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Wallet } from "ethers";
import { resolveEnrolledLedgerSignerAddress } from "../lib/ledger/ledger-signer-enrollment.ts";
import { assertRecoveryMandateLiveBookingState } from "../lib/ledger/recovery-mandate-booking-guard.ts";
import { buildRecoveryMandateTypedData } from "../lib/ledger/recovery-mandate.ts";
import { createRedisRecoveryMandateReplayStore } from "../lib/ledger/recovery-mandate-replay.ts";
import {
  activatePreparedRecoveryMandate,
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
    bookingSerial: BigInt(193),
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

function createRedisFixture() {
  const records = new Map();
  return {
    records,
    async get(key) {
      return records.get(key)?.value ?? null;
    },
    async set(key, value, options = {}) {
      if (options.nx && records.has(key)) return null;
      records.set(key, { value, options });
      return "OK";
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
    serial: 193,
    sellerAccountId: EXPECTED_HOLDER,
    askPriceHbar: 10,
    royaltyHbar: 1,
    sellerNetHbar: 9,
    active: true,
    createdAt: "2026-09-10T00:00:00.000Z",
    ...overrides,
  };
}

function revalidatorFor(liveState) {
  return async (mandate) => {
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
    expectedError,
    `${label} must fail closed before active authority exists`
  );
  await assert.rejects(
    loadActiveRecoveryMandate({
      store: redis,
      mandateId: mandate.mandateId,
      ownerId: mandate.ownerId,
    }),
    /not found|expired/,
    `${label} must not create active authority`
  );

  // Initial stale-state rejection happens before replay consumption, so fixing
  // the live predicate can still activate the already-signed mandate. This is
  // distinct from a final-boundary race, which intentionally consumes/fails.
  liveState.slot = validSlot();
  liveState.listing = null;
  const recovered = await activatePreparedRecoveryMandate({
    store: redis,
    replayStore,
    mandateId: mandate.mandateId,
    ownerId: mandate.ownerId,
    signature,
    revalidateMutableAuthority: revalidatorFor(liveState),
    nowUnixSeconds: NOW,
  });
  assert.equal(recovered.active.state, "active");
}

const redis = createRedisFixture();
const replayStore = createRedisRecoveryMandateReplayStore(redis);
const mandate = makeMandate();
await storePreparedRecoveryMandate({
  store: redis,
  mandate,
  ownerId: mandate.ownerId,
  nowUnixSeconds: NOW,
});
const signature = await sign(mandate);
const validLiveState = { slot: validSlot(), listing: null };

await assert.rejects(
  activatePreparedRecoveryMandate({
    store: redis,
    replayStore,
    mandateId: mandate.mandateId,
    ownerId: "owner-bob",
    signature,
    revalidateMutableAuthority: revalidatorFor(validLiveState),
    nowUnixSeconds: NOW,
  }),
  /does not belong/
);

const results = await Promise.allSettled([
  activatePreparedRecoveryMandate({
    store: redis,
    replayStore,
    mandateId: mandate.mandateId,
    ownerId: mandate.ownerId,
    signature,
    revalidateMutableAuthority: revalidatorFor(validLiveState),
    nowUnixSeconds: NOW,
  }),
  activatePreparedRecoveryMandate({
    store: redis,
    replayStore,
    mandateId: mandate.mandateId,
    ownerId: mandate.ownerId,
    signature,
    revalidateMutableAuthority: revalidatorFor(validLiveState),
    nowUnixSeconds: NOW,
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

const active = await loadActiveRecoveryMandate({
  store: redis,
  mandateId: mandate.mandateId,
  ownerId: mandate.ownerId,
});
assert.equal(active.record.state, "active");
assert.equal(active.mandate.agentId, "yourturn-concierge");
assert.equal(active.mandate.bookingSerial, BigInt(193));
assert.equal(active.mandate.minimumRecoveryAtomicUnits, BigInt(40_000_000));
assert.equal(active.mandate.settlementAsset, "0.0.429274");
assert.equal(active.mandate.cancellationAllowed, false);

const badSignatureMandate = makeMandate({
  mandateId: "mandate-runtime-bad-signature",
  nonce: "runtime-nonce-bad-signature",
});
await storePreparedRecoveryMandate({
  store: redis,
  mandate: badSignatureMandate,
  ownerId: badSignatureMandate.ownerId,
  nowUnixSeconds: NOW,
});
const badTyped = buildRecoveryMandateTypedData(badSignatureMandate);
const wrongSignature = await substituteWallet.signTypedData(
  badTyped.domain,
  badTyped.types,
  badTyped.value
);
await assert.rejects(
  activatePreparedRecoveryMandate({
    store: redis,
    replayStore,
    mandateId: badSignatureMandate.mandateId,
    ownerId: badSignatureMandate.ownerId,
    signature: wrongSignature,
    revalidateMutableAuthority: revalidatorFor(validLiveState),
    nowUnixSeconds: NOW,
  }),
  /signature signer mismatch/
);

const correctAfterBadSignature = await sign(badSignatureMandate);
await activatePreparedRecoveryMandate({
  store: redis,
  replayStore,
  mandateId: badSignatureMandate.mandateId,
  ownerId: badSignatureMandate.ownerId,
  signature: correctAfterBadSignature,
  revalidateMutableAuthority: revalidatorFor(validLiveState),
  nowUnixSeconds: NOW,
});

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

// Accepted SEC-LEDGER-005 reproducer shape: the booking was valid when the
// mandate was prepared/signed, then every load-bearing predicate changes.
const reproRedis = createRedisFixture();
const reproReplayStore = createRedisRecoveryMandateReplayStore(reproRedis);
const reproMandate = makeMandate({
  mandateId: "security-stale-activation-193",
  nonce: "security-stale-activation-nonce-193",
});
await storePreparedRecoveryMandate({
  store: reproRedis,
  mandate: reproMandate,
  ownerId: reproMandate.ownerId,
  nowUnixSeconds: NOW,
});
const reproSignature = await sign(reproMandate);
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
  activatePreparedRecoveryMandate({
    store: reproRedis,
    replayStore: reproReplayStore,
    mandateId: reproMandate.mandateId,
    ownerId: reproMandate.ownerId,
    signature: reproSignature,
    revalidateMutableAuthority: revalidatorFor(staleReproLive),
    nowUnixSeconds: NOW,
  }),
  /no longer held|policy no longer permits|active resale listing|holder changed/
);
await assert.rejects(
  loadActiveRecoveryMandate({
    store: reproRedis,
    mandateId: reproMandate.mandateId,
    ownerId: reproMandate.ownerId,
  }),
  /not found|expired/
);

// Race at the final authority boundary: first live read is valid, then a
// listing appears while signature verification/replay consumption is underway.
// The second live read must block authority creation. Because replay was
// consumed, the same signature can never be retried into a later valid state.
const raceRedis = createRedisFixture();
const raceReplayStore = createRedisRecoveryMandateReplayStore(raceRedis);
const raceMandate = makeMandate({
  mandateId: "mandate-final-revalidation-race",
  nonce: "runtime-final-revalidation-race",
});
await storePreparedRecoveryMandate({
  store: raceRedis,
  mandate: raceMandate,
  ownerId: raceMandate.ownerId,
  nowUnixSeconds: NOW,
});
const raceSignature = await sign(raceMandate);
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
  activatePreparedRecoveryMandate({
    store: raceRedis,
    replayStore: raceReplayStore,
    mandateId: raceMandate.mandateId,
    ownerId: raceMandate.ownerId,
    signature: raceSignature,
    revalidateMutableAuthority: raceRevalidator,
    nowUnixSeconds: NOW,
  }),
  /active resale listing/
);
assert.equal(raceValidationCount, 2, "activation must re-read live state at final authority creation");
await assert.rejects(
  loadActiveRecoveryMandate({
    store: raceRedis,
    mandateId: raceMandate.mandateId,
    ownerId: raceMandate.ownerId,
  }),
  /not found|expired/
);
await assert.rejects(
  activatePreparedRecoveryMandate({
    store: raceRedis,
    replayStore: raceReplayStore,
    mandateId: raceMandate.mandateId,
    ownerId: raceMandate.ownerId,
    signature: raceSignature,
    revalidateMutableAuthority: revalidatorFor(validLiveState),
    nowUnixSeconds: NOW,
  }),
  /already been consumed/,
  "a signature consumed before a final-boundary stale failure must not become reusable"
);

const prepareRoute = readFileSync(
  new URL(
    "../app/api/ledger/recovery-mandate/prepare/route.ts",
    import.meta.url
  ),
  "utf8"
);
const activateRoute = readFileSync(
  new URL(
    "../app/api/ledger/recovery-mandate/activate/route.ts",
    import.meta.url
  ),
  "utf8"
);
const activationStateSource = readFileSync(
  new URL("../lib/ledger/recovery-mandate-state.ts", import.meta.url),
  "utf8"
);
const bookingGuardSource = readFileSync(
  new URL("../lib/ledger/recovery-mandate-booking-guard.ts", import.meta.url),
  "utf8"
);
for (const source of [prepareRoute, activateRoute]) {
  assert.doesNotMatch(source, /mintApprovalGrant|verifyApprovalGrant/);
  assert.doesNotMatch(source, /HEDERA_OPERATOR_KEY|booked-rights-approval-secret/);
}
assert.match(activateRoute, /getRedis\(\)/);
assert.match(activateRoute, /createRedisRecoveryMandateReplayStore\(redis\)/);
assert.match(activateRoute, /activatePreparedRecoveryMandate/);
assert.match(activateRoute, /bookingPort\.getSlot\(serial\)/);
assert.match(activateRoute, /bookingPort\.getListing\(serial\)/);
assert.match(activateRoute, /assertRecoveryMandateLiveBookingState/);
assert.match(activateRoute, /expectedHolderAccountId/);
assert.match(activationStateSource, /await input\.revalidateMutableAuthority\(mandate\)/);
assert.match(activationStateSource, /await input\.revalidateMutableAuthority\(verified\.mandate\)/);
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
  /resolveEnrolledLedgerSignerAddress\(\s*appUser\.hederaPersona\s*\)/,
  "prepare must resolve the expected signer from authenticated server-side enrollment"
);
assert.match(
  prepareRoute,
  /\.strict\(\)/,
  "prepare request schema must reject unknown signer-override fields"
);
assert.doesNotMatch(
  prepareRoute,
  /ledgerSignerAddress:\s*z\./,
  "prepare request must not accept ledgerSignerAddress from the client"
);
assert.match(
  prepareRoute,
  /signerSource:\s*"server_enrollment"/,
  "prepared evidence should expose that signer identity came from server enrollment"
);

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
        "activation route instantiates the real Redis adapter at the authority boundary",
        "activation re-reads holder/status/booked-policy/current-policy/listing predicates before replay consumption and immediately before active authority creation",
        "stale holder fails closed with no active authority",
        "stale held/transferable status fails closed with no active authority",
        "stale provider resale policy fails closed with no active authority",
        "conflicting active listing fails closed with no active authority",
        "accepted SEC-LEDGER-005 combined stale-state reproducer no longer activates authority",
        "a final-boundary state race consumes the one-shot signature but never creates authority or permits retry",
      ],
      deviceProof: false,
      downstreamRecoveryExecution: false,
      claimBoundary:
        "CI proves stale prepared booking authority cannot activate across holder/status/provider-policy/listing changes while preserving the dedicated Redis one-shot path and server-controlled signer enrollment. It does not prove Ledger hardware provenance or that active mandate state is yet consumed by Hedera recovery execution.",
    },
    null,
    2
  )
);
