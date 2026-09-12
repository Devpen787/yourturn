import assert from "node:assert/strict";
import { preparePolicyAuthorizedDelegatedRecovery } from "../lib/hedera-agent-kit/policy-authorized-delegated-recovery.ts";

const nowMs = Date.parse("2026-09-10T03:00:00Z");
const delegation = {
  delegationId: "booking-7-v1",
  delegatedAgentAccountId: "0.0.7001",
  spenderAccountId: "0.0.1002",
  tokenId: "0.0.2001",
  serial: 7,
  holderAccountId: "0.0.1001",
  allowedActions: ["DELEGATE", "REVOKE", "RECOVER"],
  minimumRecovery: {
    asset: { kind: "HTS", tokenId: "0.0.456858" },
    atomicUnits: "40000000",
  },
  expiresAtMs: nowMs + 60 * 60 * 1000,
  cancellationAllowed: true,
  providerPolicyId: "provider-policy-v3",
  revokedAtMs: null,
};

const baseInvocation = {
  agentAccountId: delegation.delegatedAgentAccountId,
  currentHolderAccountId: delegation.holderAccountId,
  action: "RECOVER",
  nonce: "provider-state-001",
  providerPolicy: { id: delegation.providerPolicyId, state: "ALLOW" },
  recovery: {
    asset: delegation.minimumRecovery.asset,
    atomicUnits: "45000000",
  },
  receiverAccountId: "0.0.1003",
};

function createStore() {
  const values = new Map();
  let reservations = 0;
  return {
    get reservations() {
      return reservations;
    },
    async reserve({ key, fingerprint }) {
      reservations += 1;
      const existing = values.get(key);
      if (existing === undefined) {
        values.set(key, fingerprint);
        return "claimed";
      }
      return existing === fingerprint ? "duplicate" : "conflict";
    },
  };
}

async function prepare(providerPolicy, nonce) {
  const store = createStore();
  const result = await preparePolicyAuthorizedDelegatedRecovery({
    delegation,
    invocation: {
      ...baseInvocation,
      nonce,
      providerPolicy,
    },
    nonceStore: store,
    now: () => nowMs,
  });
  return { result, store };
}

function assertStopped({ result, store }, reason, outcome) {
  assert.equal(result.ok, false, `${reason} must fail closed`);
  assert.equal(result.transactionBytesProduced, false, `${reason} must return no transaction bytes`);
  assert.equal(result.decision.reason, reason);
  assert.equal(result.decision.outcome, outcome);
  assert.equal(store.reservations, 0, `${reason} must happen before nonce reservation`);
}

const malformedCases = [
  [{ id: delegation.providerPolicyId, state: "DENY" }, "unknown"],
  [{ id: delegation.providerPolicyId }, "missing"],
  [{ id: delegation.providerPolicyId, state: 1 }, "numeric"],
  [{ id: delegation.providerPolicyId, state: "allow" }, "wrong-case"],
  [null, "null"],
  ["ALLOW", "non-object"],
];

for (const [providerPolicy, label] of malformedCases) {
  const attempt = await prepare(providerPolicy, `provider-state-${label}`);
  assertStopped(attempt, "PROVIDER_POLICY_STATE_INVALID", "ESCALATE");
}

const blocked = await prepare(
  { id: delegation.providerPolicyId, state: "BLOCK" },
  "provider-state-block"
);
assertStopped(blocked, "PROVIDER_POLICY_DENIED", "BLOCK");

const review = await prepare(
  { id: delegation.providerPolicyId, state: "REVIEW" },
  "provider-state-review"
);
assertStopped(review, "PROVIDER_POLICY_REVIEW", "ESCALATE");

const allowed = await prepare(
  { id: delegation.providerPolicyId, state: "ALLOW" },
  "provider-state-allow"
);
assert.equal(allowed.result.ok, true, "exact ALLOW must remain the only authorizing provider state");
assert.equal(allowed.result.transactionBytesProduced, true);
assert.equal(allowed.result.decision.outcome, "ALLOW");
assert.equal(allowed.result.decision.reason, "ALLOW");
assert.equal(allowed.result.envelope.mode, "RETURN_BYTES");
assert.equal(allowed.result.envelope.signed, false);
assert.equal(allowed.result.envelope.submitted, false);
assert.equal(allowed.store.reservations, 1, "valid ALLOW must claim exactly one nonce");

console.log(
  JSON.stringify(
    {
      check: "sec_hedera_006_provider_state_fail_closed_verified",
      route: "preparePolicyAuthorizedDelegatedRecovery",
      malformedStatesBlockedBeforeNonce: malformedCases.length,
      recognizedBlockPreserved: true,
      recognizedReviewPreserved: true,
      exactAllowProducesReturnBytes: true,
    },
    null,
    2
  )
);
