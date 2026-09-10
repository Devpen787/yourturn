import assert from "node:assert/strict";
import { Transaction, TransferTransaction } from "@hiero-ledger/sdk";
import { preparePolicyAuthorizedDelegatedRecovery } from "../../lib/hedera-agent-kit/policy-authorized-delegated-recovery.ts";

const nowMs = Date.parse("2026-09-10T09:00:00Z");
const authority = {
  holder: "0.0.3101",
  spender: "0.0.3102",
  receiver: "0.0.3103",
  agent: "0.0.7101",
  token: "0.0.9101",
  serial: 19,
  recoveryToken: "0.0.456858",
  policyId: "provider-policy-security-v7",
};

const delegation = {
  delegationId: "security-booking-19-v7",
  delegatedAgentAccountId: authority.agent,
  spenderAccountId: authority.spender,
  tokenId: authority.token,
  serial: authority.serial,
  holderAccountId: authority.holder,
  allowedActions: ["DELEGATE", "REVOKE", "RECOVER"],
  minimumRecovery: {
    asset: { kind: "HTS", tokenId: authority.recoveryToken },
    atomicUnits: "40000000",
  },
  expiresAtMs: nowMs + 60 * 60 * 1000,
  cancellationAllowed: true,
  providerPolicyId: authority.policyId,
  revokedAtMs: null,
};

const baseInvocation = {
  agentAccountId: authority.agent,
  currentHolderAccountId: authority.holder,
  action: "RECOVER",
  nonce: "security-provider-state-base",
  providerPolicy: { id: authority.policyId, state: "ALLOW" },
  recovery: {
    asset: { kind: "HTS", tokenId: authority.recoveryToken },
    atomicUnits: "45000000",
  },
  receiverAccountId: authority.receiver,
};

function makeStore() {
  const values = new Map();
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    async reserve({ key, fingerprint }) {
      calls += 1;
      const previous = values.get(key);
      if (previous === undefined) {
        values.set(key, fingerprint);
        return "claimed";
      }
      return previous === fingerprint ? "duplicate" : "conflict";
    },
  };
}

async function execute({ providerPolicy, nonce, store = makeStore(), invocationPatch = {} }) {
  const invocation = {
    ...baseInvocation,
    ...invocationPatch,
    nonce,
    providerPolicy,
  };
  const result = await preparePolicyAuthorizedDelegatedRecovery({
    delegation,
    invocation,
    nonceStore: store,
    now: () => nowMs,
  });
  return { result, store };
}

function expectStopped(attempt, reason, outcome, expectedStoreCalls = 0) {
  assert.equal(attempt.result.ok, false, `${reason} must fail closed`);
  assert.equal(attempt.result.transactionBytesProduced, false, `${reason} must not return bytes`);
  assert.equal(attempt.result.decision.reason, reason);
  assert.equal(attempt.result.decision.outcome, outcome);
  assert.equal(
    attempt.store.calls,
    expectedStoreCalls,
    `${reason} must have expected nonce-store call count`
  );
}

// SEC-HEDERA-006 regression: runtime values that are not the exact recognized
// provider-policy states must never fall through to replay reservation or HAK
// transaction construction. These values intentionally bypass TypeScript typing.
const malformedStates = [
  [{ id: authority.policyId, state: "DENY" }, "future-deny"],
  [{ id: authority.policyId }, "missing"],
  [{ id: authority.policyId, state: undefined }, "undefined"],
  [{ id: authority.policyId, state: null }, "null"],
  [{ id: authority.policyId, state: 1 }, "number"],
  [{ id: authority.policyId, state: true }, "boolean"],
  [{ id: authority.policyId, state: "allow" }, "wrong-case"],
  [{ id: authority.policyId, state: "ALLOW " }, "trailing-space"],
  [{ id: authority.policyId, state: ["ALLOW"] }, "array-state"],
  [null, "null-policy"],
  ["ALLOW", "string-policy"],
  [[], "array-policy"],
];

for (const [providerPolicy, label] of malformedStates) {
  const attempt = await execute({
    providerPolicy,
    nonce: `security-malformed-${label}`,
  });
  expectStopped(attempt, "PROVIDER_POLICY_STATE_INVALID", "ESCALATE", 0);
}

// Recognized negative states must retain their distinct dispositions and still
// stop before replay state is touched.
const blocked = await execute({
  providerPolicy: { id: authority.policyId, state: "BLOCK" },
  nonce: "security-provider-block",
});
expectStopped(blocked, "PROVIDER_POLICY_DENIED", "BLOCK", 0);

const review = await execute({
  providerPolicy: { id: authority.policyId, state: "REVIEW" },
  nonce: "security-provider-review",
});
expectStopped(review, "PROVIDER_POLICY_REVIEW", "ESCALATE", 0);

const changedPolicy = await execute({
  providerPolicy: { id: "provider-policy-security-v8", state: "ALLOW" },
  nonce: "security-provider-id-change",
});
expectStopped(changedPolicy, "PROVIDER_POLICY_CHANGED", "ESCALATE", 0);

// Exact ALLOW remains functional and the produced bytes retain the intended
// bounded approved-transfer semantics.
const allowedStore = makeStore();
const allowed = await execute({
  providerPolicy: { id: authority.policyId, state: "ALLOW" },
  nonce: "security-provider-exact-allow",
  store: allowedStore,
});
assert.equal(allowed.result.ok, true);
assert.equal(allowed.result.transactionBytesProduced, true);
assert.equal(allowed.result.decision.outcome, "ALLOW");
assert.equal(allowed.result.decision.reason, "ALLOW");
assert.equal(allowed.store.calls, 1);
assert.equal(allowed.result.envelope.mode, "RETURN_BYTES");
assert.equal(allowed.result.envelope.signed, false);
assert.equal(allowed.result.envelope.submitted, false);
assert.equal(allowed.result.envelope.payerAccountId, authority.spender);

const decoded = Transaction.fromBytes(
  Buffer.from(allowed.result.envelope.bytesBase64, "base64")
);
assert.ok(decoded instanceof TransferTransaction);
assert.equal(decoded.transactionId?.accountId?.toString(), authority.spender);
const nftTransfers = [...decoded.nftTransfers];
assert.equal(nftTransfers.length, 1);
assert.equal(nftTransfers[0][0].toString(), authority.token);
assert.equal(nftTransfers[0][1].length, 1);
const nft = nftTransfers[0][1][0];
assert.equal(Number(nft.serial.toString()), authority.serial);
assert.equal(nft.sender.toString(), authority.holder);
assert.equal(nft.recipient.toString(), authority.receiver);
assert.equal(nft.isApproved, true);

// Recheck the replay contract on the repaired route rather than assuming the
// provider-state change left it intact.
const replayStore = makeStore();
const firstReplay = await execute({
  providerPolicy: { id: authority.policyId, state: "ALLOW" },
  nonce: "security-provider-replay",
  store: replayStore,
});
assert.equal(firstReplay.result.ok, true);
const exactReplay = await execute({
  providerPolicy: { id: authority.policyId, state: "ALLOW" },
  nonce: "security-provider-replay",
  store: replayStore,
});
expectStopped(exactReplay, "IDEMPOTENT_REPLAY", "BLOCK", 2);

const conflictStore = makeStore();
const firstConflict = await execute({
  providerPolicy: { id: authority.policyId, state: "ALLOW" },
  nonce: "security-provider-conflict",
  store: conflictStore,
});
assert.equal(firstConflict.result.ok, true);
const conflictingReplay = await execute({
  providerPolicy: { id: authority.policyId, state: "ALLOW" },
  nonce: "security-provider-conflict",
  store: conflictStore,
  invocationPatch: {
    recovery: {
      asset: { kind: "HTS", tokenId: authority.recoveryToken },
      atomicUnits: "46000000",
    },
  },
});
expectStopped(conflictingReplay, "NONCE_CONFLICT", "BLOCK", 2);

const concurrentStore = makeStore();
const concurrent = await Promise.all([
  execute({
    providerPolicy: { id: authority.policyId, state: "ALLOW" },
    nonce: "security-provider-concurrent",
    store: concurrentStore,
  }),
  execute({
    providerPolicy: { id: authority.policyId, state: "ALLOW" },
    nonce: "security-provider-concurrent",
    store: concurrentStore,
  }),
]);
assert.equal(concurrent.filter(({ result }) => result.ok).length, 1);
const concurrentLoser = concurrent.find(({ result }) => !result.ok);
assert.ok(concurrentLoser);
assert.equal(concurrentLoser.result.transactionBytesProduced, false);
assert.equal(concurrentLoser.result.decision.reason, "IDEMPOTENT_REPLAY");
assert.equal(concurrentLoser.result.decision.outcome, "BLOCK");
assert.equal(concurrentStore.calls, 2);

console.log(
  JSON.stringify(
    {
      attack: "sec_hedera_006_independent_retest",
      sponsorHead: "f0d30e80d5baab335080489f13ed0c0b2a6b94eb",
      route: "preparePolicyAuthorizedDelegatedRecovery",
      malformedRuntimeStatesRejectedBeforeNonce: malformedStates.length,
      recognizedBlockPreserved: true,
      recognizedReviewPreserved: true,
      policyIdentityChangeStillFailsClosed: true,
      exactAllowBoundedTransferVerified: true,
      exactReplayRejected: true,
      conflictingReplayRejected: true,
      concurrentWinners: 1,
      networkSubmission: false,
      signingKeyLoaded: false,
    },
    null,
    2
  )
);