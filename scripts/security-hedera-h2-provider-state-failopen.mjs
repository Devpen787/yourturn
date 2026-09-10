import assert from "node:assert/strict";
import { Transaction, TransferTransaction } from "@hiero-ledger/sdk";
import { preparePolicyAuthorizedDelegatedRecovery } from "../lib/hedera-agent-kit/policy-authorized-delegated-recovery.ts";

const nowMs = Date.parse("2026-09-10T10:20:00Z");
const delegation = {
  delegationId: "security-provider-state-001",
  delegatedAgentAccountId: "0.0.7101",
  spenderAccountId: "0.0.1102",
  tokenId: "0.0.2101",
  serial: 77,
  holderAccountId: "0.0.1101",
  allowedActions: ["RECOVER"],
  minimumRecovery: {
    asset: { kind: "HTS", tokenId: "0.0.456858" },
    atomicUnits: "40000000",
  },
  expiresAtMs: nowMs + 60 * 60 * 1000,
  cancellationAllowed: false,
  providerPolicyId: "provider-policy-security-v1",
  revokedAtMs: null,
};

const baseInvocation = {
  agentAccountId: delegation.delegatedAgentAccountId,
  currentHolderAccountId: delegation.holderAccountId,
  action: "RECOVER",
  nonce: "base-nonce",
  providerPolicy: { id: delegation.providerPolicyId, state: "ALLOW" },
  recovery: {
    asset: delegation.minimumRecovery.asset,
    atomicUnits: "45000000",
  },
  receiverAccountId: "0.0.1103",
};

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
      const existing = values.get(key);
      if (existing === undefined) {
        values.set(key, fingerprint);
        return "claimed";
      }
      return existing === fingerprint ? "duplicate" : "conflict";
    },
  };
}

async function prepare({
  delegationPatch = {},
  invocationPatch = {},
  store = createStore(),
  nonce = "security-nonce",
} = {}) {
  const resolvedDelegation = { ...delegation, ...delegationPatch };
  const resolvedInvocation = {
    ...baseInvocation,
    nonce,
    ...invocationPatch,
  };
  const result = await preparePolicyAuthorizedDelegatedRecovery({
    delegation: resolvedDelegation,
    invocation: resolvedInvocation,
    nonceStore: store,
    now: () => nowMs,
  });
  return { result, store };
}

function assertStop({ result }, reason, outcome = null) {
  assert.equal(result.ok, false, `${reason} must not prepare transaction bytes`);
  assert.equal(result.transactionBytesProduced, false);
  assert.equal(result.decision.reason, reason);
  if (outcome) assert.equal(result.decision.outcome, outcome);
}

function assertExactRecoveryBytes(result) {
  assert.equal(result.ok, true);
  assert.equal(result.transactionBytesProduced, true);
  assert.equal(result.decision.outcome, "ALLOW");
  assert.equal(result.envelope.mode, "RETURN_BYTES");
  assert.equal(result.envelope.signed, false);
  assert.equal(result.envelope.submitted, false);
  assert.equal(result.envelope.payerAccountId, delegation.spenderAccountId);
  const tx = Transaction.fromBytes(Buffer.from(result.envelope.bytesBase64, "base64"));
  assert.ok(tx instanceof TransferTransaction);
  assert.equal(tx.transactionId?.accountId?.toString(), delegation.spenderAccountId);
  const entries = [...tx.nftTransfers];
  assert.equal(entries.length, 1);
  assert.equal(entries[0][0].toString(), delegation.tokenId);
  assert.equal(entries[0][1].length, 1);
  assert.equal(Number(entries[0][1][0].serial.toString()), delegation.serial);
  assert.equal(entries[0][1][0].sender.toString(), delegation.holderAccountId);
  assert.equal(entries[0][1][0].recipient.toString(), baseInvocation.receiverAccountId);
  assert.equal(entries[0][1][0].isApproved, true);
}

// First independently establish that the owner repair made the exact exported H2
// product/demo route load-bearing for the intended enum-valued policy decisions.
// BLOCK/REVIEW deliberately carry a malformed receiver; reaching BaseTool
// normalization/coreAction would prevent the expected pre-hook disposition.
const blocked = await prepare({
  invocationPatch: {
    providerPolicy: { id: delegation.providerPolicyId, state: "BLOCK" },
    receiverAccountId: "not-a-hedera-account",
  },
  nonce: "recognized-block",
});
assertStop(blocked, "PROVIDER_POLICY_DENIED", "BLOCK");
assert.equal(blocked.store.reservations, 0);

const review = await prepare({
  invocationPatch: {
    providerPolicy: { id: delegation.providerPolicyId, state: "REVIEW" },
    receiverAccountId: "not-a-hedera-account",
  },
  nonce: "recognized-review",
});
assertStop(review, "PROVIDER_POLICY_REVIEW", "ESCALATE");
assert.equal(review.store.reservations, 0);

const expired = await prepare({
  delegationPatch: { expiresAtMs: nowMs },
  nonce: "expired",
});
assertStop(expired, "DELEGATION_EXPIRED", "BLOCK");
assert.equal(expired.store.reservations, 0);

const revoked = await prepare({
  delegationPatch: { revokedAtMs: nowMs - 1 },
  nonce: "revoked",
});
assertStop(revoked, "DELEGATION_REVOKED", "BLOCK");
assert.equal(revoked.store.reservations, 0);

const staleHolder = await prepare({
  invocationPatch: { currentHolderAccountId: "0.0.1199" },
  nonce: "stale-holder",
});
assertStop(staleHolder, "HOLDER_MISMATCH", "BLOCK");
assert.equal(staleHolder.store.reservations, 0);

const changedProvider = await prepare({
  invocationPatch: {
    providerPolicy: { id: "provider-policy-security-v2", state: "ALLOW" },
  },
  nonce: "provider-changed",
});
assertStop(changedProvider, "PROVIDER_POLICY_CHANGED", "ESCALATE");
assert.equal(changedProvider.store.reservations, 0);

const wrongAsset = await prepare({
  invocationPatch: {
    recovery: { asset: { kind: "HBAR" }, atomicUnits: "45000000" },
  },
  nonce: "wrong-asset",
});
assertStop(wrongAsset, "RECOVERY_ASSET_MISMATCH", "BLOCK");
assert.equal(wrongAsset.store.reservations, 0);

const belowMinimum = await prepare({
  invocationPatch: {
    recovery: { asset: delegation.minimumRecovery.asset, atomicUnits: "39999999" },
  },
  nonce: "below-minimum",
});
assertStop(belowMinimum, "BELOW_MINIMUM_RECOVERY", "BLOCK");
assert.equal(belowMinimum.store.reservations, 0);

const unavailableStore = createStore({ unavailable: true });
const unavailable = await prepare({
  store: unavailableStore,
  nonce: "redis-unavailable",
});
assertStop(unavailable, "REPLAY_STORE_UNAVAILABLE", "ESCALATE");
assert.equal(unavailable.store.reservations, 1);

const validStore = createStore();
const valid = await prepare({ store: validStore, nonce: "valid" });
assertExactRecoveryBytes(valid.result);
assert.equal(valid.store.reservations, 1);

const replayStore = createStore();
const firstReplay = await prepare({ store: replayStore, nonce: "exact-replay" });
assertExactRecoveryBytes(firstReplay.result);
const secondReplay = await prepare({ store: replayStore, nonce: "exact-replay" });
assertStop(secondReplay, "IDEMPOTENT_REPLAY", "BLOCK");
assert.equal(replayStore.reservations, 2);

const conflictStore = createStore();
const firstConflict = await prepare({ store: conflictStore, nonce: "conflict" });
assertExactRecoveryBytes(firstConflict.result);
const conflictingReplay = await prepare({
  store: conflictStore,
  nonce: "conflict",
  invocationPatch: {
    recovery: {
      asset: delegation.minimumRecovery.asset,
      atomicUnits: "46000000",
    },
  },
});
assertStop(conflictingReplay, "NONCE_CONFLICT", "BLOCK");
assert.equal(conflictStore.reservations, 2);

const concurrentStore = createStore();
const concurrent = await Promise.all([
  prepare({ store: concurrentStore, nonce: "concurrent" }),
  prepare({ store: concurrentStore, nonce: "concurrent" }),
]);
assert.equal(concurrent.filter(({ result }) => result.ok).length, 1);
const concurrentWinner = concurrent.find(({ result }) => result.ok);
const concurrentLoser = concurrent.find(({ result }) => !result.ok);
assert.ok(concurrentWinner);
assert.ok(concurrentLoser);
assertExactRecoveryBytes(concurrentWinner.result);
assertStop(concurrentLoser, "IDEMPOTENT_REPLAY", "BLOCK");
assert.equal(concurrentStore.reservations, 2);

// New attack against the repaired boundary: providerPolicy.state is a runtime
// value. The TypeScript union is erased, and production only branches on BLOCK
// and REVIEW before falling through toward ALLOW. Plausible adapter/API drift
// such as "DENY", or a missing state, therefore becomes authorization instead
// of failing closed.
const unknownStateStore = createStore();
const unknownState = await prepare({
  store: unknownStateStore,
  invocationPatch: {
    providerPolicy: { id: delegation.providerPolicyId, state: "DENY" },
  },
  nonce: "unknown-state",
});
assertExactRecoveryBytes(unknownState.result);
assert.equal(unknownStateStore.reservations, 1);

const missingStateStore = createStore();
const missingState = await prepare({
  store: missingStateStore,
  invocationPatch: {
    providerPolicy: { id: delegation.providerPolicyId },
  },
  nonce: "missing-state",
});
assertExactRecoveryBytes(missingState.result);
assert.equal(missingStateStore.reservations, 1);

console.log(
  JSON.stringify(
    {
      ok: true,
      finding: "SEC-HEDERA-005_REPAIR_INCOMPLETE_PROVIDER_STATE_FAIL_OPEN",
      repairedBoundaryValidated: {
        providerBlock: blocked.result.decision.reason,
        providerReview: review.result.decision.reason,
        expired: expired.result.decision.reason,
        revoked: revoked.result.decision.reason,
        staleHolder: staleHolder.result.decision.reason,
        providerChanged: changedProvider.result.decision.reason,
        wrongAsset: wrongAsset.result.decision.reason,
        belowMinimum: belowMinimum.result.decision.reason,
        replayStoreUnavailable: unavailable.result.decision.reason,
        exactReplay: secondReplay.result.decision.reason,
        conflictingReplay: conflictingReplay.result.decision.reason,
        concurrent: concurrent.map(({ result }) =>
          result.ok ? "ALLOW" : result.decision.reason
        ),
        validTransactionType: valid.result.envelope.transactionType,
      },
      attacks: [
        {
          state: "DENY",
          outcome: unknownState.result.decision.outcome,
          transactionBytesProduced: unknownState.result.transactionBytesProduced,
          transactionType: unknownState.result.envelope.transactionType,
        },
        {
          state: "<missing>",
          outcome: missingState.result.decision.outcome,
          transactionBytesProduced: missingState.result.transactionBytesProduced,
          transactionType: missingState.result.envelope.transactionType,
        },
      ],
    },
    null,
    2
  )
);
