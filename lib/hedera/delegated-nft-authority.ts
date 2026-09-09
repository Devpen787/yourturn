import {
  AccountAllowanceApproveTransaction,
  AccountAllowanceDeleteTransaction,
  AccountId,
  NftId,
  TokenId,
  TransactionId,
  TransferTransaction,
} from "@hiero-ledger/sdk";

export type SerialScopedNftAuthority = {
  tokenId: string;
  serial: number;
  ownerAccountId: string;
  spenderAccountId: string;
};

function parseAuthority(authority: SerialScopedNftAuthority) {
  if (!Number.isSafeInteger(authority.serial) || authority.serial <= 0) {
    throw new Error("serial must be a positive safe integer");
  }

  const tokenId = TokenId.fromString(authority.tokenId);
  const ownerAccountId = AccountId.fromString(authority.ownerAccountId);
  const spenderAccountId = AccountId.fromString(authority.spenderAccountId);
  const nftId = new NftId(tokenId, authority.serial);

  return { tokenId, ownerAccountId, spenderAccountId, nftId };
}

/**
 * Builds a Hedera-native allowance for exactly one NFT serial.
 *
 * Deliberately does not expose approveTokenNftAllowanceAllSerials: YourTurn's
 * delegated-recovery hero path must never silently widen authority to every
 * booking NFT owned by the holder.
 */
export function buildSerialScopedNftAllowance(
  authority: SerialScopedNftAuthority
): AccountAllowanceApproveTransaction {
  const { nftId, ownerAccountId, spenderAccountId } = parseAuthority(authority);

  return new AccountAllowanceApproveTransaction().approveTokenNftAllowance(
    nftId,
    ownerAccountId,
    spenderAccountId
  );
}

/** Remove authority for one serial only. */
export function buildSerialScopedNftRevocation(
  authority: SerialScopedNftAuthority
): AccountAllowanceDeleteTransaction {
  const { nftId, ownerAccountId } = parseAuthority(authority);

  return new AccountAllowanceDeleteTransaction().deleteAllTokenNftAllowances(
    nftId,
    ownerAccountId
  );
}

/**
 * Builds the transfer a delegated spender submits after YourTurn policy allows
 * the recovery action. Hedera's approved-transfer flag makes the allowance
 * load-bearing: the owner does not sign this transfer transaction.
 */
export function buildApprovedSerialTransfer(args: {
  authority: SerialScopedNftAuthority;
  receiverAccountId: string;
}): TransferTransaction {
  const { nftId, ownerAccountId, spenderAccountId } = parseAuthority(args.authority);
  const receiverAccountId = AccountId.fromString(args.receiverAccountId);

  return new TransferTransaction()
    .addApprovedNftTransfer(nftId, ownerAccountId, receiverAccountId)
    .setTransactionId(TransactionId.generate(spenderAccountId));
}

export function describeSerialScopedAuthority(authority: SerialScopedNftAuthority) {
  const { nftId, ownerAccountId, spenderAccountId } = parseAuthority(authority);
  return {
    tokenId: nftId.tokenId.toString(),
    serial: Number(nftId.serial),
    nftId: nftId.toString(),
    ownerAccountId: ownerAccountId.toString(),
    spenderAccountId: spenderAccountId.toString(),
    scope: "single_serial" as const,
    approvedForAll: false as const,
  };
}
