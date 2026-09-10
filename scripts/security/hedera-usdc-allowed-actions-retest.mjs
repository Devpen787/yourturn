import assert from "node:assert/strict";
import { Transaction, TransferTransaction } from "@hiero-ledger/sdk";
import { preparePolicyAuthorizedUsdcRecovery } from "../../lib/hedera-agent-kit/policy-authorized-usdc-recovery.ts";
import {
  HEDERA_TESTNET_USDC_TOKEN_ID,
  HEDERA_USDC_DECIMALS,
  HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS,
  validateAtomicUsdcRecoveryTransaction,
} from "../../lib/hedera-agent-kit/usdc-recovery-semantics.ts";

const nowMs = Date.parse("2026-09-10T14:20:00Z");
const bookingTokenId = "0.0.2001";
const holderAccountId = "0.0.1001";
const spenderAccountId = "0.0.1002";
const receiverAccountId = "0.0.1003";
const agentAccountId = "0.0.1004";
const serial = 7;

function nonceStore() {
  let reservations = 0;
  return {
    get reservations() {
      return reservations;
    },
    async reserve() {
      reservations += 1;
      return "claimed";
    },
  };
}

function delegation(allowedActions) {
  return {
    delegationId: "security-usdc-allowed-actions-retest",
    delegatedAgentAccountId: agentAccountId,
    spenderAccountId,
    tokenId: bookingTokenId,
    serial,
    holderAccountId,
    // Deliberately supply JSON-shaped runtime values rather than relying on TS typing.
    allowedActions,
    minimumRecovery: {
      asset: { kind: "HTS", tokenId: HEDERA_TESTNET_USDC_TOKEN_ID },
      atomicUnits: HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS,
    },
    expiresAtMs: nowMs + 60 * 60 * 1000,
    cancellationAllowed: false,
    providerPolicyId: "provider-usdc-v1",
    revokedAtMs: null,
  };
}

function invocation(nonce) {
  return {
    agentAccountId,
    currentHolderAccountId: holderAccountId,
    action: "RECOVER",
    nonce,
    providerPolicy: { id: "provider-usdc-v1", state: "ALLOW" },
    recovery: {
      asset: { kind: "HTS", tokenId: HEDERA_TESTNET_USDC_TOKEN_ID },
      atomicUnits: HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS,
    },
    receiverAccountId,
  };
}

const malformedCases = [
  ["original substring exploit", "NOT_RECOVER_ALLOWED"],
  ["bare action string", "RECOVER"],
  ["null", null],
  ["plain object", {}],
  ["array-like object", { 0: "RECOVER", length: 1 }],
  ["unknown member", ["ADMIN"]],
  ["mixed valid + unknown", ["RECOVER", "ADMIN"]],
  ["mixed valid + null", ["RECOVER", null]],
  ["wrong case", ["recover"]],
  ["non-string member", [1]],
];

const malformedResults = [];
for (let index = 0; index < malformedCases.length; index += 1) {
  const [label, allowedActions] = malformedCases[index];
  const store = nonceStore();
  const result = await preparePolicyAuthorizedUsdcRecovery({
    delegation: delegation(allowedActions),
    invocation: invocation(`malformed-${index + 1}`),
    nonceStore: store,
    now: () => nowMs,
  });

  assert.equal(result.ok, false, `${label}: malformed allowedActions unexpectedly authorized`);
  assert.equal(result.decision.outcome, "BLOCK", `${label}: expected BLOCK`);
  assert.equal(result.decision.reason, "INVALID_DELEGATION", `${label}: expected INVALID_DELEGATION`);
  assert.equal(result.transactionBytesProduced, false, `${label}: transaction bytes produced`);
  assert.equal(store.reservations, 0, `${label}: nonce was reserved before rejection`);

  malformedResults.push({ label, blocked: true, nonceReservations: store.reservations });
}

// A syntactically valid action array that omits RECOVER remains a normal authorization denial,
// not a malformed-delegation bypass.
const disallowedStore = nonceStore();
const disallowed = await preparePolicyAuthorizedUsdcRecovery({
  delegation: delegation(["DELEGATE"]),
  invocation: invocation("disallowed-001"),
  nonceStore: disallowedStore,
  now: () => nowMs,
});
assert.equal(disallowed.ok, false);
assert.equal(disallowed.decision.reason, "ACTION_NOT_ALLOWED");
assert.equal(disallowed.transactionBytesProduced, false);
assert.equal(disallowedStore.reservations, 0);

// Positive control: exact runtime ['RECOVER'] still reaches the bounded one-NFT + one-USDC bytes.
const allowStore = nonceStore();
const allowed = await preparePolicyAuthorizedUsdcRecovery({
  delegation: delegation(["RECOVER"]),
  invocation: invocation("allowed-001"),
  nonceStore: allowStore,
  now: () => nowMs,
});
assert.equal(allowed.ok, true);
assert.equal(allowed.decision.outcome, "ALLOW");
assert.equal(allowed.decision.reason, "ALLOW");
assert.equal(allowed.transactionBytesProduced, true);
assert.equal(allowStore.reservations, 1);
assert.equal(allowed.envelope.signed, false);
assert.equal(allowed.envelope.submitted, false);

const decoded = Transaction.fromBytes(Buffer.from(allowed.envelope.bytesBase64, "base64"));
assert.ok(decoded instanceof TransferTransaction);
validateAtomicUsdcRecoveryTransaction(decoded, {
  bookingTokenId,
  serial,
  holderAccountId,
  spenderAccountId,
  receiverAccountId,
  settlementTokenId: HEDERA_TESTNET_USDC_TOKEN_ID,
  settlementAmountAtomicUnits: HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS,
  settlementRecipientAccountId: holderAccountId,
  settlementDecimals: HEDERA_USDC_DECIMALS,
});

console.log(
  JSON.stringify(
    {
      ok: true,
      finding: "SEC-HEDERA-007",
      originalSubstringBypassClosed: true,
      malformedCasesRejectedBeforeNonce: malformedResults.length,
      malformedResults,
      validButDisallowedActionStillBlocked: true,
      positiveRecoverStillFunctional: true,
      positiveNonceReservations: allowStore.reservations,
      decodedTransactionType: "TransferTransaction",
      exactBookingNftAndUsdcSemanticsValidated: true,
      signed: false,
      submitted: false,
      networkMutation: false,
    },
    null,
    2
  )
);
