import {
  AccountAllowanceApproveTransaction,
  AccountAllowanceDeleteTransaction,
  AccountId,
  Transaction,
  TransferTransaction,
} from "@hiero-ledger/sdk";
import {
  BookingRightDelegationPolicy,
  BookingRightDelegationPolicyError,
  type BookingRightDelegation,
  type BookingRightDelegationInvocation,
  type BookingRightNonceStore,
  type BookingRightPolicyDecision,
} from "./booking-right-delegation-policy.ts";
import {
  YOURTURN_DELEGATED_RECOVERY_APPROVE_NFT_TOOL,
  YOURTURN_DELEGATED_RECOVERY_REVOKE_NFT_TOOL,
  YOURTURN_DELEGATED_RECOVERY_TRANSFER_NFT_TOOL,
  createDelegatedRecoveryReturnBytesRuntime,
  type DelegatedRecoverySigningEnvelope,
  type DelegatedRecoveryToolMethod,
} from "./delegated-recovery-plugin.ts";

export type PolicyAuthorizedDelegatedRecoveryResult =
  | {
      ok: true;
      decision: BookingRightPolicyDecision;
      envelope: DelegatedRecoverySigningEnvelope;
      transactionBytesProduced: true;
    }
  | {
      ok: false;
      decision: BookingRightPolicyDecision;
      transactionBytesProduced: false;
    };

export type PolicyAuthorizedDelegatedRecoveryArgs = {
  /** Holder-approved, server-resolved delegation state. */
  delegation: BookingRightDelegation;
  /** Current server-resolved execution state for this exact recovery attempt. */
  invocation: BookingRightDelegationInvocation;
  /** Injectable only for deterministic verification; production defaults to Redis. */
  nonceStore?: BookingRightNonceStore;
  /** Injectable only for deterministic verification; production defaults to Date.now. */
  now?: () => number;
};

type ToolParams = {
  tokenId: string;
  serial: number;
  ownerAccountId: string;
  spenderAccountId: string;
  receiverAccountId?: string;
};

function canonicalAccountId(value: string): string {
  return AccountId.fromString(value).toString();
}

function methodForAction(action: BookingRightDelegationInvocation["action"]): DelegatedRecoveryToolMethod {
  if (action === "DELEGATE") return YOURTURN_DELEGATED_RECOVERY_APPROVE_NFT_TOOL;
  if (action === "REVOKE") return YOURTURN_DELEGATED_RECOVERY_REVOKE_NFT_TOOL;
  return YOURTURN_DELEGATED_RECOVERY_TRANSFER_NFT_TOOL;
}

function payerForAction(
  delegation: BookingRightDelegation,
  action: BookingRightDelegationInvocation["action"]
): string {
  return action === "RECOVER"
    ? canonicalAccountId(delegation.spenderAccountId)
    : canonicalAccountId(delegation.holderAccountId);
}

function paramsForAction(
  delegation: BookingRightDelegation,
  invocation: BookingRightDelegationInvocation
): ToolParams {
  const common = {
    tokenId: delegation.tokenId,
    serial: delegation.serial,
    ownerAccountId: delegation.holderAccountId,
    spenderAccountId: delegation.spenderAccountId,
  };
  if (invocation.action !== "RECOVER") return common;
  return {
    ...common,
    // Keep the exact server-resolved receiver in both the policy invocation and
    // raw tool params. Missing/malformed receivers are rejected by the policy
    // before BaseTool normalization/coreAction can construct a transaction.
    receiverAccountId: invocation.receiverAccountId ?? "",
  };
}

function describeTransactionType(transaction: Transaction): string {
  if (transaction instanceof AccountAllowanceApproveTransaction) {
    return "AccountAllowanceApproveTransaction";
  }
  if (transaction instanceof AccountAllowanceDeleteTransaction) {
    return "AccountAllowanceDeleteTransaction";
  }
  if (transaction instanceof TransferTransaction) return "TransferTransaction";
  return "Transaction";
}

/**
 * H2 product/demo preparation boundary.
 *
 * Unlike the policyless H1 helpers (which remain valid for proving raw
 * RETURN_BYTES mechanics), this entry point cannot prepare delegated-recovery
 * bytes without first attaching BookingRightDelegationPolicy to HAK
 * context.hooks. Tool parameters and payer are derived from the trusted
 * delegation/invocation state rather than accepted as a second caller-controlled
 * authority object.
 */
export async function preparePolicyAuthorizedDelegatedRecovery(
  args: PolicyAuthorizedDelegatedRecoveryArgs
): Promise<PolicyAuthorizedDelegatedRecoveryResult> {
  const { delegation, invocation } = args;
  const policy = new BookingRightDelegationPolicy(
    delegation,
    invocation,
    args.nonceStore,
    args.now
  );
  const method = methodForAction(invocation.action);
  const payerAccountId = payerForAction(delegation, invocation.action);
  const params = paramsForAction(delegation, invocation);
  const runtime = createDelegatedRecoveryReturnBytesRuntime(payerAccountId);

  try {
    // HAK v4 policies are load-bearing only when installed on context.hooks.
    // This assignment happens before the exact BaseTool is selected/executed.
    runtime.context.hooks = [...(runtime.context.hooks ?? []), policy];

    const tool = runtime.tools.find((candidate) => candidate.method === method);
    if (!tool) throw new Error(`delegated_recovery_tool_missing:${method}`);

    let result: { bytes?: Uint8Array; raw?: { error?: string } };
    try {
      result = (await tool.execute(
        runtime.client,
        runtime.context,
        params
      )) as { bytes?: Uint8Array; raw?: { error?: string } };
    } catch (error) {
      if (error instanceof BookingRightDelegationPolicyError) {
        return {
          ok: false,
          decision: error.decision,
          transactionBytesProduced: false,
        };
      }
      throw error;
    }

    if (!(result.bytes instanceof Uint8Array)) {
      const blockedDecision = policy.lastDecision;
      if (blockedDecision && blockedDecision.outcome !== "ALLOW") {
        return {
          ok: false,
          decision: blockedDecision,
          transactionBytesProduced: false,
        };
      }
      throw new Error(
        result.raw?.error ?? `delegated_recovery_return_bytes_failed:${method}`
      );
    }

    const decision = policy.lastDecision;
    if (!decision || decision.outcome !== "ALLOW") {
      throw new Error("delegated_recovery_policy_allowance_invariant_failed");
    }

    const transaction = Transaction.fromBytes(result.bytes);
    const transactionId = transaction.transactionId?.toString();
    const actualPayer = transaction.transactionId?.accountId?.toString();
    if (!transactionId || actualPayer !== payerAccountId) {
      throw new Error("delegated_recovery_return_bytes_payer_mismatch");
    }

    return {
      ok: true,
      decision,
      transactionBytesProduced: true,
      envelope: {
        bytesBase64: Buffer.from(result.bytes).toString("base64"),
        transactionId,
        payerAccountId,
        transactionType: describeTransactionType(transaction),
        mode: "RETURN_BYTES",
        signed: false,
        submitted: false,
      },
    };
  } finally {
    runtime.client.close();
  }
}
