import { isDeepStrictEqual } from "node:util";
import type { RecoveryRoyaltyEconomics } from "./recovery-royalty.ts";
import { AgentMode, BaseTool, type Context } from "@hashgraph/hedera-agent-kit";
import { Client, PublicKey, Transaction, type TransferTransaction } from "@hiero-ledger/sdk";
import { z } from "zod";
import {
  BookingRightDelegationPolicy,
  BookingRightDelegationPolicyError,
  type BookingRightPolicyDecision,
} from "./booking-right-delegation-policy.ts";
import {
  YOURTURN_DELEGATED_RECOVERY_SETTLE_USDC_TOOL,
  type DelegatedRecoverySigningEnvelope,
  type SettledTransferParams,
} from "./delegated-recovery-plugin.ts";
import {
  ExactPaymentDenied,
  RedisPaymentOperationStore,
  paymentCommitmentMemo,
  verifyExactPaymentAuthorization,
  type PaymentOperationStore,
  type ResolvedUsdcRecoveryState,
} from "./exact-payment-authorization.ts";
import { validateSeparatedAtomicUsdcRecoveryTransaction } from "./usdc-recovery-semantics.ts";

export type PolicyAuthorizedUsdcRecoveryArgs = {
  operationId: string;
  /** Detached NATIVE transaction-body signature produced externally by Bob. */
  paymentAuthorization: { signatureHex: string };
  /** Trusted server dependency, not a client-supplied delegation/key/quote blob. */
  resolveState: (operationId: string) => Promise<ResolvedUsdcRecoveryState | null>;
  /** Test seam only; production defaults to atomic durable Redis tombstones. */
  operationStore?: PaymentOperationStore;
  now?: () => number;
};

type RecoveryDecision = Omit<BookingRightPolicyDecision, "reason"> & { reason: string };
export type PolicyAuthorizedUsdcRecoveryResult =
  | {
      ok: true;
      decision: RecoveryDecision;
      envelope: DelegatedRecoverySigningEnvelope;
      transactionBytesProduced: true;
      /** Existing Bob authorization to attach externally; this module never signs. */
      paymentAuthorization: { signatureHex: string; publicKey: string; accountId: string };
      settlement: {
        tokenId: string; atomicUnits: string; decimals: number;
        economics?: RecoveryRoyaltyEconomics & { buyerGrossAtomicUnits: string };
        delegatedAgentAccountId: string;
        settlementSourceAccountId: string;
        receiverAccountId: string;
        settlementRecipientAccountId: string;
        transactionFeePayerAccountId: string;
      };
    }
  | { ok: false; decision: RecoveryDecision; transactionBytesProduced: false };

/** Private HAK tool receives only an already cryptographically verified proposal.
 * HAK 4.0 handleTransaction ALWAYS generates a new transaction ID, invalidating
 * Bob's exact-body signature. This bounded RETURN_BYTES adapter preserves the
 * frozen ID/body and retains the same BaseTool / AbstractPolicy lifecycle.
 * It has no EXECUTE strategy and is not registered in generic tool discovery.
 */
class ExactPaymentReturnBytesTool extends BaseTool<unknown, SettledTransferParams> {
  method = YOURTURN_DELEGATED_RECOVERY_SETTLE_USDC_TOOL;
  name = "Prepare Bob-authorized exact atomic USDC recovery";
  description = "Preserve a pre-authorized frozen transfer after current holder policy and durable replay checks.";
  parameters: any = z.unknown();
  constructor(
    private readonly transfer: TransferTransaction,
    private readonly expectedParams: SettledTransferParams,
    private readonly policy: BookingRightDelegationPolicy,
    private readonly checkFresh: () => Promise<void>,
  ) { super(); }
  async normalizeParams(raw: unknown, context: Context): Promise<SettledTransferParams> {
    if (context.mode !== AgentMode.RETURN_BYTES || context.accountId !== this.expectedParams.spenderAccountId ||
      JSON.stringify(raw) !== JSON.stringify(this.expectedParams)) throw new ExactPaymentDenied("PREPARATION_CONTEXT_MISMATCH");
    return this.expectedParams;
  }
  async coreAction() {
    if (this.policy.lastDecision?.outcome !== "ALLOW") throw new ExactPaymentDenied("POLICY_ALLOW_REQUIRED");
    await this.checkFresh();
    return this.transfer;
  }
  async secondaryAction(transaction: TransferTransaction, _client: Client, context: Context) {
    if (context.mode !== AgentMode.RETURN_BYTES || transaction !== this.transfer) throw new ExactPaymentDenied("RETURN_BYTES_REQUIRED");
    await this.checkFresh();
    return { bytes: transaction.toBytes() };
  }
}

/** Isolated successor of 411f703, not a live-qualified settlement claim.
 * Denials return no envelope/transaction bytes. Local native-body construction
 * for signature verification is not a payment or a signing action.
 */
export async function preparePolicyAuthorizedUsdcRecovery(
  args: PolicyAuthorizedUsdcRecoveryArgs,
): Promise<PolicyAuthorizedUsdcRecoveryResult> {
  let state: ResolvedUsdcRecoveryState | null = null;
  let client: Client | undefined;
  let policy: BookingRightDelegationPolicy | undefined;
  const denied = (reason: string): PolicyAuthorizedUsdcRecoveryResult => ({
    ok: false,
    transactionBytesProduced: false,
    decision: {
      outcome: "BLOCK", reason,
      delegationId: state?.delegation?.delegationId ?? "unresolved",
      action: "RECOVER", tokenId: state?.delegation?.tokenId ?? "unresolved",
      serial: state?.delegation?.serial ?? 0,
      detail: "No transaction bytes returned. Resolve current authority and retry only with a new authorized operation where appropriate.",
    },
  });
  try {
    if (!args || typeof args.operationId !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(args.operationId) || typeof args.resolveState !== "function") return denied("EXECUTION_STATE_REQUIRED");
    // Snapshot both untrusted signature and resolved state across asynchronous boundaries.
    const operationId = args.operationId;
    const signatureHex = args.paymentAuthorization?.signatureHex;
    const resolveState = args.resolveState;
    state = structuredClone(await resolveState(operationId));
    if (!state) return denied("EXECUTION_STATE_REQUIRED");
    const now = args.now ?? Date.now;
    const verified = verifyExactPaymentAuthorization(state, operationId, signatureHex, now());
    const c = verified.commitment;
    const params: SettledTransferParams = {
      tokenId: c.bookingTokenId, serial: c.serial,
      ownerAccountId: c.holderAccountId,
      // Legacy NFT authority field is solely the network allowance spender.
      spenderAccountId: c.transactionFeePayerAccountId,
      receiverAccountId: c.receiverAccountId,
      settlementTokenId: c.settlementTokenId,
      // HAK evaluates the net recovery approved by the holder. This private
      // tool returns the independently verified frozen nominal-gross proposal;
      // chain fee assessment, never a second explicit fee transfer, yields net.
      settlementAmountAtomicUnits: verified.sellerNetAtomicUnits,
      settlementRecipientAccountId: c.settlementRecipientAccountId,
      settlementDecimals: c.settlementDecimals,
    };
    const store = args.operationStore ?? new RedisPaymentOperationStore();
    policy = new BookingRightDelegationPolicy(state.delegation, state.invocation, {
      // This is invoked LAST by the existing HAK policy, after every holder check.
      reserve: async ({ key }) => {
        try {
          const result = await store.reserve([
            `ethonline:hedera:payment:v1:operation:${c.operationId}`,
            `ethonline:hedera:payment:v1:commitment:${c.commitmentId}`,
            key,
          ], paymentCommitmentMemo(c));
          return result === "claimed" || result === "duplicate" || result === "conflict" ? result : "unavailable";
        } catch { return "unavailable"; }
      },
    }, now);
    const checkFresh = () => {
      const time = now();
      if (!Number.isSafeInteger(time) || time < state!.resolvedAtMs || time - state!.resolvedAtMs > 5000 ||
        time >= c.expiresAtMs || time >= state!.delegation.expiresAtMs ||
        time >= state!.providerPolicy.validUntilMs || time >= state!.quote.expiresAtMs) {
        throw new ExactPaymentDenied("EXECUTION_STATE_STALE");
      }
    };
    const recheckCurrent = async () => {
      checkFresh();
      const fresh = structuredClone(await resolveState(operationId));
      checkFresh();
      if (!fresh) throw new ExactPaymentDenied("EXECUTION_STATE_REQUIRED");
      // A resolver may refresh its observation timestamp, but no changed
      // authority/economic fact may silently reuse Bob's original intent.
      const { resolvedAtMs: _previousRead, ...previousFacts } = state!;
      const { resolvedAtMs: _currentRead, ...currentFacts } = fresh;
      if (!isDeepStrictEqual(previousFacts, currentFacts)) throw new ExactPaymentDenied("EXECUTION_STATE_CHANGED");
      verifyExactPaymentAuthorization(fresh, operationId, signatureHex, now());
    };
    client = Client.forTestnet(); // No operator, key, query, signing, or submit.
    const context: Context = { mode: AgentMode.RETURN_BYTES, accountId: c.transactionFeePayerAccountId, hooks: [policy] };
    const tool = new ExactPaymentReturnBytesTool(verified.unsignedTransaction, params, policy, recheckCurrent);
    const result = await tool.execute(client, context, params) as { bytes?: Uint8Array };
    await recheckCurrent();
    if (!result.bytes || policy.lastDecision?.outcome !== "ALLOW") {
      return denied(policy.lastDecision?.outcome !== "ALLOW" ? policy.lastDecision?.reason ?? "POLICY_ALLOW_REQUIRED" : "RETURN_BYTES_FAILED");
    }
    const decoded = validateSeparatedAtomicUsdcRecoveryTransaction(Transaction.fromBytes(result.bytes), {
      bookingTokenId: c.bookingTokenId, serial: c.serial, holderAccountId: c.holderAccountId,
      delegatedAgentAccountId: c.delegatedAgentAccountId,
      settlementSourceAccountId: c.settlementSourceAccountId,
      receiverAccountId: c.receiverAccountId,
      settlementTokenId: c.settlementTokenId,
      settlementAmountAtomicUnits: c.settlementAmountAtomicUnits,
      settlementRecipientAccountId: c.settlementRecipientAccountId,
      settlementDecimals: c.settlementDecimals,
      transactionFeePayerAccountId: c.transactionFeePayerAccountId,
    });
    if (decoded.transactionId?.toString() !== c.transactionId || decoded.transactionMemo !== paymentCommitmentMemo(c) ||
      decoded.getSignatures().getFlatSignatureList().some(map => map.size !== 0)) return denied("RETURN_BYTES_SEMANTICS_INVALID");
    // Verify that serialization preserved the exact body Bob authorized.
    decoded.addSignature(PublicKey.fromString(verified.publicKey), Buffer.from(signatureHex, "hex"));
    if (!PublicKey.fromString(verified.publicKey).verifyTransaction(decoded)) return denied("RETURN_BYTES_SIGNATURE_INVALID");
    await recheckCurrent();
    return {
      ok: true, decision: policy.lastDecision, transactionBytesProduced: true,
      envelope: {
        bytesBase64: Buffer.from(result.bytes).toString("base64"), transactionId: c.transactionId,
        payerAccountId: c.transactionFeePayerAccountId, transactionType: "TransferTransaction",
        mode: "RETURN_BYTES", signed: false, submitted: false,
      },
      paymentAuthorization: { signatureHex, publicKey: verified.publicKey, accountId: c.settlementSourceAccountId },
      settlement: {
        tokenId: c.settlementTokenId, atomicUnits: verified.sellerNetAtomicUnits, decimals: c.settlementDecimals,
        ...(verified.economics ? { economics: { ...verified.economics, buyerGrossAtomicUnits: c.settlementAmountAtomicUnits } } : {}),
        delegatedAgentAccountId: c.delegatedAgentAccountId, settlementSourceAccountId: c.settlementSourceAccountId,
        receiverAccountId: c.receiverAccountId, settlementRecipientAccountId: c.settlementRecipientAccountId,
        transactionFeePayerAccountId: c.transactionFeePayerAccountId,
      },
    };
  } catch (error) {
    if (error instanceof BookingRightDelegationPolicyError) return { ok: false, decision: error.decision, transactionBytesProduced: false };
    if (error instanceof ExactPaymentDenied) return denied(error.reason);
    if (policy?.lastDecision && policy.lastDecision.outcome !== "ALLOW") return { ok: false, decision: policy.lastDecision, transactionBytesProduced: false };
    return denied("PAYMENT_PREPARATION_INVALID");
  } finally { client?.close(); }
}
