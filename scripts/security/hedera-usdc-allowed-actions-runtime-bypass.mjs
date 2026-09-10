import assert from "node:assert/strict";
import { Transaction, TransferTransaction } from "@hiero-ledger/sdk";
import { preparePolicyAuthorizedUsdcRecovery } from "../../lib/hedera-agent-kit/policy-authorized-usdc-recovery.ts";
import {
  HEDERA_TESTNET_USDC_TOKEN_ID,
  HEDERA_USDC_DECIMALS,
  HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS,
  validateAtomicUsdcRecoveryTransaction,
} from "../../lib/hedera-agent-kit/usdc-recovery-semantics.ts";

const nowMs = Date.parse("2026-09-10T12:00:00Z");
const bookingTokenId = "0.0.2001";
const holderAccountId = "0.0.1001";
const spenderAccountId = "0.0.1002";
const receiverAccountId = "0.0.1003";
const agentAccountId = "0.0.1004";
const serial = 7;

function store() {
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
    delegationId: "security-usdc-allowed-actions",
    delegatedAgentAccountId: agentAccountId,
    spenderAccountId,
    tokenId: bookingTokenId,
    serial,
    holderAccountId,
    // Deliberately bypass the compile-time union with a JSON-shaped runtime value.
    // This is exactly what deserialized/persisted state can do at runtime.
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

// Control: a well-formed action array that does not contain RECOVER is blocked.
const controlStore = store();
const control = await preparePolicyAuthorizedUsdcRecovery({
  delegation: delegation(["DELEGATE"]),
  invocation: invocation("control-001"),
  nonceStore: controlStore,
  now: () => nowMs,
});
assert.equal(control.ok, false);
assert.equal(control.decision.reason, "ACTION_NOT_ALLOWED");
assert.equal(control.transactionBytesProduced, false);
assert.equal(controlStore.reservations, 0);

// Attack: allowedActions is only TypeScript-typed, not runtime validated. A JSON
// string has String.prototype.includes(), so a malformed value whose text merely
// contains "RECOVER" is treated as if the holder explicitly approved RECOVER.
const attackStore = store();
const attack = await preparePolicyAuthorizedUsdcRecovery({
  delegation: delegation("NOT_RECOVER_ALLOWED"),
  invocation: invocation("attack-001"),
  nonceStore: attackStore,
  now: () => nowMs,
});

assert.equal(attack.ok, true, "malformed allowedActions string unexpectedly failed closed");
assert.equal(attack.transactionBytesProduced, true);
assert.equal(attack.decision.reason, "ALLOW");
assert.equal(attackStore.reservations, 1);

const decoded = Transaction.fromBytes(Buffer.from(attack.envelope.bytesBase64, "base64"));
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
      reproduced: true,
      issue: "runtime_allowed_actions_string_substring_bypass",
      malformedAllowedActions: "NOT_RECOVER_ALLOWED",
      action: "RECOVER",
      policyOutcome: attack.decision.outcome,
      policyReason: attack.decision.reason,
      nonceReserved: attackStore.reservations === 1,
      transactionBytesProduced: attack.transactionBytesProduced,
      decodedTransactionType: "TransferTransaction",
      containsExactBookingNftAndUsdcSettlement: true,
      signed: false,
      submitted: false,
      networkMutation: false,
    },
    null,
    2
  )
);
