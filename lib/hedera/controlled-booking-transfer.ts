import { z } from "zod";
import { proto } from "@hiero-ledger/proto";
import {
  AccountId,
  BatchTransaction,
  NftId,
  PublicKey,
  TokenFreezeTransaction,
  TokenId,
  TokenUnfreezeTransaction,
  Transaction,
  TransactionId,
  TransferTransaction,
} from "@hiero-ledger/sdk";

const INT64_MAX = BigInt("9223372036854775807");
const entityId = z
  .string()
  .regex(/^0\.0\.[1-9][0-9]{0,18}$/)
  .refine((value) => BigInt(value.slice(4)) <= INT64_MAX);
const label = z.string().regex(/^[A-Za-z0-9._:@-]{1,128}$/);
const positiveUnits = z
  .string()
  .regex(/^[1-9][0-9]{0,18}$/)
  .refine((value) => BigInt(value) <= INT64_MAX);

/**
 * Credential-free qualification contract for the human-selected production
 * booking-right direction. This is a transaction-shape builder/validator, not
 * an execution route and not a source of authority. The caller must resolve
 * provider policy, holder mandate and buyer eligibility/payment independently.
 */
export const controlledBookingTransferIntentSchema = z
  .object({
    providerId: label,
    providerPolicyVersion: label,
    bookingTokenId: entityId,
    serial: z.number().int().positive().safe(),
    sellerAccountId: entityId,
    receiverAccountId: entityId,
    delegatedAgentAccountId: entityId,
    /** Provider-scoped operations role used for freeze/unfreeze + outer batch. */
    providerOperationsAccountId: entityId,
    settlementTokenId: entityId,
    settlementSourceAccountId: entityId,
    settlementRecipientAccountId: entityId,
    settlementAmountAtomicUnits: positiveUnits,
    settlementDecimals: z.number().int().nonnegative().max(18),
    /** Public key only. No matching private key is loaded by this module. */
    batchKeyPublicKey: z.string().min(1).max(256),
    /** Outer batch node. Inner batch transactions use Hedera's batch node ID. */
    nodeAccountId: entityId,
    currentState: z
      .object({
        providerPolicyAllows: z.literal(true),
        holderMandateAllows: z.literal(true),
        buyerEligible: z.literal(true),
        exactPaymentAuthorized: z.literal(true),
        providerScopedCollection: z.literal(true),
        tokenFreezeDefault: z.literal(true),
        sellerOwnsSerial: z.literal(true),
        sellerAssociated: z.literal(true),
        receiverAssociated: z.literal(true),
        sellerRelationshipFrozen: z.literal(true),
        receiverRelationshipFrozen: z.boolean(),
        currentBookingTokenId: entityId,
        currentBookingSerial: z.number().int().positive().safe(),
        currentHolderAccountId: entityId,
        delegatedAllowanceSpenderAccountId: entityId,
      })
      .strict(),
  })
  .strict();

export type ControlledBookingTransferIntent = z.infer<
  typeof controlledBookingTransferIntentSchema
>;

export class ControlledBookingTransferDenied extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "ControlledBookingTransferDenied";
  }
}

function requireExact(condition: unknown, code: string): asserts condition {
  if (!condition) throw new ControlledBookingTransferDenied(code);
}

function canonicalAccount(value: string): string {
  return AccountId.fromString(value).toString();
}

function canonicalToken(value: string): string {
  return TokenId.fromString(value).toString();
}

function parseIntent(input: unknown): ControlledBookingTransferIntent {
  const result = controlledBookingTransferIntentSchema.safeParse(input);
  if (!result.success) throw new ControlledBookingTransferDenied("TRANSFER_INTENT_INVALID");
  const intent = result.data;
  const state = intent.currentState;

  requireExact(
    canonicalToken(state.currentBookingTokenId) === canonicalToken(intent.bookingTokenId) &&
      state.currentBookingSerial === intent.serial &&
      canonicalAccount(state.currentHolderAccountId) === canonicalAccount(intent.sellerAccountId),
    "CURRENT_HOLDER_OR_SERIAL_MISMATCH",
  );
  requireExact(
    canonicalAccount(state.delegatedAllowanceSpenderAccountId) ===
      canonicalAccount(intent.delegatedAgentAccountId),
    "DELEGATED_ALLOWANCE_SPENDER_MISMATCH",
  );
  requireExact(
    canonicalAccount(intent.settlementSourceAccountId) === canonicalAccount(intent.receiverAccountId),
    "SETTLEMENT_SOURCE_MUST_BE_RECEIVER",
  );
  requireExact(
    canonicalAccount(intent.settlementRecipientAccountId) === canonicalAccount(intent.sellerAccountId),
    "SETTLEMENT_RECIPIENT_MUST_BE_SELLER",
  );
  requireExact(
    canonicalToken(intent.bookingTokenId) !== canonicalToken(intent.settlementTokenId),
    "BOOKING_AND_SETTLEMENT_TOKEN_COLLISION",
  );
  requireExact(
    canonicalAccount(intent.sellerAccountId) !== canonicalAccount(intent.receiverAccountId),
    "SELLER_RECEIVER_COLLISION",
  );
  requireExact(
    canonicalAccount(intent.delegatedAgentAccountId) !== canonicalAccount(intent.sellerAccountId) &&
      canonicalAccount(intent.delegatedAgentAccountId) !== canonicalAccount(intent.receiverAccountId),
    "DELEGATED_AGENT_ROLE_COLLISION",
  );
  requireExact(
    canonicalAccount(intent.providerOperationsAccountId) !==
      canonicalAccount(intent.delegatedAgentAccountId) &&
      canonicalAccount(intent.providerOperationsAccountId) !== canonicalAccount(intent.receiverAccountId) &&
      canonicalAccount(intent.providerOperationsAccountId) !== canonicalAccount(intent.sellerAccountId),
    "PROVIDER_OPERATIONS_ROLE_COLLISION",
  );
  try {
    PublicKey.fromString(intent.batchKeyPublicKey);
  } catch {
    throw new ControlledBookingTransferDenied("BATCH_PUBLIC_KEY_INVALID");
  }
  return intent;
}

function freezeBatchInner<T extends Transaction>(
  transaction: T,
  payerAccountId: string,
  batchKey: PublicKey,
): T {
  transaction.setTransactionId(TransactionId.generate(AccountId.fromString(payerAccountId)));
  transaction.setBatchKey(batchKey);
  transaction.freeze();
  return transaction;
}

function assertNoSignatures(transaction: Transaction, code: string): void {
  const signatures = transaction.getSignatures().getFlatSignatureList();
  requireExact(!signatures.some((entry) => entry.size !== 0), code);
}

type SignedTransactionStore = {
  get(index: number): { bodyBytes?: Uint8Array | null } | null | undefined;
};

/**
 * Hiero JS 2.81's BatchTransaction decoder intentionally leaves the public
 * inner transaction-id list empty, but it preserves each raw SignedTransaction.
 * Qualification therefore binds payer identity to the transactionID encoded in
 * that SignedTransaction body instead of treating a missing decoded SDK ID as
 * acceptable. Missing/unparseable raw bodies fail closed.
 */
function assertSerializedPayer(
  transaction: Transaction,
  expectedPayer: string,
  code: string,
): void {
  const signedTransactions = (
    transaction as unknown as { _signedTransactions?: SignedTransactionStore }
  )._signedTransactions;
  requireExact(
    signedTransactions !== undefined && typeof signedTransactions.get === "function",
    `${code}_SIGNED_BODY_MISSING`,
  );
  const signed = signedTransactions.get(0);
  const bodyBytes = signed?.bodyBytes;
  requireExact(
    bodyBytes instanceof Uint8Array && bodyBytes.length > 0,
    `${code}_SIGNED_BODY_MISSING`,
  );

  let body: ReturnType<typeof proto.TransactionBody.decode>;
  try {
    body = proto.TransactionBody.decode(bodyBytes);
  } catch {
    throw new ControlledBookingTransferDenied(`${code}_SIGNED_BODY_INVALID`);
  }

  const rawAccountId = body.transactionID?.accountID;
  requireExact(rawAccountId !== null && rawAccountId !== undefined, `${code}_TRANSACTION_ID_MISSING`);
  const payer = (
    AccountId as unknown as {
      _fromProtobuf(id: object): AccountId;
    }
  )._fromProtobuf(rawAccountId as object);
  requireExact(payer.toString() === canonicalAccount(expectedPayer), code);
}

function assertFreezeOperation(
  transaction: Transaction,
  expectedType: "freeze" | "unfreeze",
  expectedTokenId: string,
  expectedAccountId: string,
  expectedPayer: string,
): void {
  const typed =
    expectedType === "freeze"
      ? transaction instanceof TokenFreezeTransaction
        ? transaction
        : null
      : transaction instanceof TokenUnfreezeTransaction
        ? transaction
        : null;
  requireExact(typed !== null, `CONTROLLED_${expectedType.toUpperCase()}_TYPE_MISMATCH`);
  requireExact(
    typed.tokenId?.toString() === canonicalToken(expectedTokenId),
    `CONTROLLED_${expectedType.toUpperCase()}_TOKEN_MISMATCH`,
  );
  requireExact(
    typed.accountId?.toString() === canonicalAccount(expectedAccountId),
    `CONTROLLED_${expectedType.toUpperCase()}_ACCOUNT_MISMATCH`,
  );
  assertSerializedPayer(
    typed,
    expectedPayer,
    `CONTROLLED_${expectedType.toUpperCase()}_PAYER_MISMATCH`,
  );
  assertNoSignatures(typed, `CONTROLLED_${expectedType.toUpperCase()}_UNEXPECTED_SIGNATURE`);
}

function assertExactSettlementTransfer(
  transaction: Transaction,
  intent: ControlledBookingTransferIntent,
): void {
  requireExact(transaction instanceof TransferTransaction, "CONTROLLED_TRANSFER_TYPE_MISMATCH");
  assertNoSignatures(transaction, "CONTROLLED_TRANSFER_UNEXPECTED_SIGNATURE");
  requireExact(transaction.hbarTransfers.size === 0, "CONTROLLED_TRANSFER_HBAR_SCOPE_WIDENED");
  assertSerializedPayer(
    transaction,
    intent.delegatedAgentAccountId,
    "CONTROLLED_TRANSFER_ALLOWANCE_PAYER_MISMATCH",
  );

  const nftEntries = Array.from(transaction.nftTransfers);
  requireExact(nftEntries.length === 1, "CONTROLLED_TRANSFER_NFT_SCOPE_WIDENED");
  const [bookingTokenId, nftRows] = nftEntries[0];
  requireExact(
    bookingTokenId.toString() === canonicalToken(intent.bookingTokenId),
    "CONTROLLED_TRANSFER_BOOKING_TOKEN_MISMATCH",
  );
  requireExact(nftRows.length === 1, "CONTROLLED_TRANSFER_NFT_SCOPE_WIDENED");
  const nft = nftRows[0];
  requireExact(Number(nft.serial.toString()) === intent.serial, "CONTROLLED_TRANSFER_SERIAL_MISMATCH");
  requireExact(
    nft.sender.toString() === canonicalAccount(intent.sellerAccountId),
    "CONTROLLED_TRANSFER_SELLER_MISMATCH",
  );
  requireExact(
    nft.recipient.toString() === canonicalAccount(intent.receiverAccountId),
    "CONTROLLED_TRANSFER_RECEIVER_MISMATCH",
  );
  requireExact(nft.isApproved === true, "CONTROLLED_TRANSFER_NFT_NOT_APPROVED");

  const tokenEntries = Array.from(transaction.tokenTransfers);
  requireExact(tokenEntries.length === 1, "CONTROLLED_TRANSFER_FUNGIBLE_SCOPE_WIDENED");
  const [settlementTokenId, balances] = tokenEntries[0];
  requireExact(
    settlementTokenId.toString() === canonicalToken(intent.settlementTokenId),
    "CONTROLLED_TRANSFER_SETTLEMENT_TOKEN_MISMATCH",
  );
  requireExact(balances.size === 2, "CONTROLLED_TRANSFER_SETTLEMENT_SCOPE_WIDENED");
  const amount = BigInt(intent.settlementAmountAtomicUnits);
  const source = balances.get(canonicalAccount(intent.settlementSourceAccountId));
  const recipient = balances.get(canonicalAccount(intent.settlementRecipientAccountId));
  requireExact(
    source !== null && source !== undefined && BigInt(source.toString()) === -amount,
    "CONTROLLED_TRANSFER_SOURCE_AMOUNT_MISMATCH",
  );
  requireExact(
    recipient !== null && recipient !== undefined && BigInt(recipient.toString()) === amount,
    "CONTROLLED_TRANSFER_RECIPIENT_AMOUNT_MISMATCH",
  );
  requireExact(
    transaction.tokenIdDecimals.get(canonicalToken(intent.settlementTokenId)) === intent.settlementDecimals,
    "CONTROLLED_TRANSFER_DECIMALS_MISMATCH",
  );
}

/**
 * Build a credential-free HIP-551 transaction shape for a production-style,
 * default-frozen booking-right collection. No private key is accepted or read,
 * and nothing is signed or submitted.
 *
 * The delegated agent remains the payer of the approved-NFT transfer inner
 * transaction because current YourTurn allowance semantics bind the approved
 * spender to that transfer. The provider operations role pays freeze/unfreeze
 * operations and the outer batch. HIP-551 assesses each inner fee independently,
 * so this helper intentionally does NOT claim a distinct provider payer sponsors
 * the delegated agent's inner transfer fee.
 */
export function buildControlledBookingTransferBatch(input: unknown): BatchTransaction {
  const intent = parseIntent(input);
  const batchKey = PublicKey.fromString(intent.batchKeyPublicKey);
  const bookingTokenId = TokenId.fromString(intent.bookingTokenId);
  const seller = AccountId.fromString(intent.sellerAccountId);
  const receiver = AccountId.fromString(intent.receiverAccountId);

  const inner: Transaction[] = [];
  inner.push(
    freezeBatchInner(
      new TokenUnfreezeTransaction({ tokenId: bookingTokenId, accountId: seller }),
      intent.providerOperationsAccountId,
      batchKey,
    ),
  );
  if (intent.currentState.receiverRelationshipFrozen) {
    inner.push(
      freezeBatchInner(
        new TokenUnfreezeTransaction({ tokenId: bookingTokenId, accountId: receiver }),
        intent.providerOperationsAccountId,
        batchKey,
      ),
    );
  }

  const transfer = new TransferTransaction()
    .addApprovedNftTransfer(new NftId(bookingTokenId, intent.serial), seller, receiver)
    .addTokenTransferWithDecimals(
      intent.settlementTokenId,
      intent.settlementSourceAccountId,
      -BigInt(intent.settlementAmountAtomicUnits),
      intent.settlementDecimals,
    )
    .addTokenTransferWithDecimals(
      intent.settlementTokenId,
      intent.settlementRecipientAccountId,
      BigInt(intent.settlementAmountAtomicUnits),
      intent.settlementDecimals,
    );
  inner.push(freezeBatchInner(transfer, intent.delegatedAgentAccountId, batchKey));

  inner.push(
    freezeBatchInner(
      new TokenFreezeTransaction({ tokenId: bookingTokenId, accountId: seller }),
      intent.providerOperationsAccountId,
      batchKey,
    ),
  );
  // Receiver is always frozen after transfer, even if it was already unfrozen.
  inner.push(
    freezeBatchInner(
      new TokenFreezeTransaction({ tokenId: bookingTokenId, accountId: receiver }),
      intent.providerOperationsAccountId,
      batchKey,
    ),
  );

  const batch = new BatchTransaction().setInnerTransactions(inner);
  batch.setTransactionId(TransactionId.generate(AccountId.fromString(intent.providerOperationsAccountId)));
  batch.setNodeAccountIds([AccountId.fromString(intent.nodeAccountId)]);
  batch.freeze();
  return batch;
}

/** Fail-closed structural validator for the exact selected production shape. */
export function validateControlledBookingTransferBatch(
  transaction: Transaction,
  expected: unknown,
): BatchTransaction {
  const intent = parseIntent(expected);
  requireExact(transaction instanceof BatchTransaction, "CONTROLLED_BATCH_TYPE_REQUIRED");
  assertNoSignatures(transaction, "CONTROLLED_BATCH_UNEXPECTED_SIGNATURE");
  requireExact(
    transaction.transactionId?.accountId?.toString() === canonicalAccount(intent.providerOperationsAccountId),
    "CONTROLLED_BATCH_PAYER_MISMATCH",
  );

  const inner = transaction.innerTransactions;
  const expectedCount = intent.currentState.receiverRelationshipFrozen ? 5 : 4;
  requireExact(inner.length === expectedCount, "CONTROLLED_BATCH_INNER_SCOPE_WIDENED");

  let index = 0;
  assertFreezeOperation(
    inner[index++],
    "unfreeze",
    intent.bookingTokenId,
    intent.sellerAccountId,
    intent.providerOperationsAccountId,
  );
  if (intent.currentState.receiverRelationshipFrozen) {
    assertFreezeOperation(
      inner[index++],
      "unfreeze",
      intent.bookingTokenId,
      intent.receiverAccountId,
      intent.providerOperationsAccountId,
    );
  }
  assertExactSettlementTransfer(inner[index++], intent);
  assertFreezeOperation(
    inner[index++],
    "freeze",
    intent.bookingTokenId,
    intent.sellerAccountId,
    intent.providerOperationsAccountId,
  );
  assertFreezeOperation(
    inner[index++],
    "freeze",
    intent.bookingTokenId,
    intent.receiverAccountId,
    intent.providerOperationsAccountId,
  );
  requireExact(index === inner.length, "CONTROLLED_BATCH_EXTRA_INNER_TRANSACTION");

  const expectedBatchKey = PublicKey.fromString(intent.batchKeyPublicKey).toString();
  for (const item of inner) {
    requireExact(item.batchKey?.toString() === expectedBatchKey, "CONTROLLED_BATCH_KEY_MISMATCH");
  }
  return transaction;
}

export function decodeAndValidateControlledBookingTransferBatch(
  bytes: Uint8Array,
  expected: unknown,
): BatchTransaction {
  return validateControlledBookingTransferBatch(Transaction.fromBytes(bytes), expected);
}
