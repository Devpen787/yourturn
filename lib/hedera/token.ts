import {
  AccountId,
  CustomRoyaltyFee,
  Hbar,
  HbarUnit,
  PrivateKey,
  TokenAssociateTransaction,
  TokenBurnTransaction,
  TokenCreateTransaction,
  TokenFreezeTransaction,
  TokenId,
  TokenMintTransaction,
  TokenSupplyType,
  TokenType,
  TokenUnfreezeTransaction,
  TransactionId,
  TransferTransaction,
} from "@hashgraph/sdk";
import { buildNftMetadataBlob, type ImmutableSlotMetadata } from "@/lib/domain/metadata";
import {
  getActorCredentials,
  getClient,
  getFeeCollectorAccountId,
  getTreasuryAccountId,
} from "./client";

/** Royalty: numerator 1 / denominator 10 = 10%. No fallback fee in v1. */
const ROYALTY_NUM = 1;
const ROYALTY_DEN = 10;

export async function createBookedRightsToken(): Promise<string> {
  const client = getClient();
  const treasury = getActorCredentials("issuer");
  const feeCollector = getFeeCollectorAccountId();
  const royalty = new CustomRoyaltyFee({
    numerator: ROYALTY_NUM,
    denominator: ROYALTY_DEN,
    feeCollectorAccountId: feeCollector,
  });
  const tx = await new TokenCreateTransaction()
    .setTokenName("Booked Rights v1")
    .setTokenSymbol("BOOKED")
    .setTokenType(TokenType.NonFungibleUnique)
    .setDecimals(0)
    .setInitialSupply(0)
    .setSupplyType(TokenSupplyType.Infinite)
    .setTreasuryAccountId(treasury.accountId)
    .setAdminKey(treasury.privateKey.publicKey)
    .setSupplyKey(treasury.privateKey.publicKey)
    .setFreezeKey(treasury.privateKey.publicKey)
    .setCustomFees([royalty])
    .setTokenMemo("Booked Rights — transferable booking slots (demo)")
    .freezeWith(client);
  const signed = await tx.sign(treasury.privateKey);
  const response = await signed.execute(client);
  const receipt = await response.getReceipt(client);
  const id = receipt.tokenId;
  if (!id) throw new Error("TokenCreate missing tokenId");
  return id.toString();
}

export async function mintSlotNfts(
  tokenIdStr: string,
  slotMetadataArray: ImmutableSlotMetadata[]
): Promise<number[]> {
  const client = getClient();
  const treasury = getActorCredentials("issuer");
  const tokenId = TokenId.fromString(tokenIdStr);
  const metas = slotMetadataArray.map((m) => buildNftMetadataBlob(m));
  const tx = await new TokenMintTransaction()
    .setTokenId(tokenId)
    .setMetadata(metas as Uint8Array[])
    .freezeWith(client);
  const signed = await tx.sign(treasury.privateKey);
  const response = await signed.execute(client);
  const receipt = await response.getReceipt(client);
  const serials = receipt.serials;
  if (!serials?.length) throw new Error("Mint missing serials");
  return serials.map((s) => (typeof s === "number" ? s : Number(s)));
}

export async function associateTokenToAccount(
  accountIdStr: string,
  privateKeyDer: string,
  tokenIdStr: string
): Promise<void> {
  const client = getClient();
  const accountId = AccountId.fromString(accountIdStr);
  const key = PrivateKey.fromString(privateKeyDer);
  const tokenId = TokenId.fromString(tokenIdStr);
  const tx = await new TokenAssociateTransaction()
    .setAccountId(accountId)
    .setTokenIds([tokenId])
    .freezeWith(client);
  const signed = await tx.sign(key);
  const response = await signed.execute(client);
  await response.getReceipt(client);
}

export async function primaryBookTransfer(args: {
  buyerAccountId: string;
  buyerPrivateKey: string;
  serial: number;
  priceHbar: number;
  tokenIdStr: string;
}): Promise<string> {
  const client = getClient();
  const treasury = getActorCredentials("issuer");
  const buyer = PrivateKey.fromString(args.buyerPrivateKey);
  const buyerId = AccountId.fromString(args.buyerAccountId);
  const tokenId = TokenId.fromString(args.tokenIdStr);
  const price = Hbar.from(args.priceHbar, HbarUnit.Hbar);
  const tx = await new TransferTransaction()
    .addHbarTransfer(buyerId, price.negated())
    .addHbarTransfer(treasury.accountId, price)
    .addNftTransfer(tokenId, args.serial, treasury.accountId, buyerId)
    .freezeWith(client);
  let signed = await tx.sign(treasury.privateKey);
  signed = await signed.sign(buyer);
  const response = await signed.execute(client);
  await response.getReceipt(client);
  return response.transactionId.toString();
}

/**
 * Secondary sale: buyer pays seller the full ask in one HBAR leg; NFT seller→buyer.
 * Issuer royalty is enforced by HTS `CustomRoyaltyFee` on the token (1/10 → fee collector),
 * not by a second manual HBAR split (which would double-charge with the custom fee).
 */
export async function resaleTransfer(args: {
  sellerAccountId: string;
  sellerPrivateKey: string;
  buyerAccountId: string;
  buyerPrivateKey: string;
  serial: number;
  askPriceHbar: number;
  tokenIdStr: string;
}): Promise<string> {
  const client = getClient();
  const sellerId = AccountId.fromString(args.sellerAccountId);
  const buyerId = AccountId.fromString(args.buyerAccountId);
  const sellerKey = PrivateKey.fromString(args.sellerPrivateKey);
  const buyerKey = PrivateKey.fromString(args.buyerPrivateKey);
  const tokenId = TokenId.fromString(args.tokenIdStr);
  const ask = Hbar.from(args.askPriceHbar, HbarUnit.Hbar);
  const tx = await new TransferTransaction()
    .addHbarTransfer(buyerId, ask.negated())
    .addHbarTransfer(sellerId, ask)
    .addNftTransfer(tokenId, args.serial, sellerId, buyerId)
    .freezeWith(client);
  let signed = await tx.sign(sellerKey);
  signed = await signed.sign(buyerKey);
  const response = await signed.execute(client);
  await response.getReceipt(client);
  return response.transactionId.toString();
}

export async function freezeHolder(args: {
  holderAccountId: string;
  tokenIdStr: string;
}): Promise<void> {
  const client = getClient();
  const issuer = getActorCredentials("issuer");
  const tokenId = TokenId.fromString(args.tokenIdStr);
  const holder = AccountId.fromString(args.holderAccountId);
  const tx = await new TokenFreezeTransaction()
    .setAccountId(holder)
    .setTokenId(tokenId)
    .freezeWith(client);
  const signed = await tx.sign(issuer.privateKey);
  const response = await signed.execute(client);
  await response.getReceipt(client);
}

export async function unfreezeHolder(args: {
  holderAccountId: string;
  tokenIdStr: string;
}): Promise<void> {
  const client = getClient();
  const issuer = getActorCredentials("issuer");
  const tokenId = TokenId.fromString(args.tokenIdStr);
  const holder = AccountId.fromString(args.holderAccountId);
  const tx = await new TokenUnfreezeTransaction()
    .setAccountId(holder)
    .setTokenId(tokenId)
    .freezeWith(client);
  const signed = await tx.sign(issuer.privateKey);
  const response = await signed.execute(client);
  await response.getReceipt(client);
}

/**
 * Burns one NFT serial. Hedera only burns NFTs **held by the treasury** (supply key signs).
 * If a guest holds the serial, call `transferNftFromHolderToTreasury` first.
 */
export async function burnUsedSlot(args: {
  serial: number;
  tokenIdStr: string;
}): Promise<string> {
  const client = getClient();
  const treasury = getActorCredentials("issuer");
  const tokenId = TokenId.fromString(args.tokenIdStr);
  const tx = await new TokenBurnTransaction()
    .setTokenId(tokenId)
    .setSerials([args.serial])
    .freezeWith(client);
  const signed = await tx.sign(treasury.privateKey);
  const response = await signed.execute(client);
  await response.getReceipt(client);
  return response.transactionId.toString();
}

export async function transferNftFromHolderToTreasury(args: {
  holderAccountId: string;
  holderPrivateKey: string;
  serial: number;
  tokenIdStr: string;
}): Promise<string> {
  const client = getClient();
  const treasury = getActorCredentials("issuer");
  const holderId = AccountId.fromString(args.holderAccountId);
  const holderKey = PrivateKey.fromString(args.holderPrivateKey);
  const tokenId = TokenId.fromString(args.tokenIdStr);
  const tx = await new TransferTransaction()
    .addNftTransfer(tokenId, args.serial, holderId, treasury.accountId)
    .freezeWith(client);
  const signed = await tx.sign(holderKey);
  const response = await signed.execute(client);
  await response.getReceipt(client);
  return response.transactionId.toString();
}

/**
 * Generate the exact Hedera transaction id that will identify a recovery
 * transfer before any network submission occurs. Persisting this id in the
 * recovery step lets retries resubmit/reconcile the same economic attempt
 * instead of creating a second refund attempt after an ambiguous receipt.
 */
export function createOperatorTransactionId(): string {
  const operatorId = process.env.HEDERA_OPERATOR_ID;
  if (!operatorId) throw new Error("HEDERA_OPERATOR_ID is required");
  return TransactionId.generate(AccountId.fromString(operatorId)).toString();
}

export async function refundAndTransferNftFromHolderToTreasury(args: {
  holderAccountId: string;
  holderPrivateKey: string;
  serial: number;
  tokenIdStr: string;
  refundHbar: number;
  /** Reuse a durably persisted id when retrying an ambiguous submission. */
  transactionId?: string;
}): Promise<string> {
  const client = getClient();
  const treasury = getActorCredentials("issuer");
  const holderId = AccountId.fromString(args.holderAccountId);
  const holderKey = PrivateKey.fromString(args.holderPrivateKey);
  const tokenId = TokenId.fromString(args.tokenIdStr);
  const refund = Hbar.from(args.refundHbar, HbarUnit.Hbar);
  const tx = new TransferTransaction()
    .addHbarTransfer(treasury.accountId, refund.negated())
    .addHbarTransfer(holderId, refund)
    .addNftTransfer(tokenId, args.serial, holderId, treasury.accountId);
  if (args.transactionId) {
    tx.setTransactionId(TransactionId.fromString(args.transactionId));
  }
  const frozen = tx.freezeWith(client);
  let signed = await frozen.sign(treasury.privateKey);
  signed = await signed.sign(holderKey);
  const response = await signed.execute(client);
  await response.getReceipt(client);
  const actualTransactionId = response.transactionId.toString();
  if (
    args.transactionId &&
    TransactionId.fromString(actualTransactionId).toString() !==
      TransactionId.fromString(args.transactionId).toString()
  ) {
    throw new Error("Hedera refund transfer returned an unexpected transaction id");
  }
  return actualTransactionId;
}

export function getTreasuryIdString(): string {
  return getTreasuryAccountId().toString();
}
