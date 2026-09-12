import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { bookingFeeMetadataSchema, resolveRecoveryRoyalty, royaltyEconomicsSchema, type RecoveryRoyaltyEconomics } from "./recovery-royalty.ts";
import { AccountId, Hbar, PublicKey, TransactionId, TransferTransaction } from "@hiero-ledger/sdk";
import { z } from "zod";
import { getRedis } from "../store/redis.ts";
import type { BookingRightDelegation, BookingRightDelegationInvocation, BookingRightNonceReservation } from "./booking-right-delegation-policy.ts";
import { HEDERA_TESTNET_USDC_TOKEN_ID, HEDERA_USDC_DECIMALS } from "./usdc-recovery-semantics.ts";

const identifier = z.string().min(1).max(128).regex(/^[A-Za-z0-9._:-]+$/);
const entity = z.string().regex(/^0\.0\.[1-9][0-9]*$/).refine(value => {
  try { return AccountId.fromString(value).toString() === value; } catch { return false; }
});
const units = z.string().regex(/^(0|[1-9][0-9]*)$/).refine(v => BigInt(v) <= BigInt("9223372036854775807"));
const positiveUnits = units.refine(v => BigInt(v) > BigInt(0));
const timestamp = z.number().int().nonnegative().safe();

/** Stable, exact wallet commitment; this version supports Bob funding himself. */
const legacyPaymentCommitmentSchema = z.object({
  domain: z.literal("yourturn:hedera:testnet:exact-payment:v1"),
  commitmentId: identifier,
  operationId: identifier,
  delegationId: identifier,
  quoteId: identifier,
  quoteHash: z.string().regex(/^[0-9a-f]{64}$/),
  providerPolicyId: identifier,
  providerPolicyVersion: identifier,
  bookingTokenId: entity,
  serial: z.number().int().positive().safe(),
  holderAccountId: entity,
  delegatedAgentAccountId: entity,
  settlementSourceAccountId: entity,
  receiverAccountId: entity,
  settlementRecipientAccountId: entity,
  transactionFeePayerAccountId: entity,
  settlementTokenId: z.literal(HEDERA_TESTNET_USDC_TOKEN_ID),
  settlementDecimals: z.literal(HEDERA_USDC_DECIMALS),
  settlementAmountAtomicUnits: positiveUnits,
  transactionId: z.string().regex(/^0\.0\.[1-9][0-9]*@[0-9]+\.000000000$/),
  nodeAccountId: z.literal("0.0.3"),
  transactionValidDurationSeconds: z.number().int().min(30).max(120),
  maxTransactionFeeTinybars: positiveUnits.refine(v => BigInt(v) <= BigInt("200000000")),
  expiresAtMs: timestamp,
}).strict();
/** v1 remains the separately qualified zero-fee protocol. v2 explicitly commits
 * to provider/chain fee economics; it cannot widen v1 by adding unsigned terms. */
export const paymentCommitmentSchema = z.discriminatedUnion("domain", [
  legacyPaymentCommitmentSchema,
  legacyPaymentCommitmentSchema.extend({
    domain: z.literal("yourturn:hedera:testnet:exact-payment:v2"),
    economics: royaltyEconomicsSchema,
  }).strict(),
]);
export type ExactPaymentCommitment = z.infer<typeof paymentCommitmentSchema>;

/** Supplied ONLY by an authenticated, current server-side resolver, never request JSON.
 * Account public key/balance must come from the funding account's authoritative state.
 * Mandate is the active verified holder mandate, including any accepted replacement.
 * Integration must implement this resolver; there is deliberately no demo fallback.
 */
export type ResolvedUsdcRecoveryState = {
  resolvedAtMs: number;
  delegation: BookingRightDelegation;
  invocation: BookingRightDelegationInvocation;
  buyerAccountId: string;
  commitment: ExactPaymentCommitment;
  quote: { id: string; hash: string; expiresAtMs: number };
  providerPolicy: {
    id: string; version: string; state: "ALLOW" | "BLOCK" | "REVIEW";
    validUntilMs: number; minimumRecoveryAtomicUnits: string | null;
    /** v2 only: independently published provider policy, never client override. */
    royalty?: unknown;
  };
  fundingAccount: {
    accountId: string;
    /** One current native Ed25519 or ECDSA public key; threshold/contract keys unsupported. */
    publicKey: string;
    tokenId: string; decimals: number; availableAtomicUnits: string;
  };
  /** Current chain metadata. v2 requires the complete normalized immutable fee
   * schedule; counts and caller-provided exemption flags cannot replace it. */
  tokens: {
    booking: { tokenId: string; customFeeCount: number; feeScheduleKey: null; feeMetadata?: unknown };
    settlement: { tokenId: string; customFeeCount: number; feeScheduleKey: null };
  };
  bookingAllowance: {
    tokenId: string; serial: number; ownerAccountId: string;
    spenderAccountId: string; approvedForAll: false;
  };
  paymentRevokedAtMs: number | null;
};

export class ExactPaymentDenied extends Error {
  constructor(readonly reason: string) { super(reason); }
}
function requireExact(condition: boolean, reason: string): asserts condition {
  if (!condition) throw new ExactPaymentDenied(reason);
}

/** Versioned fixed ordering, independent of request property insertion order. */
export function paymentCommitmentMemo(input: ExactPaymentCommitment): string {
  const c = paymentCommitmentSchema.parse(input);
  const hash = createHash("sha256").update(JSON.stringify(c)).digest("hex");
  return `yt:pay:${c.domain.endsWith(":v2") ? "v2" : "v1"}:${hash}`;
}

/** Wallet proposal primitive, NOT execution authorization. No keys/network access.
 * Bob must review all commitment fields and sign this exact frozen transaction
 * externally (SDK signWith or wallet); the agent cannot change any body field.
 */
export function buildExactPaymentProposal(input: ExactPaymentCommitment): TransferTransaction {
  const c = paymentCommitmentSchema.parse(input);
  return new TransferTransaction()
    .addApprovedNftTransfer(c.bookingTokenId, c.serial, c.holderAccountId, c.receiverAccountId)
    .addTokenTransferWithDecimals(c.settlementTokenId, c.settlementSourceAccountId, -BigInt(c.settlementAmountAtomicUnits), c.settlementDecimals)
    .addTokenTransferWithDecimals(c.settlementTokenId, c.settlementRecipientAccountId, BigInt(c.settlementAmountAtomicUnits), c.settlementDecimals)
    .setTransactionId(TransactionId.fromString(c.transactionId))
    .setNodeAccountIds([AccountId.fromString(c.nodeAccountId)])
    .setTransactionValidDuration(c.transactionValidDurationSeconds)
    .setMaxTransactionFee(Hbar.fromTinybars(c.maxTransactionFeeTinybars))
    .setTransactionMemo(paymentCommitmentMemo(c))
    .freeze();
}

/** Verify current authority and a native signature on the ENTIRE exact transfer.
 * A message signature on JSON, an allowance claim, and an injected public key in
 * paymentAuthorization are all insufficient. No signing operation is performed.
 */
export function verifyExactPaymentAuthorization(
  state: ResolvedUsdcRecoveryState,
  operationId: string,
  signatureHex: unknown,
  nowMs: number,
): { commitment: ExactPaymentCommitment; unsignedTransaction: TransferTransaction; publicKey: string; sellerNetAtomicUnits: string; economics?: RecoveryRoyaltyEconomics } {
  const parsed = paymentCommitmentSchema.safeParse(state.commitment);
  requireExact(parsed.success, "PAYMENT_COMMITMENT_INVALID");
  const c = parsed.data;
  requireExact(timestamp.safeParse(nowMs).success && timestamp.safeParse(state.resolvedAtMs).success &&
    state.resolvedAtMs <= nowMs && nowMs - state.resolvedAtMs <= 5000, "EXECUTION_STATE_STALE");
  requireExact(c.operationId === operationId && state.invocation.nonce === operationId, "OPERATION_MISMATCH");
  requireExact(c.delegationId === state.delegation.delegationId, "PAYMENT_MANDATE_MISMATCH");
  requireExact(c.bookingTokenId === state.delegation.tokenId && c.serial === state.delegation.serial, "PAYMENT_BOOKING_MISMATCH");
  requireExact(c.holderAccountId === state.delegation.holderAccountId &&
    c.holderAccountId === state.invocation.currentHolderAccountId, "PAYMENT_HOLDER_MISMATCH");
  requireExact(c.delegatedAgentAccountId === state.delegation.delegatedAgentAccountId &&
    c.delegatedAgentAccountId === state.invocation.agentAccountId, "PAYMENT_AGENT_MISMATCH");
  // Native approved NFT transfers use the transaction payer as allowance spender.
  // Roles are explicit even though native authority requires these two values equal.
  requireExact(c.transactionFeePayerAccountId === c.delegatedAgentAccountId &&
    c.transactionFeePayerAccountId === state.delegation.spenderAccountId, "ALLOWANCE_SPENDER_FEE_PAYER_MISMATCH");
  requireExact(c.receiverAccountId === state.buyerAccountId && c.receiverAccountId === state.invocation.receiverAccountId, "PAYMENT_RECEIVER_MISMATCH");
  requireExact(c.settlementSourceAccountId === state.buyerAccountId &&
    c.settlementSourceAccountId === state.fundingAccount.accountId, "PAYMENT_SOURCE_MISMATCH");
  requireExact(c.settlementSourceAccountId !== c.delegatedAgentAccountId &&
    c.settlementSourceAccountId !== c.holderAccountId, "PAYMENT_ROLE_COLLISION");
  requireExact(c.settlementRecipientAccountId === c.holderAccountId, "PAYMENT_RECIPIENT_MISMATCH");
  requireExact(c.quoteId === state.quote.id && c.quoteHash === state.quote.hash, "PAYMENT_QUOTE_MISMATCH");
  let economics: RecoveryRoyaltyEconomics | undefined;
  if (c.domain === "yourturn:hedera:testnet:exact-payment:v2") {
    try {
      const metadata = bookingFeeMetadataSchema.parse(state.tokens?.booking?.feeMetadata);
      requireExact(state.tokens.booking.customFeeCount === metadata.royaltyFees.length, "ROYALTY_METADATA_COUNT_MISMATCH");
      economics = resolveRecoveryRoyalty({
        grossAtomicUnits: c.settlementAmountAtomicUnits, holderAccountId: c.holderAccountId,
        buyerAccountId: c.settlementSourceAccountId, bookingTokenId: c.bookingTokenId,
        policy: state.providerPolicy?.royalty, metadata,
      });
      requireExact(isDeepStrictEqual(economics, c.economics), "ROYALTY_COMMITMENT_MISMATCH");
    } catch (error) {
      if (error instanceof ExactPaymentDenied) throw error;
      throw new ExactPaymentDenied("ROYALTY_POLICY_OR_METADATA_INVALID");
    }
  } else {
    // A legacy commitment may not silently ignore newly published fee policy,
    // even on a fee-free asset. New resolver data requires explicit v2 consent.
    requireExact(state.providerPolicy?.royalty === undefined && state.tokens?.booking?.feeMetadata === undefined,
      "ROYALTY_COMMITMENT_REQUIRED");
  }
  const sellerNetAtomicUnits = economics?.sellerNetAtomicUnits ?? c.settlementAmountAtomicUnits;
  requireExact(state.invocation.recovery?.atomicUnits === sellerNetAtomicUnits, "PAYMENT_AMOUNT_MISMATCH");
  requireExact(state.invocation.recovery?.asset.kind === "HTS" &&
    state.invocation.recovery.asset.tokenId === c.settlementTokenId &&
    state.delegation.minimumRecovery.asset.kind === "HTS" &&
    state.delegation.minimumRecovery.asset.tokenId === c.settlementTokenId &&
    state.fundingAccount.tokenId === c.settlementTokenId &&
    state.fundingAccount.decimals === c.settlementDecimals, "PAYMENT_ASSET_MISMATCH");
  requireExact(state.tokens?.booking?.tokenId === c.bookingTokenId &&
    state.tokens?.settlement?.tokenId === c.settlementTokenId &&
    (economics !== undefined || state.tokens.booking.customFeeCount === 0) && state.tokens.settlement.customFeeCount === 0 &&
    state.tokens.booking.feeScheduleKey === null && state.tokens.settlement.feeScheduleKey === null,
    "EXACT_NET_TOKEN_POLICY_REQUIRED");
  const allowance = state.bookingAllowance;
  requireExact(allowance?.tokenId === c.bookingTokenId && allowance.serial === c.serial &&
    allowance.ownerAccountId === c.holderAccountId && allowance.spenderAccountId === c.delegatedAgentAccountId &&
    allowance.approvedForAll === false, "SERIAL_ALLOWANCE_REQUIRED");
  requireExact(state.paymentRevokedAtMs === null, "PAYMENT_REVOKED");
  const p = state.providerPolicy;
  requireExact(p.id === c.providerPolicyId && p.id === state.delegation.providerPolicyId &&
    p.version === c.providerPolicyVersion && p.id === state.invocation.providerPolicy.id &&
    p.state === state.invocation.providerPolicy.state, "PROVIDER_POLICY_CHANGED");
  requireExact(timestamp.safeParse(p.validUntilMs).success && nowMs < p.validUntilMs, "PROVIDER_POLICY_STALE");
  requireExact(p.state === "ALLOW", "PROVIDER_POLICY_DENIED");
  requireExact(p.minimumRecoveryAtomicUnits === null || units.safeParse(p.minimumRecoveryAtomicUnits).success, "PROVIDER_MINIMUM_INVALID");
  requireExact(p.minimumRecoveryAtomicUnits === null || BigInt(sellerNetAtomicUnits) >= BigInt(p.minimumRecoveryAtomicUnits), "BELOW_PROVIDER_MINIMUM");
  requireExact(units.safeParse(state.delegation.minimumRecovery.atomicUnits).success, "HOLDER_MINIMUM_INVALID");
  if (economics) requireExact(positiveUnits.safeParse(state.delegation.minimumRecovery.atomicUnits).success,
    "POSITIVE_CANONICAL_HOLDER_MINIMUM_REQUIRED");
  // D-010: holder and provider minima protect seller NET, not buyer gross.
  requireExact(BigInt(sellerNetAtomicUnits) >= BigInt(state.delegation.minimumRecovery.atomicUnits), "BELOW_MINIMUM_RECOVERY");
  requireExact(state.delegation.revokedAtMs == null, "DELEGATION_REVOKED");
  requireExact(timestamp.safeParse(state.delegation.expiresAtMs).success && nowMs < state.delegation.expiresAtMs, "DELEGATION_EXPIRED");
  requireExact(timestamp.safeParse(state.quote.expiresAtMs).success && nowMs < state.quote.expiresAtMs && nowMs < c.expiresAtMs, "PAYMENT_EXPIRED");
  const id = TransactionId.fromString(c.transactionId);
  requireExact(id.accountId?.toString() === c.transactionFeePayerAccountId, "PAYMENT_TRANSACTION_PAYER_MISMATCH");
  const startMs = Number(id.validStart?.seconds.toString()) * 1000;
  requireExact(Number.isSafeInteger(startMs) && startMs <= nowMs &&
    startMs + c.transactionValidDurationSeconds * 1000 === c.expiresAtMs &&
    c.expiresAtMs <= state.quote.expiresAtMs && c.expiresAtMs <= state.delegation.expiresAtMs &&
    c.expiresAtMs <= p.validUntilMs, "PAYMENT_VALIDITY_MISMATCH");
  requireExact(units.safeParse(state.fundingAccount.availableAtomicUnits).success &&
    BigInt(state.fundingAccount.availableAtomicUnits) >= BigInt(c.settlementAmountAtomicUnits), "PAYMENT_FUNDS_INSUFFICIENT");
  requireExact(typeof signatureHex === "string" && /^[0-9a-f]{128}$/.test(signatureHex), "PAYMENT_AUTHORIZATION_MISSING");
  let publicKey: PublicKey;
  try { publicKey = PublicKey.fromString(state.fundingAccount.publicKey); }
  catch { throw new ExactPaymentDenied("FUNDING_KEY_UNSUPPORTED"); }
  const verificationTransaction = buildExactPaymentProposal(c);
  // Attach an already supplied signature; NEVER sign with a funding private key.
  verificationTransaction.addSignature(publicKey, Buffer.from(signatureHex, "hex"));
  // SDK 2.81 verifyTransaction can be vacuously true for an empty signature map;
  // explicit one-body/one-key checks plus the exact 64-byte input close that case.
  const signatures = verificationTransaction.getSignatures().getFlatSignatureList();
  requireExact(signatures.length === 1 && signatures[0].size === 1 &&
    signatures[0].get(publicKey) != null && publicKey.verifyTransaction(verificationTransaction), "PAYMENT_SIGNATURE_INVALID");
  return { commitment: c, unsignedTransaction: buildExactPaymentProposal(c), publicKey: publicKey.toString(), sellerNetAtomicUnits, ...(economics ? { economics } : {}) };
}

export interface PaymentOperationStore {
  /** Atomically reserve ALL keys; persistent tombstones, no TTL or release-on-error. */
  reserve(keys: string[], fingerprint: string): Promise<BookingRightNonceReservation>;
}

export const PAYMENT_RESERVATION_LUA = `
local any = false
local conflict = false
for i, key in ipairs(KEYS) do
  local value = redis.call('GET', key)
  if value then
    any = true
    if value ~= ARGV[1] then conflict = true end
  end
end
if conflict then return 'conflict' end
if any then return 'duplicate' end
for i, key in ipairs(KEYS) do redis.call('SET', key, ARGV[1]) end
return 'claimed'
`;

export class RedisPaymentOperationStore implements PaymentOperationStore {
  async reserve(keys: string[], fingerprint: string): Promise<BookingRightNonceReservation> {
    try {
      const redis = getRedis();
      if (!redis) return "unavailable";
      const result = await redis.eval(PAYMENT_RESERVATION_LUA, keys, [fingerprint]);
      return result === "claimed" || result === "duplicate" || result === "conflict" ? result : "unavailable";
    } catch { return "unavailable"; }
  }
}
