import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sagaPath = process.env.WORLD_SAGA_PATH || "/mnt/data/recovery-saga.ts";
const saga = await readFile(sagaPath, "utf8");

// Source assertions: the production reconciler must reason from Mirror's
// assessed custom-fee representation, not compare gross refund directly to net
// account balance changes.
assert.match(saga, /assessed_custom_fees\?: MirrorAssessedCustomFee\[\]/);
assert.match(saga, /feeCollectorAccountId: getFeeCollectorAccountId\(\)\.toString\(\)/);
assert.match(saga, /holderNet \+ royaltyAmount !== expectedRefund/);
assert.match(saga, /treasuryNet - treasuryRoyaltyCredit > -expectedRefund/);
assert.match(saga, /transaction\.token_transfers\?\.length/);
assert.match(saga, /transaction\.nft_transfers\?\.length/);
assert.doesNotMatch(saga, /holderNet !== expectedRefund/);
assert.doesNotMatch(saga, /treasury_owner:/);

function accountsEqual(a, b) {
  return String(a).trim() === String(b).trim();
}

function normalizeTransactionId(txId) {
  const clean = txId.replace(/\?scheduled$/, "");
  const [account, timestamp] = clean.split("@");
  return account && timestamp ? `${account}-${timestamp.replace(".", "-")}` : clean;
}

function mirrorAmount(value) {
  if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === "string" && /^-?\d+$/.test(value)) return BigInt(value);
  return null;
}

function sumHbarTransfers(transfers, accountId) {
  let found = false;
  let total = 0n;
  for (const transfer of transfers ?? []) {
    if (!transfer.account || !accountsEqual(transfer.account, accountId)) continue;
    const amount = mirrorAmount(transfer.amount);
    if (amount === null) return null;
    total += amount;
    found = true;
  }
  return found ? total : null;
}

function assessedRoyaltyAmount({ fees, holderAccountId, feeCollectorAccountId }) {
  if (!Array.isArray(fees) || fees.length !== 1) return null;
  const [fee] = fees;
  if (!fee || fee.token_id != null || !fee.collector_account_id) return null;
  if (!accountsEqual(fee.collector_account_id, feeCollectorAccountId)) return null;
  const payers = fee.effective_payer_account_ids;
  if (
    !Array.isArray(payers) ||
    payers.length !== 1 ||
    !accountsEqual(payers[0], holderAccountId)
  ) {
    return null;
  }
  const amount = mirrorAmount(fee.amount);
  if (amount === null || amount <= 0n) return null;
  return amount;
}

function verifyMirrorTransaction(response, input) {
  const transactions = response?.transactions;
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return { status: "missing" };
  }

  const expectedId = normalizeTransactionId(input.transactionId);
  const transaction = transactions.find(
    (candidate) =>
      typeof candidate.transaction_id === "string" &&
      normalizeTransactionId(candidate.transaction_id) === expectedId &&
      (candidate.nonce ?? 0) === 0
  );
  if (!transaction) return { status: "mismatch", reason: "wrong_tx" };
  if (transaction.result !== "SUCCESS") return { status: "mismatch", reason: "status" };

  const expectedRefund = BigInt(input.expectedRefundTinybars);
  const holderNet = sumHbarTransfers(transaction.transfers, input.holderAccountId);
  const treasuryNet = sumHbarTransfers(transaction.transfers, input.treasuryAccountId);
  const royaltyAmount = assessedRoyaltyAmount({
    fees: transaction.assessed_custom_fees,
    holderAccountId: input.holderAccountId,
    feeCollectorAccountId: input.feeCollectorAccountId,
  });
  const matchingNftTransfers = (transaction.nft_transfers ?? []).filter(
    (transfer) =>
      transfer.token_id === input.tokenId &&
      transfer.serial_number === input.serial &&
      transfer.sender_account_id &&
      transfer.receiver_account_id &&
      accountsEqual(transfer.sender_account_id, input.holderAccountId) &&
      accountsEqual(transfer.receiver_account_id, input.treasuryAccountId)
  );

  if (royaltyAmount === null || royaltyAmount >= expectedRefund) {
    return { status: "mismatch", reason: "royalty" };
  }
  if ((transaction.token_transfers?.length ?? 0) !== 0) {
    return { status: "mismatch", reason: "fungible_token_transfer" };
  }
  if ((transaction.nft_transfers?.length ?? 0) !== 1 || matchingNftTransfers.length !== 1) {
    return { status: "mismatch", reason: "nft" };
  }
  if (holderNet === null || holderNet + royaltyAmount !== expectedRefund) {
    return { status: "mismatch", reason: "holder_gross" };
  }

  const treasuryRoyaltyCredit = accountsEqual(
    input.feeCollectorAccountId,
    input.treasuryAccountId
  )
    ? royaltyAmount
    : 0n;
  if (treasuryNet === null || treasuryNet - treasuryRoyaltyCredit > -expectedRefund) {
    return { status: "mismatch", reason: "treasury_gross" };
  }
  return { status: "confirmed" };
}

const input = {
  transactionId: "0.0.8504300@1781395641.257640813",
  tokenId: "0.0.8505698",
  serial: 185,
  holderAccountId: "0.0.8504405",
  treasuryAccountId: "0.0.8504300",
  feeCollectorAccountId: "0.0.8504300",
  expectedRefundTinybars: 1_800_000_000n, // 18 HBAR gross refund
};
const royalty = 180_000_000; // exact 10% BOOKED royalty
const networkFee = 1_000_000; // payer-only network fee folded into treasury NET

function legitimate(overrides = {}) {
  const tx = {
    transaction_id: "0.0.8504300-1781395641-257640813",
    nonce: 0,
    result: "SUCCESS",
    // Mirror balance changes are NET after custom fees. Holder receives 18 HBAR
    // gross but pays 1.8 HBAR royalty: +16.2 HBAR net. Treasury is also the fee
    // collector, so -18 +1.8 - network fee = -16.21 HBAR net.
    transfers: [
      { account: input.holderAccountId, amount: 1_620_000_000 },
      { account: input.treasuryAccountId, amount: -(1_620_000_000 + networkFee) },
    ],
    nft_transfers: [
      {
        token_id: input.tokenId,
        serial_number: input.serial,
        sender_account_id: input.holderAccountId,
        receiver_account_id: input.treasuryAccountId,
      },
    ],
    token_transfers: [],
    assessed_custom_fees: [
      {
        amount: royalty,
        collector_account_id: input.feeCollectorAccountId,
        effective_payer_account_ids: [input.holderAccountId],
        token_id: null,
      },
    ],
    ...overrides,
  };
  return { transactions: [tx] };
}

assert.deepEqual(verifyMirrorTransaction(legitimate(), input), { status: "confirmed" });

// Network fees may vary; because treasury is transaction payer, a larger network
// fee only makes its adjusted debit more negative and must not invalidate proof.
assert.deepEqual(
  verifyMirrorTransaction(
    legitimate({
      transfers: [
        { account: input.holderAccountId, amount: 1_620_000_000 },
        { account: input.treasuryAccountId, amount: -1_700_000_000 },
      ],
    }),
    input
  ),
  { status: "confirmed" }
);

// Missing exact tx after crash remains missing so retry is constrained to the
// already-persisted operation-bound transaction id.
assert.deepEqual(verifyMirrorTransaction({ transactions: [] }, input), { status: "missing" });

const negativeCases = [
  ["non_refund_treasury_transfer", legitimate({ transfers: [{ account: input.treasuryAccountId, amount: -networkFee }], assessed_custom_fees: [] })],
  ["wrong_holder_amount", legitimate({ transfers: [{ account: input.holderAccountId, amount: 1_619_999_999 }, { account: input.treasuryAccountId, amount: -(1_620_000_000 + networkFee) }] })],
  ["wrong_treasury_amount", legitimate({ transfers: [{ account: input.holderAccountId, amount: 1_620_000_000 }, { account: input.treasuryAccountId, amount: -1_619_999_999 }] })],
  ["wrong_token", legitimate({ nft_transfers: [{ token_id: "0.0.999", serial_number: input.serial, sender_account_id: input.holderAccountId, receiver_account_id: input.treasuryAccountId }] })],
  ["wrong_serial", legitimate({ nft_transfers: [{ token_id: input.tokenId, serial_number: input.serial + 1, sender_account_id: input.holderAccountId, receiver_account_id: input.treasuryAccountId }] })],
  ["wrong_sender", legitimate({ nft_transfers: [{ token_id: input.tokenId, serial_number: input.serial, sender_account_id: "0.0.999", receiver_account_id: input.treasuryAccountId }] })],
  ["wrong_receiver", legitimate({ nft_transfers: [{ token_id: input.tokenId, serial_number: input.serial, sender_account_id: input.holderAccountId, receiver_account_id: "0.0.999" }] })],
  ["wrong_status", legitimate({ result: "INVALID_SIGNATURE" })],
  ["wrong_tx_id", legitimate({ transaction_id: "0.0.8504300-1781395641-257640814" })],
  ["wrong_nonce", legitimate({ nonce: 1 })],
  ["wrong_fee_collector", legitimate({ assessed_custom_fees: [{ amount: royalty, collector_account_id: "0.0.999", effective_payer_account_ids: [input.holderAccountId], token_id: null }] })],
  ["wrong_fee_payer", legitimate({ assessed_custom_fees: [{ amount: royalty, collector_account_id: input.feeCollectorAccountId, effective_payer_account_ids: [input.treasuryAccountId], token_id: null }] })],
  ["token_denom_fee", legitimate({ assessed_custom_fees: [{ amount: royalty, collector_account_id: input.feeCollectorAccountId, effective_payer_account_ids: [input.holderAccountId], token_id: "0.0.777" }] })],
  ["missing_fee", legitimate({ assessed_custom_fees: [] })],
  ["extra_fee", legitimate({ assessed_custom_fees: [
    { amount: royalty, collector_account_id: input.feeCollectorAccountId, effective_payer_account_ids: [input.holderAccountId], token_id: null },
    { amount: 1, collector_account_id: input.feeCollectorAccountId, effective_payer_account_ids: [input.holderAccountId], token_id: null },
  ] })],
  ["royalty_not_less_than_gross", legitimate({ assessed_custom_fees: [{ amount: 1_800_000_000, collector_account_id: input.feeCollectorAccountId, effective_payer_account_ids: [input.holderAccountId], token_id: null }] })],
  ["unexpected_fungible_transfer", legitimate({ token_transfers: [{ token_id: "0.0.777", account: input.holderAccountId, amount: 1 }] })],
  ["extra_nft", legitimate({ nft_transfers: [
    { token_id: input.tokenId, serial_number: input.serial, sender_account_id: input.holderAccountId, receiver_account_id: input.treasuryAccountId },
    { token_id: input.tokenId, serial_number: input.serial + 1, sender_account_id: input.holderAccountId, receiver_account_id: input.treasuryAccountId },
  ] })],
];

for (const [name, response] of negativeCases) {
  const result = verifyMirrorTransaction(response, input);
  assert.equal(result.status, "mismatch", `${name} must fail closed: ${JSON.stringify(result)}`);
}

console.log(JSON.stringify({
  ok: true,
  fixture: "world-sec-world-006-royalty-regression",
  positive: "BOOKED 10% royalty Mirror-shaped exact tx",
  negatives: negativeCases.map(([name]) => name),
  evidence: "LOCAL/FIXTURE_ONLY",
}));
