import assert from "node:assert/strict";
import { Transaction, TransferTransaction } from "@hiero-ledger/sdk";
import {
  BookingRightDelegationPolicy,
} from "../lib/hedera-agent-kit/booking-right-delegation-policy.ts";
import {
  YOURTURN_DELEGATED_RECOVERY_SETTLE_USDC_TOOL,
  createDelegatedRecoveryReturnBytesRuntime,
} from "../lib/hedera-agent-kit/delegated-recovery-plugin.ts";
import { preparePolicyAuthorizedUsdcRecovery } from "../lib/hedera-agent-kit/policy-authorized-usdc-recovery.ts";
import {
  HEDERA_TESTNET_USDC_TOKEN_ID,
  HEDERA_USDC_DECIMALS,
  HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS,
  validateAtomicUsdcRecoveryTransaction,
} from "../lib/hedera-agent-kit/usdc-recovery-semantics.ts";

const nowMs = Date.parse("2026-09-10T12:00:00Z");
const bookingTokenId = "0.0.2001";
const holderAccountId = "0.0.1001";
const spenderAccountId = "0.0.1002";
const receiverAccountId = "0.0.1003";
const agentAccountId = "0.0.1004";
const serial = 7;

const delegation = {
  delegationId: "booking-7-usdc-v1",
  delegatedAgentAccountId: agentAccountId,
  spenderAccountId,
  tokenId: bookingTokenId,
  serial,
  holderAccountId,
  allowedActions: ["RECOVER"],
  minimumRecovery: {
    asset: { kind: "HTS", tokenId: HEDERA_TESTNET_USDC_TOKEN_ID },
    atomicUnits: HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS,
  },
  expiresAtMs: nowMs + 60 * 60 * 1000,
  cancellationAllowed: true,
  providerPolicyId: "provider-usdc-v1",
  revokedAtMs: null,
};

function invocation(nonce, amount = HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS, patch = {}) {
  return {
    agentAccountId,
    currentHolderAccountId: holderAccountId,
    action: "RECOVER",
    nonce,
    providerPolicy: { id: delegation.providerPolicyId, state: "ALLOW" },
    recovery: {
      asset: { kind: "HTS", tokenId: HEDERA_TESTNET_USDC_TOKEN_ID },
      atomicUnits: amount,
    },
    receiverAccountId,
    ...patch,
  };
}

function createStore({ unavailable = false } = {}) {
  const values = new Map();
  let reservations = 0;
  return {
    get reservations() {
      return reservations;
    },
    async reserve({ key, fingerprint }) {
      reservations += 1;
      if (unavailable) return "unavailable";
      const current = values.get(key);
      if (current === undefined) {
        values.set(key, fingerprint);
        return "claimed";
      }
      return current === fingerprint ? "duplicate" : "conflict";
    },
  };
}

function expected(amount = HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS) {
  return {
    bookingTokenId,
    serial,
    holderAccountId,
    spenderAccountId,
    receiverAccountId,
    settlementTokenId: HEDERA_TESTNET_USDC_TOKEN_ID,
    settlementAmountAtomicUnits: amount,
    settlementRecipientAccountId: holderAccountId,
    settlementDecimals: HEDERA_USDC_DECIMALS,
  };
}

const validStore = createStore();
const valid = await preparePolicyAuthorizedUsdcRecovery({
  delegation,
  invocation: invocation("valid-001"),
  nonceStore: validStore,
  now: () => nowMs,
});
assert.equal(valid.ok, true);
assert.equal(valid.transactionBytesProduced, true);
assert.equal(valid.decision.outcome, "ALLOW");
assert.equal(valid.settlement.tokenId, HEDERA_TESTNET_USDC_TOKEN_ID);
assert.equal(valid.settlement.atomicUnits, HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS);
assert.equal(valid.settlement.decimals, HEDERA_USDC_DECIMALS);
assert.equal(valid.settlement.payerAccountId, spenderAccountId);
assert.equal(valid.settlement.recipientAccountId, holderAccountId);
assert.equal(validStore.reservations, 1);

const decoded = Transaction.fromBytes(Buffer.from(valid.envelope.bytesBase64, "base64"));
assert.ok(decoded instanceof TransferTransaction);
validateAtomicUsdcRecoveryTransaction(decoded, expected());
assert.equal(decoded.hbarTransfers.size, 0);
assert.equal(decoded.nftTransfers.size, 1);
assert.equal(decoded.tokenTransfers.size, 1);

async function expectProtectedStop({
  nonce,
  amount = HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS,
  invocationPatch = {},
  store = createStore(),
  reason,
}) {
  const result = await preparePolicyAuthorizedUsdcRecovery({
    delegation,
    invocation: invocation(nonce, amount, invocationPatch),
    nonceStore: store,
    now: () => nowMs,
  });
  assert.equal(result.ok, false, `${reason} must not produce transaction bytes`);
  assert.equal(result.transactionBytesProduced, false);
  assert.equal(result.decision.reason, reason);
  return { result, store };
}

const belowStore = createStore();
await expectProtectedStop({
  nonce: "below-001",
  amount: "39999999",
  store: belowStore,
  reason: "BELOW_MINIMUM_RECOVERY",
});
assert.equal(belowStore.reservations, 0);

for (const [state, reason, outcome] of [
  ["BLOCK", "PROVIDER_POLICY_DENIED", "BLOCK"],
  ["REVIEW", "PROVIDER_POLICY_REVIEW", "ESCALATE"],
]) {
  const store = createStore();
  const { result } = await expectProtectedStop({
    nonce: `provider-${state.toLowerCase()}-001`,
    invocationPatch: {
      providerPolicy: { id: delegation.providerPolicyId, state },
    },
    store,
    reason,
  });
  assert.equal(result.decision.outcome, outcome);
  assert.equal(store.reservations, 0);
}

await assert.rejects(
  () =>
    preparePolicyAuthorizedUsdcRecovery({
      delegation: {
        ...delegation,
        minimumRecovery: {
          asset: { kind: "HTS", tokenId: HEDERA_TESTNET_USDC_TOKEN_ID },
          atomicUnits: "39999999",
        },
      },
      invocation: invocation("weak-minimum-001"),
      nonceStore: createStore(),
      now: () => nowMs,
    }),
  /minimum_below_40_usdc/
);

await assert.rejects(
  () =>
    preparePolicyAuthorizedUsdcRecovery({
      delegation,
      invocation: invocation("wrong-usdc-token-001", undefined, {
        recovery: {
          asset: { kind: "HTS", tokenId: "0.0.429275" },
          atomicUnits: HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS,
        },
      }),
      nonceStore: createStore(),
      now: () => nowMs,
    }),
  /quote_asset_mismatch/
);

async function maliciousRaw({ name, rawPatch, reason }) {
  const store = createStore();
  const resolvedInvocation = invocation(`raw-${name}-001`);
  const policy = new BookingRightDelegationPolicy(
    delegation,
    resolvedInvocation,
    store,
    () => nowMs
  );
  const runtime = createDelegatedRecoveryReturnBytesRuntime(spenderAccountId);
  try {
    runtime.context.hooks = [policy];
    const tool = runtime.tools.find(
      (candidate) => candidate.method === YOURTURN_DELEGATED_RECOVERY_SETTLE_USDC_TOOL
    );
    assert.ok(tool);
    const raw = {
      tokenId: bookingTokenId,
      serial,
      ownerAccountId: holderAccountId,
      spenderAccountId,
      receiverAccountId,
      settlementTokenId: HEDERA_TESTNET_USDC_TOKEN_ID,
      settlementAmountAtomicUnits: HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS,
      settlementRecipientAccountId: holderAccountId,
      settlementDecimals: HEDERA_USDC_DECIMALS,
      ...rawPatch,
    };
    const result = await tool.execute(runtime.client, runtime.context, raw);
    assert.equal(result.bytes instanceof Uint8Array, false, `${name} unexpectedly produced bytes`);
    assert.match(result.raw?.error ?? "", new RegExp(reason));
    assert.equal(store.reservations, 0, `${name} must fail before nonce reservation`);
  } finally {
    runtime.client.close();
  }
}

for (const [name, rawPatch, reason] of [
  ["wrong-booking-token", { tokenId: "0.0.2999" }, "TOKEN_MISMATCH"],
  ["wrong-serial", { serial: 8 }, "SERIAL_MISMATCH"],
  ["wrong-spender", { spenderAccountId: "0.0.1999" }, "SPENDER_MISMATCH"],
  ["wrong-receiver", { receiverAccountId: "0.0.1998" }, "RECEIVER_MISMATCH"],
  ["wrong-settlement-token", { settlementTokenId: "0.0.429275" }, "SETTLEMENT_TOKEN_MISMATCH"],
  ["wrong-settlement-amount", { settlementAmountAtomicUnits: "40000001" }, "SETTLEMENT_AMOUNT_MISMATCH"],
  ["wrong-settlement-recipient", { settlementRecipientAccountId: "0.0.1997" }, "SETTLEMENT_RECIPIENT_MISMATCH"],
  ["wrong-decimals", { settlementDecimals: 5 }, "SETTLEMENT_DECIMALS_MISMATCH"],
]) {
  await maliciousRaw({ name, rawPatch, reason });
}

const replayStore = createStore();
const first = await preparePolicyAuthorizedUsdcRecovery({
  delegation,
  invocation: invocation("replay-001"),
  nonceStore: replayStore,
  now: () => nowMs,
});
assert.equal(first.ok, true);
const duplicate = await preparePolicyAuthorizedUsdcRecovery({
  delegation,
  invocation: invocation("replay-001"),
  nonceStore: replayStore,
  now: () => nowMs,
});
assert.equal(duplicate.ok, false);
assert.equal(duplicate.decision.reason, "IDEMPOTENT_REPLAY");
assert.equal(duplicate.transactionBytesProduced, false);

const conflict = await preparePolicyAuthorizedUsdcRecovery({
  delegation,
  invocation: invocation("replay-001", "41000000"),
  nonceStore: replayStore,
  now: () => nowMs,
});
assert.equal(conflict.ok, false);
assert.equal(conflict.decision.reason, "NONCE_CONFLICT");
assert.equal(conflict.transactionBytesProduced, false);

const concurrentStore = createStore();
const concurrent = await Promise.all([
  preparePolicyAuthorizedUsdcRecovery({
    delegation,
    invocation: invocation("concurrent-001"),
    nonceStore: concurrentStore,
    now: () => nowMs,
  }),
  preparePolicyAuthorizedUsdcRecovery({
    delegation,
    invocation: invocation("concurrent-001"),
    nonceStore: concurrentStore,
    now: () => nowMs,
  }),
]);
assert.equal(concurrent.filter((result) => result.ok).length, 1);
assert.equal(
  concurrent.filter(
    (result) => !result.ok && result.decision.reason === "IDEMPOTENT_REPLAY"
  ).length,
  1
);

const unavailable = await preparePolicyAuthorizedUsdcRecovery({
  delegation,
  invocation: invocation("store-down-001"),
  nonceStore: createStore({ unavailable: true }),
  now: () => nowMs,
});
assert.equal(unavailable.ok, false);
assert.equal(unavailable.decision.reason, "REPLAY_STORE_UNAVAILABLE");
assert.equal(unavailable.transactionBytesProduced, false);

console.log(
  JSON.stringify(
    {
      ok: true,
      evidenceLevel: "CI/LOCAL",
      status: "policy_authorized_atomic_usdc_recovery_verified",
      network: "testnet",
      usdc: {
        tokenId: HEDERA_TESTNET_USDC_TOKEN_ID,
        decimals: HEDERA_USDC_DECIMALS,
        minimumAtomicUnits: HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS,
      },
      assertions: {
        exactOneBookingNftMovement: true,
        exactOneUsdcMovement: true,
        noHbarMovement: true,
        singleTransferTransaction: true,
        h2PolicyAttachedBeforeBytes: true,
        exactSettlementBoundToPolicyQuote: true,
        holderIsSettlementRecipient: true,
        wrongTokenRejectedBeforeNonce: true,
        wrongSerialRejectedBeforeNonce: true,
        wrongSpenderRejectedBeforeNonce: true,
        wrongReceiverRejectedBeforeNonce: true,
        wrongSettlementTokenRejectedBeforeNonce: true,
        wrongSettlementAmountRejectedBeforeNonce: true,
        wrongSettlementRecipientRejectedBeforeNonce: true,
        wrongDecimalsRejectedBeforeNonce: true,
        belowMinimumRejectedBeforeNonce: true,
        providerBlockAndReviewRejectedBeforeNonce: true,
        exactReplayRejected: true,
        conflictingReplayRejected: true,
        concurrentReplaySingleWinner: true,
        replayStoreUnavailableFailsClosed: true,
        unsignedReturnBytesOnly: true,
      },
    },
    null,
    2
  )
);
