import assert from "node:assert/strict";
import { Wallet } from "ethers";
import {
  RECOVERY_MANDATE_DOMAIN,
  buildRecoveryMandateTypedData,
  verifyRecoveryMandateAuthorization,
} from "../lib/ledger/recovery-mandate.ts";

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

async function signMandate(mandate, domain = RECOVERY_MANDATE_DOMAIN) {
  const { types, value } = buildRecoveryMandateTypedData(mandate);
  return wallet.signTypedData(domain, types, value);
}

const mandate = makeMandate();
const signature = await signMandate(mandate);
const expected = {
  ownerId: mandate.ownerId,
  agentId: mandate.agentId,
  bookingTokenId: mandate.bookingTokenId,
  bookingSerial: mandate.bookingSerial,
  allowedAction: mandate.allowedAction,
  minimumRecoveryAtomicUnits: mandate.minimumRecoveryAtomicUnits,
  settlementAsset: mandate.settlementAsset,
  cancellationAllowed: mandate.cancellationAllowed,
};

const verified = verifyRecoveryMandateAuthorization({
  mandate,
  signature,
  expectedSignerAddress: wallet.address,
  expected,
  nowUnixSeconds: NOW,
});
assert.equal(verified.recoveredSignerAddress, wallet.address);
assert.match(verified.digest, /^0x[0-9a-f]{64}$/i);

assert.throws(
  () =>
    verifyRecoveryMandateAuthorization({
      mandate: { ...mandate, bookingSerial: 194n },
      signature,
      expectedSignerAddress: wallet.address,
      expected,
      nowUnixSeconds: NOW,
    }),
  /signature signer mismatch/
);

assert.throws(
  () =>
    verifyRecoveryMandateAuthorization({
      mandate,
      signature,
      expectedSignerAddress: wallet.address,
      expected: { ...expected, agentId: "different-agent" },
      nowUnixSeconds: NOW,
    }),
  /agentId mismatch/
);

assert.throws(
  () =>
    verifyRecoveryMandateAuthorization({
      mandate,
      signature,
      expectedSignerAddress: wallet.address,
      expected,
      consumedNonces: new Set([mandate.nonce]),
      nowUnixSeconds: NOW,
    }),
  /nonce has already been consumed/
);

assert.throws(
  () =>
    verifyRecoveryMandateAuthorization({
      mandate,
      signature,
      expectedSignerAddress: wallet.address,
      expected,
      consumedMandateIds: new Set([mandate.mandateId]),
      nowUnixSeconds: NOW,
    }),
  /id has already been consumed or revoked/
);

const expiredMandate = makeMandate({
  mandateId: "mandate-expired",
  nonce: "ledger-mandate-nonce-expired",
  issuedAt: NOW - 7_200n,
  expiresAt: NOW - 1n,
});
const expiredSignature = await signMandate(expiredMandate);
assert.throws(
  () =>
    verifyRecoveryMandateAuthorization({
      mandate: expiredMandate,
      signature: expiredSignature,
      expectedSignerAddress: wallet.address,
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
assert.throws(
  () =>
    verifyRecoveryMandateAuthorization({
      mandate: futureMandate,
      signature: futureSignature,
      expectedSignerAddress: wallet.address,
      nowUnixSeconds: NOW,
    }),
  /issuedAt is too far in the future/
);

const wrongDomainSignature = await signMandate(mandate, {
  ...RECOVERY_MANDATE_DOMAIN,
  chainId: 295,
});
assert.throws(
  () =>
    verifyRecoveryMandateAuthorization({
      mandate,
      signature: wrongDomainSignature,
      expectedSignerAddress: wallet.address,
      expected,
      nowUnixSeconds: NOW,
    }),
  /signature signer mismatch/
);

console.log(
  JSON.stringify(
    {
      ok: true,
      evidenceLevel: "SIMULATED",
      checks: [
        "valid EIP-712 mandate verifies",
        "serial mutation rejected",
        "wrong expected agent rejected",
        "consumed nonce rejected",
        "consumed/revoked mandate id rejected",
        "expired mandate rejected",
        "future-issued mandate rejected beyond clock skew",
        "wrong EIP-712 chain domain rejected",
      ],
      deviceProof: false,
      claimBoundary:
        "Deterministic EIP-712 contract fixture only; no Ledger device approval or Hedera transaction signing is claimed.",
    },
    null,
    2
  )
);
