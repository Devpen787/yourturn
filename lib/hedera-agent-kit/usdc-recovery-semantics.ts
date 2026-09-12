import {
  AccountId,
  TokenId,
  Transaction,
  TransferTransaction,
} from "@hiero-ledger/sdk";

/** Current Hedera testnet USDC HTS token used by YourTurn qualification. */
export const HEDERA_TESTNET_USDC_TOKEN_ID = "0.0.429274";
export const HEDERA_USDC_DECIMALS = 6;
/** Historical hero fixture, never an execution floor. */
export const HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS = "40000000";

export type AtomicUsdcRecoveryExpected = {
  bookingTokenId: string;
  serial: number;
  holderAccountId: string;
  spenderAccountId: string;
  receiverAccountId: string;
  settlementTokenId: string;
  settlementAmountAtomicUnits: string;
  settlementRecipientAccountId: string;
  settlementDecimals: number;
};

export type SeparatedAtomicUsdcRecoveryExpected = Omit<AtomicUsdcRecoveryExpected, "spenderAccountId"> & {
  delegatedAgentAccountId: string;
  settlementSourceAccountId: string;
  transactionFeePayerAccountId: string;
};

function canonicalAccountId(value: string): string {
  return AccountId.fromString(value).toString();
}

function canonicalTokenId(value: string): string {
  return TokenId.fromString(value).toString();
}

function exactAtomicUnits(value: string): bigint {
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new Error("usdc_recovery_invalid_atomic_units");
  }
  return BigInt(value);
}

/**
 * Decode-time semantic gate shared by CI and the external live signer.
 * It rejects any byte payload that widens the exact policy-approved movement.
 */
/** Historical validator adapter retained for the immutable 411f703 proof readers. */
export function validateAtomicUsdcRecoveryTransaction(
  transaction: Transaction,
  expected: AtomicUsdcRecoveryExpected
): TransferTransaction {
  return validateSeparatedAtomicUsdcRecoveryTransaction(transaction, {
    ...expected,
    delegatedAgentAccountId: expected.spenderAccountId,
    settlementSourceAccountId: expected.spenderAccountId,
    transactionFeePayerAccountId: expected.spenderAccountId,
  });
}

export function validateSeparatedAtomicUsdcRecoveryTransaction(
  transaction: Transaction,
  expected: SeparatedAtomicUsdcRecoveryExpected
): TransferTransaction {
  if (!(transaction instanceof TransferTransaction)) {
    throw new Error("usdc_recovery_wrong_transaction_type");
  }

  if (transaction.hbarTransfers.size !== 0) {
    throw new Error("usdc_recovery_unexpected_hbar_transfer");
  }

  const bookingTokenId = canonicalTokenId(expected.bookingTokenId);
  const holderAccountId = canonicalAccountId(expected.holderAccountId);
  const settlementSourceAccountId = canonicalAccountId(expected.settlementSourceAccountId);
  const receiverAccountId = canonicalAccountId(expected.receiverAccountId);
  const settlementTokenId = canonicalTokenId(expected.settlementTokenId);
  const settlementRecipientAccountId = canonicalAccountId(
    expected.settlementRecipientAccountId
  );
  const settlementAmount = exactAtomicUnits(
    expected.settlementAmountAtomicUnits
  );

  // Array.from keeps this validator compatible with the repo's current TS target
  // while consuming the SDK ObjectMap iterator without changing tsconfig.
  const nftEntries = Array.from(transaction.nftTransfers);
  if (nftEntries.length !== 1) {
    throw new Error("usdc_recovery_nft_scope_widened");
  }
  const [actualBookingToken, nftTransfers] = nftEntries[0];
  if (actualBookingToken.toString() !== bookingTokenId) {
    throw new Error("usdc_recovery_booking_token_mismatch");
  }
  if (nftTransfers.length !== 1) {
    throw new Error("usdc_recovery_nft_scope_widened");
  }
  const nft = nftTransfers[0];
  if (Number(nft.serial.toString()) !== expected.serial) {
    throw new Error("usdc_recovery_serial_mismatch");
  }
  if (nft.sender.toString() !== holderAccountId) {
    throw new Error("usdc_recovery_holder_mismatch");
  }
  if (nft.recipient.toString() !== receiverAccountId) {
    throw new Error("usdc_recovery_receiver_mismatch");
  }
  if (nft.isApproved !== true) {
    throw new Error("usdc_recovery_nft_not_approved");
  }

  const fungibleEntries = Array.from(transaction.tokenTransfers);
  if (fungibleEntries.length !== 1) {
    throw new Error("usdc_recovery_fungible_scope_widened");
  }
  const [actualSettlementToken, balances] = fungibleEntries[0];
  if (actualSettlementToken.toString() !== settlementTokenId) {
    throw new Error("usdc_recovery_settlement_token_mismatch");
  }
  if (balances.size !== 2) {
    throw new Error("usdc_recovery_settlement_scope_widened");
  }

  const spenderAmount = balances.get(settlementSourceAccountId);
  const recipientAmount = balances.get(settlementRecipientAccountId);
  if (spenderAmount == null || BigInt(spenderAmount.toString()) !== -settlementAmount) {
    throw new Error("usdc_recovery_spender_amount_mismatch");
  }
  if (
    recipientAmount == null ||
    BigInt(recipientAmount.toString()) !== settlementAmount
  ) {
    throw new Error("usdc_recovery_recipient_amount_mismatch");
  }

  const decimals = transaction.tokenIdDecimals.get(settlementTokenId);
  if (decimals !== expected.settlementDecimals) {
    throw new Error("usdc_recovery_decimals_mismatch");
  }

  if (canonicalAccountId(expected.delegatedAgentAccountId) !== canonicalAccountId(expected.transactionFeePayerAccountId)) {
    throw new Error("usdc_recovery_allowance_spender_fee_payer_mismatch");
  }
  if (transaction.transactionId?.accountId?.toString() !== canonicalAccountId(expected.transactionFeePayerAccountId)) {
    throw new Error("usdc_recovery_payer_mismatch");
  }

  return transaction;
}
