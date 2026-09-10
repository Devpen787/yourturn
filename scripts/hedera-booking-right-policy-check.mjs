import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Transaction, TransferTransaction } from "@hiero-ledger/sdk";
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
import { preparePolicyAuthorizedDelegatedRecovery } from "../lib/hedera-agent-kit/policy-authorized-delegated-recovery.ts";

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

// Retain the direct HAK lifecycle proof, but do not mistake this manually wired
// fixture for the H2 product preparation boundary tested below.
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

async function runProtected({
  delegationPatch = {},
  invocationPatch = {},
  action = "RECOVER",
  store = createStore(),
} = {}) {
  const resolvedDelegation = { ...delegation, ...delegationPatch };
  const resolvedInvocation = {
    ...baseInvocation,
    action,
    nonce: `protected-${action.toLowerCase()}-001`,
    ...invocationPatch,
  };
  return preparePolicyAuthorizedDelegatedRecovery({
    delegation: resolvedDelegation,
    invocation: resolvedInvocation,
    nonceStore: store,
    now: () => nowMs,
  });
}

function assertProtectedStop(result, reason, outcome = null) {
  assert.equal(result.ok, false, `${reason} must not prepare transaction bytes`);
  assert.equal(result.transactionBytesProduced, false);
  assert.equal(result.decision.reason, reason);
  if (outcome) assert.equal(result.decision.outcome, outcome);
}

// SEC-HEDERA-005: exercise the exact exported H2 product/demo boundary. Provider
// denial/review uses a deliberately malformed receiver sentinel: if the HAK
// BaseTool reached normalization/coreAction instead of stopping in the policy
// pre-hook, this would not produce the required provider decision.
const providerBlocked = await runProtected({
  invocationPatch: {
    providerPolicy: { id: delegation.providerPolicyId, state: "BLOCK" },
    receiverAccountId: "not-a-hedera-account",
  },
});
assertProtectedStop(providerBlocked, "PROVIDER_POLICY_DENIED", "BLOCK");

const providerReview = await runProtected({
  invocationPatch: {
    providerPolicy: { id: delegation.providerPolicyId, state: "REVIEW" },
    receiverAccountId: "not-a-hedera-account",
  },
});
assertProtectedStop(providerReview, "PROVIDER_POLICY_REVIEW", "ESCALATE");

for (const [reason, options] of [
  ["DELEGATION_EXPIRED", { delegationPatch: { expiresAtMs: nowMs } }],
  ["DELEGATION_REVOKED", { delegationPatch: { revokedAtMs: nowMs - 1 } }],
  ["HOLDER_MISMATCH", { invocationPatch: { currentHolderAccountId: "0.0.1999" } }],
  ["AGENT_MISMATCH", { invocationPatch: { agentAccountId: "0.0.7999" } }],
  ["RECOVERY_ASSET_MISMATCH", { invocationPatch: { recovery: { asset: { kind: "HBAR" }, atomicUnits: "45000000" } } }],
  ["BELOW_MINIMUM_RECOVERY", { invocationPatch: { recovery: { asset: delegation.minimumRecovery.asset, atomicUnits: "39999999" } } }],
]) {
  const result = await runProtected(options);
  assertProtectedStop(result, reason);
}

const unavailableResult = await runProtected({
  store: createStore({ unavailable: true }),
});
assertProtectedStop(unavailableResult, "REPLAY_STORE_UNAVAILABLE", "ESCALATE");

const protectedValidStore = createStore();
const protectedValid = await runProtected({
  store: protectedValidStore,
  invocationPatch: { nonce: "protected-valid-001" },
});
assert.equal(protectedValid.ok, true);
assert.equal(protectedValid.transactionBytesProduced, true);
assert.equal(protectedValid.decision.outcome, "ALLOW");
assert.equal(protectedValid.envelope.mode, "RETURN_BYTES");
assert.equal(protectedValid.envelope.signed, false);
assert.equal(protectedValid.envelope.submitted, false);
assert.equal(protectedValid.envelope.payerAccountId, authority.spenderAccountId);
const protectedTransfer = Transaction.fromBytes(
  Buffer.from(protectedValid.envelope.bytesBase64, "base64")
);
assert.ok(protectedTransfer instanceof TransferTransaction);
assert.equal(
  protectedTransfer.transactionId?.accountId?.toString(),
  authority.spenderAccountId
);
const protectedTransferEntries = [...protectedTransfer.nftTransfers];
assert.equal(protectedTransferEntries.length, 1);
assert.equal(protectedTransferEntries[0][0].toString(), authority.tokenId);
assert.equal(protectedTransferEntries[0][1].length, 1);
assert.equal(Number(protectedTransferEntries[0][1][0].serial.toString()), authority.serial);
assert.equal(protectedTransferEntries[0][1][0].sender.toString(), authority.ownerAccountId);
assert.equal(protectedTransferEntries[0][1][0].recipient.toString(), receiverAccountId);
assert.equal(protectedTransferEntries[0][1][0].isApproved, true);

const productReplayStore = createStore();
const firstReplay = await runProtected({
  store: productReplayStore,
  invocationPatch: { nonce: "protected-replay-001" },
});
assert.equal(firstReplay.ok, true);
const secondReplay = await runProtected({
  store: productReplayStore,
  invocationPatch: { nonce: "protected-replay-001" },
});
assertProtectedStop(secondReplay, "IDEMPOTENT_REPLAY", "BLOCK");

const productConflictStore = createStore();
const firstConflict = await runProtected({
  store: productConflictStore,
  invocationPatch: { nonce: "protected-conflict-001" },
});
assert.equal(firstConflict.ok, true);
const conflictingReplay = await runProtected({
  store: productConflictStore,
  invocationPatch: {
    nonce: "protected-conflict-001",
    recovery: {
      asset: delegation.minimumRecovery.asset,
      atomicUnits: "46000000",
    },
  },
});
assertProtectedStop(conflictingReplay, "NONCE_CONFLICT", "BLOCK");

const concurrentStore = createStore();
const concurrentResults = await Promise.all([
  runProtected({
    store: concurrentStore,
    invocationPatch: { nonce: "protected-concurrent-001" },
  }),
  runProtected({
    store: concurrentStore,
    invocationPatch: { nonce: "protected-concurrent-001" },
  }),
]);
assert.equal(concurrentResults.filter((result) => result.ok).length, 1);
const concurrentBlocked = concurrentResults.find((result) => !result.ok);
assert.ok(concurrentBlocked);
assertProtectedStop(concurrentBlocked, "IDEMPOTENT_REPLAY", "BLOCK");

// All three H2 action surfaces use the same guarded entry point. These checks
// prove DELEGATE/REVOKE cannot accidentally route through the legacy H1 wrappers.
for (const [action, expectedType, expectedPayer] of [
  ["DELEGATE", "AccountAllowanceApproveTransaction", authority.ownerAccountId],
  ["REVOKE", "AccountAllowanceDeleteTransaction", authority.ownerAccountId],
]) {
  const actionResult = await runProtected({
    action,
    store: createStore(),
    invocationPatch: { nonce: `protected-${action.toLowerCase()}-valid` },
  });
  assert.equal(actionResult.ok, true);
  assert.equal(actionResult.envelope.transactionType, expectedType);
  assert.equal(actionResult.envelope.payerAccountId, expectedPayer);
  assert.equal(actionResult.envelope.signed, false);
  assert.equal(actionResult.envelope.submitted, false);
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

const protectedRouteSource = readFileSync(
  new URL("../lib/hedera-agent-kit/policy-authorized-delegated-recovery.ts", import.meta.url),
  "utf8"
);
const hookAttachIndex = protectedRouteSource.indexOf("runtime.context.hooks =");
const executeIndex = protectedRouteSource.indexOf("tool.execute(");
assert.ok(hookAttachIndex >= 0, "H2 route must attach BookingRightDelegationPolicy to HAK context.hooks");
assert.ok(executeIndex > hookAttachIndex, "H2 policy hook must be attached before BaseTool.execute");
for (const policylessH1Helper of [
  "prepareSerialAllowanceForOwner",
  "prepareSerialRevocationForOwner",
  "prepareApprovedSerialTransferForSpender",
]) {
  assert.equal(
    protectedRouteSource.includes(policylessH1Helper),
    false,
    `H2 product route must not fall back to policyless H1 helper ${policylessH1Helper}`
  );
}

console.log(
  JSON.stringify(
    {
      ok: true,
      evidenceLevel: "CI/LOCAL",
      status: "booking_right_delegation_policy_verified",
      hakLifecycle: "BookingRightDelegationPolicy -> context.hooks -> BaseTool -> RETURN_BYTES",
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
        concurrentBehavior: "ONE_ALLOW_ONE_BLOCK",
      },
      assertions: {
        exactMatchAllowed: true,
        adversarialMismatchesBlocked: true,
        providerReviewEscalates: true,
        providerDenyBlocks: true,
        statelessDenialsDoNotConsumeNonce: true,
        exactReplayDoesNotPrepareSecondTransaction: true,
        nonceConflictBlocked: true,
        concurrentReplayAllowsExactlyOne: true,
        replayStoreUnavailableFailsClosed: true,
        exactProductRouteAttachesHakPolicyBeforeExecution: true,
        blockedProductRouteProducesNoReturnBytes: true,
        productRouteCannotFallbackToPolicylessH1Helpers: true,
        validProductRouteReturnsExactSerialApprovedTransferBytes: true,
        delegateAndRevokeAlsoUseGuardedProductRoute: true,
        noProductionMemoryReplayFallback: true,
      },
    },
    null,
    2
  )
);
