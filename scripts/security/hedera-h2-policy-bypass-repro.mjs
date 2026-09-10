import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BookingRightDelegationPolicy,
} from "../../lib/hedera-agent-kit/booking-right-delegation-policy.ts";
import {
  YOURTURN_DELEGATED_RECOVERY_TRANSFER_NFT_TOOL,
  createDelegatedRecoveryReturnBytesRuntime,
  prepareApprovedSerialTransferForSpender,
} from "../../lib/hedera-agent-kit/delegated-recovery-plugin.ts";

const nowMs = Date.parse("2026-09-10T09:00:00Z");
const authority = {
  tokenId: "0.0.2001",
  serial: 7,
  ownerAccountId: "0.0.1001",
  spenderAccountId: "0.0.1002",
};
const receiverAccountId = "0.0.1003";

const delegation = {
  delegationId: "security-h2-policy-bypass",
  delegatedAgentAccountId: "0.0.7001",
  spenderAccountId: authority.spenderAccountId,
  tokenId: authority.tokenId,
  serial: authority.serial,
  holderAccountId: authority.ownerAccountId,
  allowedActions: ["RECOVER"],
  minimumRecovery: {
    asset: { kind: "HTS", tokenId: "0.0.456858" },
    atomicUnits: "40000000",
  },
  expiresAtMs: nowMs + 60 * 60 * 1000,
  cancellationAllowed: false,
  providerPolicyId: "provider-policy-v3",
  revokedAtMs: null,
};

const invocation = {
  agentAccountId: delegation.delegatedAgentAccountId,
  currentHolderAccountId: delegation.holderAccountId,
  action: "RECOVER",
  nonce: "security-bypass-001",
  providerPolicy: {
    id: delegation.providerPolicyId,
    state: "BLOCK",
  },
  recovery: {
    asset: delegation.minimumRecovery.asset,
    atomicUnits: "45000000",
  },
  receiverAccountId,
};

const neverReserveStore = {
  reservations: 0,
  async reserve() {
    this.reservations += 1;
    return "claimed";
  },
};

// Control: when H2 is actually attached to the BaseTool lifecycle, the exact
// same recovery request is denied before transaction bytes are constructed.
const guardedRuntime = createDelegatedRecoveryReturnBytesRuntime(authority.spenderAccountId);
try {
  const policy = new BookingRightDelegationPolicy(
    delegation,
    invocation,
    neverReserveStore,
    () => nowMs
  );
  guardedRuntime.context.hooks = [policy];
  const transferTool = guardedRuntime.tools.find(
    (tool) => tool.method === YOURTURN_DELEGATED_RECOVERY_TRANSFER_NFT_TOOL
  );
  assert.ok(transferTool, "delegated transfer tool must exist");

  const blocked = await transferTool.execute(
    guardedRuntime.client,
    guardedRuntime.context,
    { ...authority, receiverAccountId }
  );
  assert.equal(blocked.bytes, undefined, "provider BLOCK must not construct RETURN_BYTES when H2 is attached");
  assert.match(
    blocked.raw?.error ?? "",
    /PROVIDER_POLICY_DENIED/,
    "attached H2 policy must reject provider BLOCK"
  );
  assert.equal(neverReserveStore.reservations, 0, "provider denial must happen before replay reservation");
} finally {
  guardedRuntime.client.close();
}

// Attack: the current exported preparation surface used by H1 creates a fresh
// delegated-recovery runtime internally and has no H2 policy/invocation input.
// The same NFT transfer can therefore still be prepared while our current H2
// state says provider BLOCK. This does not submit or sign anything; it proves
// H2 is not load-bearing on the runnable preparation surface yet.
const bypassed = await prepareApprovedSerialTransferForSpender({
  authority,
  receiverAccountId,
});
assert.equal(bypassed.mode, "RETURN_BYTES");
assert.equal(bypassed.signed, false);
assert.equal(bypassed.submitted, false);
assert.ok(bypassed.bytesBase64.length > 0, "unguarded preparation returned transaction bytes");
assert.equal(bypassed.payerAccountId, authority.spenderAccountId);

const pluginSource = readFileSync(
  new URL("../../lib/hedera-agent-kit/delegated-recovery-plugin.ts", import.meta.url),
  "utf8"
);
assert.doesNotMatch(
  pluginSource,
  /BookingRightDelegationPolicy/,
  "current preparation module must remain demonstrably uncomposed with H2 for this reproducer"
);
assert.match(pluginSource, /function prepareReturnBytes\(/);
assert.match(pluginSource, /createDelegatedRecoveryReturnBytesRuntime\(payerAccountId\)/);

console.log(
  JSON.stringify(
    {
      ok: true,
      reproduced: true,
      attackedSponsorSha: "48de5c2334579ca1c253c4e06635132a1b0ee5a2",
      h2SemanticCheckpoint: "ac617208f1d36e0fe5940e57f80b2bd0769e61da",
      condition: "provider_policy_BLOCK",
      guardedPath: {
        policyAttached: true,
        returnBytesConstructed: false,
        nonceReserved: false,
      },
      exportedPreparationPath: {
        policyAttached: false,
        returnBytesConstructed: true,
        signed: bypassed.signed,
        submitted: bypassed.submitted,
      },
      claimBoundary: "CI/LOCAL; no signature, submission, network mutation, or funds",
    },
    null,
    2
  )
);
