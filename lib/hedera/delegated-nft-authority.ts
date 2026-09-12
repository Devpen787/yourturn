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
 *
 * Raw-SDK execution pins the delegated spender as payer here. HAK RETURN_BYTES
 * must leave the transaction id unset so HAK can bind it exactly once from its
 * externally signing context before freezing; setting it twice locks the SDK
 * transaction list. The default preserves the already-live H0 behavior.
 */
export function buildApprovedSerialTransfer(args: {
  authority: SerialScopedNftAuthority;
  receiverAccountId: string;
  assignSpenderTransactionId?: boolean;
}): TransferTransaction {
  const { nftId, ownerAccountId, spenderAccountId } = parseAuthority(args.authority);
  const receiverAccountId = AccountId.fromString(args.receiverAccountId);

  const transaction = new TransferTransaction().addApprovedNftTransfer(
    nftId,
    ownerAccountId,
    receiverAccountId
  );

  if (args.assignSpenderTransactionId ?? true) {
    transaction.setTransactionId(TransactionId.generate(spenderAccountId));
  }
  return transaction;
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
