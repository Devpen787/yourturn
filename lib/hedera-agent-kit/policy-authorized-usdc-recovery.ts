import { AccountId, TokenId, Transaction } from "@hiero-ledger/sdk";
import {
  BookingRightDelegationPolicy,
  BookingRightDelegationPolicyError,
  type BookingRightDelegation,
  type BookingRightDelegationInvocation,
  type BookingRightNonceStore,
  type BookingRightPolicyDecision,
} from "./booking-right-delegation-policy.ts";
import {
  YOURTURN_DELEGATED_RECOVERY_SETTLE_USDC_TOOL,
  createDelegatedRecoveryReturnBytesRuntime,
  type DelegatedRecoverySigningEnvelope,
  type SettledTransferParams,
} from "./delegated-recovery-plugin.ts";
import {
  HEDERA_TESTNET_USDC_TOKEN_ID,
  HEDERA_USDC_DECIMALS,
  HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS,
  validateAtomicUsdcRecoveryTransaction,
} from "./usdc-recovery-semantics.ts";

export type PolicyAuthorizedUsdcRecoveryArgs = {
  /** Holder-approved, server-resolved delegation state. */
  delegation: BookingRightDelegation;
  /** Current server-resolved execution state for this exact recovery attempt. */
  invocation: BookingRightDelegationInvocation;
  /** Injectable only for deterministic verification; production defaults to Redis. */
  nonceStore?: BookingRightNonceStore;
  /** Injectable only for deterministic verification; production defaults to Date.now. */
  now?: () => number;
};

export type PolicyAuthorizedUsdcRecoveryResult =
  | {
      ok: true;
      decision: BookingRightPolicyDecision;
      envelope: DelegatedRecoverySigningEnvelope;
      transactionBytesProduced: true;
      settlement: {
        tokenId: string;
        atomicUnits: string;
        decimals: number;
        payerAccountId: string;
        recipientAccountId: string;
      };
    }
  | {
      ok: false;
      decision: BookingRightPolicyDecision;
      transactionBytesProduced: false;
    };

function account(value: string): string {
  return AccountId.fromString(value).toString();
}

function token(value: string): string {
  return TokenId.fromString(value).toString();
}

function atomicUnits(value: string): bigint {
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new Error("usdc_recovery_invalid_atomic_units");
  }
  return BigInt(value);
}

/**
 * ETHOnline-new product boundary for customer-visible recovery.
 *
 * Security properties:
 * - only Hedera testnet USDC (0.0.429274, 6 decimals) is accepted;
 * - the holder-approved minimum cannot be below 40 USDC;
 * - payer, booking serial, receiver, settlement token, amount and recipient are
 *   derived from resolved delegation/invocation state rather than caller params;
 * - BookingRightDelegationPolicy runs in HAK context.hooks before transaction bytes;
 * - returned bytes are decoded and re-validated as exactly one NFT + one USDC
 *   movement before they can cross the external signing boundary.
 */
export async function preparePolicyAuthorizedUsdcRecovery(
  args: PolicyAuthorizedUsdcRecoveryArgs
): Promise<PolicyAuthorizedUsdcRecoveryResult> {
  const { delegation, invocation } = args;
  if (invocation.action !== "RECOVER") {
    throw new Error("usdc_recovery_requires_recover_action");
  }
  if (
    delegation.minimumRecovery.asset.kind !== "HTS" ||
    token(delegation.minimumRecovery.asset.tokenId) !== HEDERA_TESTNET_USDC_TOKEN_ID
  ) {
    throw new Error("usdc_recovery_delegation_asset_mismatch");
  }
  if (
    atomicUnits(delegation.minimumRecovery.atomicUnits) <
    BigInt(HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS)
  ) {
    throw new Error("usdc_recovery_minimum_below_40_usdc");
  }
  if (
    !invocation.recovery ||
    invocation.recovery.asset.kind !== "HTS" ||
    token(invocation.recovery.asset.tokenId) !== HEDERA_TESTNET_USDC_TOKEN_ID
  ) {
    throw new Error("usdc_recovery_quote_asset_mismatch");
  }

  const payerAccountId = account(delegation.spenderAccountId);
  const holderAccountId = account(delegation.holderAccountId);
  const receiverAccountId = account(invocation.receiverAccountId ?? "");
  const settlementAmountAtomicUnits = atomicUnits(
    invocation.recovery.atomicUnits
  ).toString();

  const params: SettledTransferParams = {
    tokenId: token(delegation.tokenId),
    serial: delegation.serial,
    ownerAccountId: holderAccountId,
    spenderAccountId: payerAccountId,
    receiverAccountId,
    settlementTokenId: HEDERA_TESTNET_USDC_TOKEN_ID,
    settlementAmountAtomicUnits,
    settlementRecipientAccountId: holderAccountId,
    settlementDecimals: HEDERA_USDC_DECIMALS,
  };

  const policy = new BookingRightDelegationPolicy(
    delegation,
    invocation,
    args.nonceStore,
    args.now
  );
  const runtime = createDelegatedRecoveryReturnBytesRuntime(payerAccountId);

  try {
    runtime.context.hooks = [...(runtime.context.hooks ?? []), policy];
    const tool = runtime.tools.find(
      (candidate) => candidate.method === YOURTURN_DELEGATED_RECOVERY_SETTLE_USDC_TOOL
    );
    if (!tool) throw new Error("usdc_recovery_tool_missing");

    let result: { bytes?: Uint8Array; raw?: { error?: string } };
    try {
      result = (await tool.execute(runtime.client, runtime.context, params)) as {
        bytes?: Uint8Array;
        raw?: { error?: string };
      };
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
      throw new Error(result.raw?.error ?? "usdc_recovery_return_bytes_failed");
    }

    const decision = policy.lastDecision;
    if (!decision || decision.outcome !== "ALLOW") {
      throw new Error("usdc_recovery_policy_allowance_invariant_failed");
    }

    const transaction = Transaction.fromBytes(result.bytes);
    validateAtomicUsdcRecoveryTransaction(transaction, {
      bookingTokenId: params.tokenId,
      serial: params.serial,
      holderAccountId,
      spenderAccountId: payerAccountId,
      receiverAccountId,
      settlementTokenId: HEDERA_TESTNET_USDC_TOKEN_ID,
      settlementAmountAtomicUnits,
      settlementRecipientAccountId: holderAccountId,
      settlementDecimals: HEDERA_USDC_DECIMALS,
    });

    const transactionId = transaction.transactionId?.toString();
    if (!transactionId) throw new Error("usdc_recovery_missing_transaction_id");

    return {
      ok: true,
      decision,
      transactionBytesProduced: true,
      envelope: {
        bytesBase64: Buffer.from(result.bytes).toString("base64"),
        transactionId,
        payerAccountId,
        transactionType: "TransferTransaction",
        mode: "RETURN_BYTES",
        signed: false,
        submitted: false,
      },
      settlement: {
        tokenId: HEDERA_TESTNET_USDC_TOKEN_ID,
        atomicUnits: settlementAmountAtomicUnits,
        decimals: HEDERA_USDC_DECIMALS,
        payerAccountId,
        recipientAccountId: holderAccountId,
      },
    };
  } finally {
    runtime.client.close();
  }
}
