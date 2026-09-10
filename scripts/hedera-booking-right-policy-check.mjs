import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BookingRightDelegationPolicy,
  BookingRightDelegationPolicyError,
} from "../lib/hedera-agent-kit/booking-right-delegation-policy.ts";
import {
  YOURTURN_DELEGATED_RECOVERY_APPROVE_NFT_TOOL,
  YOURTURN_DELEGATED_RECOVERY_REVOKE_NFT_TOOL,
  YOURTURN_DELEGATED_RECOVERY_TRANSFER_NFT_TOOL,
  createDelegatedRecoveryReturnBytesRuntime,
} from "../lib/hedera-agent-kit/delegated-recovery-plugin.ts";

const nowMs = Date.parse("2026-09-10T03:00:00Z");
const authority = {
  tokenId: "0.0.2001",
  serial: 7,
  ownerAccountId: "0.0.1001",
  spenderAccountId: "0.0.1002",
};
const receiverAccountId = "0.0.1003";

const delegation = {
  delegationId: "booking-7-v1",
  delegatedAgentAccountId: "0.0.7001",
  spenderAccountId: authority.spenderAccountId,
  tokenId: authority.tokenId,
  serial: authority.serial,
  holderAccountId: authority.ownerAccountId,
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
  nonce: "recover-001",
  providerPolicy: { id: delegation.providerPolicyId, state: "ALLOW" },
  recovery: {
    asset: { kind: "HTS", tokenId: delegation.minimumRecovery.asset.tokenId },
    atomicUnits: "45000000",
  },
  receiverAccountId,
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

function paramsFor(action) {
  const common = { ...authority };
  return action === "RECOVER" ? { ...common, receiverAccountId } : common;
}

function methodFor(action) {
  if (action === "DELEGATE") return YOURTURN_DELEGATED_RECOVERY_APPROVE_NFT_TOOL;
  if (action === "REVOKE") return YOURTURN_DELEGATED_RECOVERY_REVOKE_NFT_TOOL;
  return YOURTURN_DELEGATED_RECOVERY_TRANSFER_NFT_TOOL;
}

function payerFor(action) {
  return action === "RECOVER" ? authority.spenderAccountId : authority.ownerAccountId;
}

async function runHook({
  delegationPatch = {},
  invocationPatch = {},
  rawPatch = {},
  action = "RECOVER",
  method = methodFor(action),
  store = createStore(),
}) {
  const resolvedDelegation = { ...delegation, ...delegationPatch };
  const resolvedInvocation = {
    ...baseInvocation,
    action,
    nonce: `${action.toLowerCase()}-001`,
    ...invocationPatch,
  };
  const policy = new BookingRightDelegationPolicy(
    resolvedDelegation,
    resolvedInvocation,
    store,
    () => nowMs
  );
  const rawParams = { ...paramsFor(action), ...rawPatch };
  await policy.preToolExecutionHook(
    {
      context: { accountId: payerFor(action) },
      rawParams,
      client: null,
    },
    method
  );
  return { policy, store };
}

async function expectReason(reason, options) {
  await assert.rejects(
    () => runHook(options),
    (error) => {
      assert.ok(error instanceof BookingRightDelegationPolicyError);
      assert.equal(error.decision.reason, reason);
      assert.notEqual(error.decision.outcome, "ALLOW");
      return true;
    }
  );
}

const cleanStore = createStore();
const allowed = await runHook({ store: cleanStore });
assert.equal(allowed.policy.lastDecision?.outcome, "ALLOW");
assert.equal(allowed.policy.lastDecision?.reason, "ALLOW");
assert.equal(cleanStore.reservations, 1);

for (const [reason, options] of [
  ["AGENT_MISMATCH", { invocationPatch: { agentAccountId: "0.0.7999" } }],
  ["TOKEN_MISMATCH", { rawPatch: { tokenId: "0.0.2999" } }],
  ["SERIAL_MISMATCH", { rawPatch: { serial: 8 } }],
  ["HOLDER_MISMATCH", { invocationPatch: { currentHolderAccountId: "0.0.1999" } }],
  ["SPENDER_MISMATCH", { rawPatch: { spenderAccountId: "0.0.1998" } }],
  ["ACTION_NOT_ALLOWED", { delegationPatch: { allowedActions: ["DELEGATE"] } }],
  ["DELEGATION_EXPIRED", { delegationPatch: { expiresAtMs: nowMs } }],
  ["DELEGATION_REVOKED", { delegationPatch: { revokedAtMs: nowMs - 1 } }],
  ["CANCELLATION_NOT_ALLOWED", { action: "REVOKE", delegationPatch: { cancellationAllowed: false } }],
  ["RECOVERY_QUOTE_MISSING", { invocationPatch: { recovery: undefined } }],
  ["RECOVERY_ASSET_MISMATCH", { invocationPatch: { recovery: { asset: { kind: "HBAR" }, atomicUnits: "45000000" } } }],
  ["BELOW_MINIMUM_RECOVERY", { invocationPatch: { recovery: { asset: delegation.minimumRecovery.asset, atomicUnits: "39999999" } } }],
  ["RECEIVER_MISMATCH", { rawPatch: { receiverAccountId: "0.0.1997" } }],
  ["PROVIDER_POLICY_CHANGED", { invocationPatch: { providerPolicy: { id: "provider-policy-v4", state: "ALLOW" } } }],
  ["PROVIDER_POLICY_DENIED", { invocationPatch: { providerPolicy: { id: delegation.providerPolicyId, state: "BLOCK" } } }],
  ["PROVIDER_POLICY_REVIEW", { invocationPatch: { providerPolicy: { id: delegation.providerPolicyId, state: "REVIEW" } } }],
  ["TOOL_ACTION_MISMATCH", { action: "RECOVER", method: YOURTURN_DELEGATED_RECOVERY_REVOKE_NFT_TOOL }],
  ["REPLAY_STORE_UNAVAILABLE", { store: createStore({ unavailable: true }) }],
]) {
  await expectReason(reason, options);
}

const noClaimOnBlockedStore = createStore();
await expectReason("AGENT_MISMATCH", {
  invocationPatch: { agentAccountId: "0.0.7999" },
  store: noClaimOnBlockedStore,
});
assert.equal(noClaimOnBlockedStore.reservations, 0, "stateless denial must happen before nonce reservation");

const replayStore = createStore();
await runHook({ store: replayStore });
await expectReason("IDEMPOTENT_REPLAY", { store: replayStore });
await expectReason("NONCE_CONFLICT", {
  store: replayStore,
  invocationPatch: { recovery: { asset: delegation.minimumRecovery.asset, atomicUnits: "46000000" } },
});

// Prove this is not a sidecar evaluator: attach the policy to the actual HAK v4
// BaseTool context and let BaseTool invoke AbstractPolicy.preToolExecutionHook.
const hakStore = createStore();
const hakPolicy = new BookingRightDelegationPolicy(
  delegation,
  { ...baseInvocation, nonce: "hak-live-shape-001" },
  hakStore,
  () => nowMs
);
const hakRuntime = createDelegatedRecoveryReturnBytesRuntime(authority.spenderAccountId);
try {
  hakRuntime.context.hooks = [hakPolicy];
  const transferTool = hakRuntime.tools.find(
    (tool) => tool.method === YOURTURN_DELEGATED_RECOVERY_TRANSFER_NFT_TOOL
  );
  assert.ok(transferTool);

  const accepted = await transferTool.execute(
    hakRuntime.client,
    hakRuntime.context,
    { ...authority, receiverAccountId }
  );
  assert.ok(accepted.bytes instanceof Uint8Array, accepted.raw?.error ?? "expected RETURN_BYTES payload");
  assert.equal(hakPolicy.lastDecision?.outcome, "ALLOW");

  const duplicate = await transferTool.execute(
    hakRuntime.client,
    hakRuntime.context,
    { ...authority, receiverAccountId }
  );
  assert.match(duplicate.raw?.error ?? "", /IDEMPOTENT_REPLAY/);
} finally {
  hakRuntime.client.close();
}

const policySource = readFileSync(
  new URL("../lib/hedera-agent-kit/booking-right-delegation-policy.ts", import.meta.url),
  "utf8"
);
assert.match(policySource, /extends AbstractPolicy/);
assert.match(policySource, /shouldBlockPreToolExecution/);
assert.match(policySource, /nx:\s*true/);
assert.match(policySource, /ex:\s*args\.ttlSeconds/);
assert.match(policySource, /getRedis\(\)/);
assert.doesNotMatch(policySource, /new Map\(/, "production policy must not use process-memory replay fallback");

console.log(
  JSON.stringify(
    {
      ok: true,
      evidenceLevel: "CI/LOCAL",
      status: "booking_right_delegation_policy_verified",
      hakLifecycle: "AbstractPolicy.preToolExecutionHook -> BaseTool",
      decisionModel: ["ALLOW", "BLOCK", "ESCALATE"],
      bindings: [
        "delegated_agent",
        "token_and_serial",
        "current_holder",
        "hedera_spender_and_payer",
        "allowed_action",
        "minimum_recovery_asset_and_atomic_units",
        "expiry",
        "cancellation_permission",
        "provider_policy",
        "revoked_state",
        "receiver",
        "durable_nonce_and_idempotency",
      ],
      replay: {
        productionStore: "Upstash Redis SET NX EX",
        missingStoreBehavior: "ESCALATE_FAIL_CLOSED",
        duplicateBehavior: "BLOCK_IDEMPOTENT_REPLAY",
        conflictBehavior: "BLOCK_NONCE_CONFLICT",
      },
      assertions: {
        exactMatchAllowed: true,
        adversarialMismatchesBlocked: true,
        providerReviewEscalates: true,
        providerDenyBlocks: true,
        statelessDenialsDoNotConsumeNonce: true,
        exactReplayDoesNotPrepareSecondTransaction: true,
        nonceConflictBlocked: true,
        actualHakBaseToolLifecycleInvokedPolicy: true,
        returnBytesPreparedAfterPolicyAllow: true,
        noProductionMemoryReplayFallback: true,
      },
    },
    null,
    2
  )
);
