import { createHash } from "node:crypto";
import { z } from "zod";

const INT64_MAX = BigInt("9223372036854775807");
const units = z.string().regex(/^(0|[1-9][0-9]*)$/).max(19).refine(value => {
  try { return value.length <= 19 && BigInt(value) <= INT64_MAX; } catch { return false; }
});
const positiveUnits = units.refine(value => {
  try { return value.length <= 19 && BigInt(value) > BigInt(0); } catch { return false; }
});
const entity = z.string().regex(/^0\.0\.[1-9][0-9]*$/).max(23).refine(value => {
  try { return value.length <= 23 && BigInt(value.slice(4)) <= INT64_MAX; } catch { return false; }
});
const fractionValid = (value: { numerator: string; denominator: string }) => {
  try { return value.numerator.length <= 19 && value.denominator.length <= 19 &&
    BigInt(value.numerator) <= BigInt(value.denominator); } catch { return false; }
};

/** Business-owner policy. Ten percent is a recommendation, never a system cap. */
export const royaltyPolicySchema = z.object({
  numerator: units,
  denominator: positiveUnits,
  collectorAccountId: entity.nullable(),
}).strict().refine(fractionValid).refine(value =>
  value.numerator === "0" ? value.collectorAccountId === null : value.collectorAccountId !== null);

const royaltyFeeSchema = z.object({
  numerator: positiveUnits,
  denominator: positiveUnits,
  collectorAccountId: entity,
  allCollectorsAreExempt: z.boolean(),
  fallbackFee: z.null(),
}).strict().refine(fractionValid);

/** Complete normalized chain metadata supplied by the trusted current resolver.
 * No mutable schedules, fallback, fixed, fractional, or multiple royalty fees.
 * A parsed object is a contract, not evidence that a chain lookup happened.
 */
export const bookingFeeMetadataSchema = z.object({
  tokenId: entity,
  treasuryAccountId: entity,
  feeScheduleKey: z.null(),
  fixedFees: z.array(z.never()).length(0),
  fractionalFees: z.array(z.never()).length(0),
  royaltyFees: z.union([z.tuple([]), z.tuple([royaltyFeeSchema])]),
}).strict();

export const royaltyEconomicsSchema = z.object({
  numerator: units,
  denominator: positiveUnits,
  collectorAccountId: entity.nullable(),
  royaltyAmountAtomicUnits: units,
  sellerNetAtomicUnits: units,
  exemption: z.enum(["none", "treasury", "collector"]),
  feeMetadataHash: z.string().regex(/^[0-9a-f]{64}$/),
}).strict().refine(fractionValid).refine(value =>
  value.numerator === "0" ? value.collectorAccountId === null : value.collectorAccountId !== null);
export type RecoveryRoyaltyEconomics = z.infer<typeof royaltyEconomicsSchema>;

function requireRoyalty(condition: boolean, code: string): asserts condition {
  if (!condition) throw new Error(`ROYALTY_${code}`);
}

/** Derive the seller's actual credit from buyer gross, using integer floor math.
 * Hedera assesses this royalty from the NFT sender's consideration, not the
 * agent's fee-payer role. Sender treasury/own-collector exemptions alone apply
 * to this single-royalty bounded contract. No network or signing occurs here.
 */
export function resolveRecoveryRoyalty(input: {
  grossAtomicUnits: string;
  holderAccountId: string;
  buyerAccountId: string;
  bookingTokenId: string;
  policy: unknown;
  metadata: unknown;
}): RecoveryRoyaltyEconomics {
  const parsedInput = z.object({
    grossAtomicUnits: positiveUnits,
    holderAccountId: entity,
    buyerAccountId: entity,
    bookingTokenId: entity,
    policy: z.unknown(),
    metadata: z.unknown(),
  }).strict().safeParse(input);
  requireRoyalty(parsedInput.success, "INPUT_INVALID");
  requireRoyalty(input.holderAccountId !== input.buyerAccountId, "ROLE_COLLISION");
  const policyResult = royaltyPolicySchema.safeParse(input.policy);
  requireRoyalty(policyResult.success, "POLICY_INVALID");
  const metadataResult = bookingFeeMetadataSchema.safeParse(input.metadata);
  requireRoyalty(metadataResult.success, "METADATA_INVALID");
  const policy = policyResult.data;
  const metadata = metadataResult.data;
  requireRoyalty(metadata.tokenId === input.bookingTokenId, "TOKEN_MISMATCH");
  const fee = metadata.royaltyFees[0];
  if (policy.numerator === "0") {
    requireRoyalty(fee === undefined, "POLICY_MISMATCH");
  } else {
    requireRoyalty(fee !== undefined, "POLICY_MISMATCH");
    requireRoyalty(BigInt(policy.numerator) * BigInt(fee.denominator) ===
      BigInt(fee.numerator) * BigInt(policy.denominator) &&
      policy.collectorAccountId === fee.collectorAccountId, "POLICY_MISMATCH");
  }
  const exemption: RecoveryRoyaltyEconomics["exemption"] = !fee ? "none" :
    input.holderAccountId === metadata.treasuryAccountId ? "treasury" :
    input.holderAccountId === fee.collectorAccountId ? "collector" : "none";
  requireRoyalty(!fee || exemption !== "none" || input.buyerAccountId !== fee.collectorAccountId,
    "BUYER_COLLECTOR_UNSUPPORTED");
  const gross = BigInt(input.grossAtomicUnits);
  const royalty = fee && exemption === "none"
    ? gross * BigInt(policy.numerator) / BigInt(policy.denominator) : BigInt(0);
  // Zod object parsing fixes property order, including every normalized fee field.
  const feeMetadataHash = createHash("sha256").update(JSON.stringify(metadata)).digest("hex");
  return Object.freeze(royaltyEconomicsSchema.parse({
    numerator: policy.numerator,
    denominator: policy.denominator,
    collectorAccountId: policy.collectorAccountId,
    royaltyAmountAtomicUnits: royalty.toString(),
    sellerNetAtomicUnits: (gross - royalty).toString(),
    exemption,
    feeMetadataHash,
  }));
}

const identifier = z.string().min(1).max(128).regex(/^[A-Za-z0-9._:-]+$/);
const transactionId = z.string().regex(/^0\.0\.[1-9][0-9]*@[0-9]+\.[0-9]{9}$/);
const signedUnits = z.string().regex(/^(0|-?[1-9][0-9]*)$/).max(20).refine(value => {
  try { if (value.length > 20) return false;
    const n = BigInt(value); return n >= -INT64_MAX && n <= INT64_MAX; } catch { return false; }
});
const receiptExpectationSchema = z.object({
  operationId: identifier,
  transactionId,
  transactionMemo: z.string().min(1).max(100),
  bookingTokenId: entity,
  serial: z.number().int().positive().safe(),
  holderAccountId: entity,
  buyerAccountId: entity,
  settlementTokenId: z.literal("0.0.429274"),
  grossAtomicUnits: positiveUnits,
  economics: royaltyEconomicsSchema,
}).strict();
const receiptObservationSchema = z.object({
  operationId: identifier,
  transactionId,
  transactionMemo: z.string().min(1).max(100),
  status: z.literal("SUCCESS"),
  nftTransfers: z.array(z.object({
    tokenId: entity,
    serial: z.number().int().positive().safe(),
    senderAccountId: entity,
    receiverAccountId: entity,
  }).strict()).length(1),
  tokenTransfers: z.array(z.object({
    tokenId: entity,
    accountId: entity,
    amountAtomicUnits: signedUnits,
  }).strict()).min(2).max(3),
}).strict();

/** Pure checker for a COMPLETE normalized final receipt from a trusted reader.
 * The reader must bind operation identity to the actual committed transaction,
 * include all token/NFT movements, and only pass a final successful result.
 * This does not query Mirror, authenticate a receipt, or infer missing fields.
 * The actual transaction memo must match the expected commitment memo; a free-
 * form operationId alone is not on-chain operation identity. HBAR network fees
 * belong outside this USDC/NFT/memo/transaction component. Assessed-custom-
 * fees fields are unnecessary: the final exact account credits are decisive.
 */
export function validateRecoveryRoyaltyReceipt(
  expected: unknown,
  observed: unknown,
): Readonly<RecoveryRoyaltyEconomics> {
  const eResult = receiptExpectationSchema.safeParse(expected);
  requireRoyalty(eResult.success, "RECEIPT_EXPECTATION_INVALID");
  const oResult = receiptObservationSchema.safeParse(observed);
  requireRoyalty(oResult.success, "RECEIPT_INVALID");
  const e = eResult.data;
  const o = oResult.data;
  requireRoyalty(e.holderAccountId !== e.buyerAccountId, "RECEIPT_ROLE_COLLISION");
  requireRoyalty(e.operationId === o.operationId && e.transactionId === o.transactionId &&
    e.transactionMemo === o.transactionMemo,
    "RECEIPT_IDENTITY_MISMATCH");
  const gross = BigInt(e.grossAtomicUnits);
  const royalty = BigInt(e.economics.royaltyAmountAtomicUnits);
  const net = BigInt(e.economics.sellerNetAtomicUnits);
  const derivedRoyalty = e.economics.exemption === "none"
    ? gross * BigInt(e.economics.numerator) / BigInt(e.economics.denominator) : BigInt(0);
  requireRoyalty(gross === net + royalty && royalty === derivedRoyalty,
    "RECEIPT_ECONOMICS_MISMATCH");
  const nft = o.nftTransfers[0];
  requireRoyalty(nft.tokenId === e.bookingTokenId && nft.serial === e.serial &&
    nft.senderAccountId === e.holderAccountId && nft.receiverAccountId === e.buyerAccountId,
    "RECEIPT_NFT_MISMATCH");
  const expectedCredits = new Map<string, string>([[e.buyerAccountId, (-gross).toString()]]);
  if (net > BigInt(0)) expectedCredits.set(e.holderAccountId, net.toString());
  if (royalty > BigInt(0)) {
    requireRoyalty(e.economics.collectorAccountId !== null &&
      e.economics.collectorAccountId !== e.holderAccountId &&
      e.economics.collectorAccountId !== e.buyerAccountId, "RECEIPT_ROLE_COLLISION");
    expectedCredits.set(e.economics.collectorAccountId, royalty.toString());
  }
  requireRoyalty(o.tokenTransfers.length === expectedCredits.size, "RECEIPT_TRANSFERS_MISMATCH");
  for (const transfer of o.tokenTransfers) {
    requireRoyalty(transfer.tokenId === e.settlementTokenId &&
      expectedCredits.get(transfer.accountId) === transfer.amountAtomicUnits,
      "RECEIPT_TRANSFERS_MISMATCH");
    expectedCredits.delete(transfer.accountId);
  }
  requireRoyalty(expectedCredits.size === 0, "RECEIPT_TRANSFERS_MISMATCH");
  return Object.freeze(e.economics);
}
