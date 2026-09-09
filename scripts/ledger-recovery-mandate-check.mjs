import assert from "node:assert/strict";
import { Wallet } from "ethers";
import {
  RECOVERY_MANDATE_DOMAIN,
  authorizeRecoveryMandateOnce,
  buildRecoveryMandateTypedData,
  verifyRecoveryMandateSignature,
} from "../lib/ledger/recovery-mandate.ts";
import { createRedisRecoveryMandateReplayStore } from "../lib/ledger/recovery-mandate-replay.ts";

const NOW = 1_800_000_000n;
const TEST_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412b95e0d3dc89116";
const wallet = new Wallet(TEST_PRIVATE_KEY);

function makeMandate(overrides = {}) {
  return {
    mandateId: "mandate-193-v1",
    ownerId: "owner-alice",
    ledgerSignerAddress: wallet.address,
    agentId: "alice-concierge",
    bookingTokenId: "0.0.700001",
    bookingSerial: 193n,
    allowedAction: "resale",
    minimumRecoveryAtomicUnits: 40_000_000n,
    settlementAsset: "0.0.429274",
    expiresAt: NOW + 3_600n,
    nonce: "ledger-mandate-nonce-001",
    cancellationAllowed: false,
    issuedAt: NOW - 60n,
    ...overrides,
  };
}

function expectationFor(mandate) {
  return {
    mandateId: mandate.mandateId,
    ownerId: mandate.ownerId,
    agentId: mandate.agentId,
    bookingTokenId: mandate.bookingTokenId,
    bookingSerial: mandate.bookingSerial,
    allowedAction: mandate.allowedAction,
    minimumRecoveryAtomicUnits: mandate.minimumRecoveryAtomicUnits,
    settlementAsset: mandate.settlementAsset,
    expiresAt: mandate.expiresAt,
    nonce: mandate.nonce,
    cancellationAllowed: mandate.cancellationAllowed,
    issuedAt: mandate.issuedAt,
  };
}

async function signMandate(mandate, domain = RECOVERY_MANDATE_DOMAIN) {
  const { types, value } = buildRecoveryMandateTypedData(mandate);
  return wallet.signTypedData(domain, types, value);
}

function createAtomicRedisFixture() {
  const records = new Map();
  return {
    records,
    async set(key, value, options) {
      assert.equal(options?.nx, true, "replay marker must use SET NX");
      assert.ok(
        Number.isInteger(options?.ex) && options.ex > 0,
        "replay marker must expire with the mandate"
      );
      if (records.has(key)) return null;
      records.set(key, { value, options });
      return "OK";
    },
  };
}

function createReplayStore() {
  return createRedisRecoveryMandateReplayStore(createAtomicRedisFixture());
}

const mandate = makeMandate();
const signature = await signMandate(mandate);
const expected = expectationFor(mandate);

const signatureOnly = verifyRecoveryMandateSignature({
  mandate,
  signature,
  expectedSignerAddress: wallet.address,
  nowUnixSeconds: NOW,
});
assert.equal(signatureOnly.recoveredSignerAddress, wallet.address);
assert.match(signatureOnly.digest, /^0x[0-9a-f]{64}$/i);

const replayStore = createReplayStore();
const verified = await authorizeRecoveryMandateOnce({
  mandate,
  signature,
  expectedSignerAddress: wallet.address,
  expected,
  replayStore,
  nowUnixSeconds: NOW,
});
assert.equal(verified.recoveredSignerAddress, wallet.address);

await assert.rejects(
  authorizeRecoveryMandateOnce({
    mandate,
    signature,
    expectedSignerAddress: wallet.address,
    expected,
    replayStore,
    nowUnixSeconds: NOW,
  }),
  /already been consumed/
);

await assert.rejects(
  authorizeRecoveryMandateOnce({
    mandate: { ...mandate, bookingSerial: 194n },
    signature,
    expectedSignerAddress: wallet.address,
    expected,
    replayStore: createReplayStore(),
    nowUnixSeconds: NOW,
  }),
  /signature signer mismatch/
);

await assert.rejects(
  authorizeRecoveryMandateOnce({
    mandate,
    signature,
    expectedSignerAddress: wallet.address,
    expected: { ...expected, agentId: "different-agent" },
    replayStore: createReplayStore(),
    nowUnixSeconds: NOW,
  }),
  /agentId mismatch/
);

await assert.rejects(
  authorizeRecoveryMandateOnce({
    mandate,
    signature,
    expectedSignerAddress: wallet.address,
    expected: { ...expected, expiresAt: expected.expiresAt + 1n },
    replayStore: createReplayStore(),
    nowUnixSeconds: NOW,
  }),
  /expiresAt mismatch/
);

await assert.rejects(
  authorizeRecoveryMandateOnce({
    mandate,
    signature,
    expectedSignerAddress: wallet.address,
    expected: { ...expected, nonce: "different-nonce" },
    replayStore: createReplayStore(),
    nowUnixSeconds: NOW,
  }),
  /nonce mismatch/
);

const incompleteExpected = { ...expected };
delete incompleteExpected.minimumRecoveryAtomicUnits;
await assert.rejects(
  authorizeRecoveryMandateOnce({
    mandate,
    signature,
    expectedSignerAddress: wallet.address,
    expected: incompleteExpected,
    replayStore: createReplayStore(),
    nowUnixSeconds: NOW,
  }),
  /expectation minimumRecoveryAtomicUnits is required/
);

const expiredMandate = makeMandate({
  mandateId: "mandate-expired",
  nonce: "ledger-mandate-nonce-expired",
  issuedAt: NOW - 7_200n,
  expiresAt: NOW - 1n,
});
const expiredSignature = await signMandate(expiredMandate);
await assert.rejects(
  authorizeRecoveryMandateOnce({
    mandate: expiredMandate,
    signature: expiredSignature,
    expectedSignerAddress: wallet.address,
    expected: expectationFor(expiredMandate),
    replayStore: createReplayStore(),
    nowUnixSeconds: NOW,
  }),
  /has expired/
);

const futureMandate = makeMandate({
  mandateId: "mandate-future",
  nonce: "ledger-mandate-nonce-future",
  issuedAt: NOW + 301n,
  expiresAt: NOW + 7_200n,
});
const futureSignature = await signMandate(futureMandate);
await assert.rejects(
  authorizeRecoveryMandateOnce({
    mandate: futureMandate,
    signature: futureSignature,
    expectedSignerAddress: wallet.address,
    expected: expectationFor(futureMandate),
    replayStore: createReplayStore(),
    nowUnixSeconds: NOW,
  }),
  /issuedAt is too far in the future/
);

const wrongDomainSignature = await signMandate(mandate, {
  ...RECOVERY_MANDATE_DOMAIN,
  chainId: 295,
});
await assert.rejects(
  authorizeRecoveryMandateOnce({
    mandate,
    signature: wrongDomainSignature,
    expectedSignerAddress: wallet.address,
    expected,
    replayStore: createReplayStore(),
    nowUnixSeconds: NOW,
  }),
  /signature signer mismatch/
);

const concurrentMandate = makeMandate({
  mandateId: "mandate-concurrent",
  nonce: "ledger-mandate-nonce-concurrent",
});
const concurrentSignature = await signMandate(concurrentMandate);
const concurrentExpected = expectationFor(concurrentMandate);
const concurrentReplayStore = createReplayStore();
const concurrentResults = await Promise.allSettled([
  authorizeRecoveryMandateOnce({
    mandate: concurrentMandate,
    signature: concurrentSignature,
    expectedSignerAddress: wallet.address,
    expected: concurrentExpected,
    replayStore: concurrentReplayStore,
    nowUnixSeconds: NOW,
  }),
  authorizeRecoveryMandateOnce({
    mandate: concurrentMandate,
    signature: concurrentSignature,
    expectedSignerAddress: wallet.address,
    expected: concurrentExpected,
    replayStore: concurrentReplayStore,
    nowUnixSeconds: NOW,
  }),
]);
assert.equal(
  concurrentResults.filter((result) => result.status === "fulfilled").length,
  1,
  "exactly one concurrent authorization may consume a mandate"
);
assert.equal(
  concurrentResults.filter((result) => result.status === "rejected").length,
  1,
  "the duplicate concurrent authorization must fail"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      evidenceLevel: "CI_SIMULATED",
      checks: [
        "signature verification is separate from runtime authorization",
        "complete mandate expectation is mandatory for authorization",
        "agent, serial, minimum, asset, expiry and nonce remain load-bearing",
        "atomic SET NX replay claim allows exactly one concurrent authorization",
        "same signed mandate cannot be authorized twice",
        "serial mutation rejected",
        "wrong expected agent rejected",
        "missing required expectation rejected",
        "expired mandate rejected",
        "future-issued mandate rejected beyond clock skew",
        "wrong EIP-712 chain domain rejected",
      ],
      durableReplayStore: "Upstash Redis SET NX marker keyed by mandateId+nonce until expiry",
      deviceProof: false,
      claimBoundary:
        "EIP-712 authorization/replay contract is CI-backed, but no Ledger device approval/rejection or Hedera transaction signing is claimed.",
    },
    null,
    2
  )
);
