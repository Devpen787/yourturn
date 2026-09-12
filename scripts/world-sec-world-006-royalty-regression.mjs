import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sagaPath =
  process.env.WORLD_SAGA_PATH || "lib/world-agentkit/recovery-saga.ts";
const saga = await readFile(sagaPath, "utf8");

// Source assertions: exact-economic reconciliation must bind the fee debit to
// Mirror's exact charged_tx_fee + transaction payer and reject unrelated HBAR
// effects. The prior open-ended "more negative treasury == fee" tolerance must
// never return.
assert.match(saga, /charged_tx_fee\?: number \| string/);
assert.match(saga, /function transactionPayerAccountId/);
assert.match(saga, /function verifyRecoveryHbarEconomics/);
assert.match(saga, /networkFeeCredits !== input\.chargedTxFee/);
assert.match(saga, /if \(amount < 0n\)/);
assert.match(saga, /transactionPayerAccountId: payerAccountId/);
assert.match(
  saga,
  /feeCollectorAccountId: getFeeCollectorAccountId\(\)\.toString\(\)/
);
assert.doesNotMatch(
  saga,
  /treasuryNet\s*-\s*treasuryRoyaltyCredit\s*>\s*-expectedRefund/
);
assert.doesNotMatch(saga, /treasury_owner:/);

function accountsEqual(a, b) {
  return String(a).trim() === String(b).trim();
}

function normalizeTransactionId(txId) {
  const clean = txId.replace(/\?scheduled$/, "");
  const [account, timestamp] = clean.split("@");
  return account && timestamp
    ? `${account}-${timestamp.replace(".", "-")}`
    : clean;
}

function transactionPayerAccountId(txId) {
  const clean = txId.replace(/\?scheduled$/, "");
  const atFormat = /^(\d+\.\d+\.\d+)@\d+\.\d+$/.exec(clean);
  if (atFormat?.[1]) return atFormat[1];
  const mirrorFormat = /^(\d+\.\d+\.\d+)-\d+-\d+(?:-\d+)?$/.exec(clean);
  return mirrorFormat?.[1] ?? null;
}

function mirrorAmount(value) {
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return BigInt(value);
  }
  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    return BigInt(value);
  }
  return null;
}

function sumHbarTransfers(transfers, accountId) {
  let found = false;
  let total = 0n;
  for (const transfer of transfers ?? []) {
    if (!transfer.account || !accountsEqual(transfer.account, accountId)) {
      continue;
    }
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

function verifyHbarEconomics(input) {
  if (!Array.isArray(input.transfers)) return false;

  const expected = [];
  const addExpected = (accountId, amount) => {
    const current = expected.find((entry) =>
      accountsEqual(entry.accountId, accountId)
    );
    if (current) current.amount += amount;
    else expected.push({ accountId, amount });
  };

  addExpected(
    input.holderAccountId,
    input.expectedRefund - input.royaltyAmount
  );
  addExpected(input.treasuryAccountId, -input.expectedRefund);
  addExpected(input.feeCollectorAccountId, input.royaltyAmount);
  addExpected(input.transactionPayerAccountId, -input.chargedTxFee);

  for (const principal of expected) {
    const actual = sumHbarTransfers(input.transfers, principal.accountId);
    if (actual === null || actual !== principal.amount) return false;
  }

  let networkFeeCredits = 0n;
  for (const transfer of input.transfers) {
    if (!transfer.account) return false;
    const amount = mirrorAmount(transfer.amount);
    if (amount === null) return false;
    if (
      expected.some((principal) =>
        accountsEqual(principal.accountId, transfer.account)
      )
    ) {
      continue;
    }
    if (amount < 0n) return false;
    networkFeeCredits += amount;
  }
  return networkFeeCredits === input.chargedTxFee;
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
  if (transaction.result !== "SUCCESS") {
    return { status: "mismatch", reason: "status" };
  }

  const expectedRefund = BigInt(input.expectedRefundTinybars);
  const royaltyAmount = assessedRoyaltyAmount({
    fees: transaction.assessed_custom_fees,
    holderAccountId: input.holderAccountId,
    feeCollectorAccountId: input.feeCollectorAccountId,
  });
  if (royaltyAmount === null || royaltyAmount >= expectedRefund) {
    return { status: "mismatch", reason: "royalty" };
  }

  const chargedTxFee = mirrorAmount(transaction.charged_tx_fee);
  const payerAccountId = transaction.transaction_id
    ? transactionPayerAccountId(transaction.transaction_id)
    : null;
  if (chargedTxFee === null || chargedTxFee < 0n || !payerAccountId) {
    return { status: "mismatch", reason: "charged_fee_or_payer" };
  }

  const matchingNftTransfers = (transaction.nft_transfers ?? []).filter(
    (transfer) =>
      transfer.token_id === input.tokenId &&
      transfer.serial_number === input.serial &&
      transfer.sender_account_id &&
      transfer.receiver_account_id &&
      accountsEqual(transfer.sender_account_id, input.holderAccountId) &&
      accountsEqual(transfer.receiver_account_id, input.treasuryAccountId)
  );
  if ((transaction.token_transfers?.length ?? 0) !== 0) {
    return { status: "mismatch", reason: "fungible_token_transfer" };
  }
  if (
    (transaction.nft_transfers?.length ?? 0) !== 1 ||
    matchingNftTransfers.length !== 1
  ) {
    return { status: "mismatch", reason: "nft" };
  }

  if (
    !verifyHbarEconomics({
      transfers: transaction.transfers,
      holderAccountId: input.holderAccountId,
      treasuryAccountId: input.treasuryAccountId,
      feeCollectorAccountId: input.feeCollectorAccountId,
      transactionPayerAccountId: payerAccountId,
      expectedRefund,
      royaltyAmount,
      chargedTxFee,
    })
  ) {
    return { status: "mismatch", reason: "hbar_economics" };
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
  expectedRefundTinybars: 1_800_000_000n,
};
const royalty = 180_000_000; // exact BOOKED 10% royalty
const networkFee = 1_000_000;

function legitimate(overrides = {}) {
  const tx = {
    transaction_id: "0.0.8504300-1781395641-257640813",
    nonce: 0,
    result: "SUCCESS",
    charged_tx_fee: networkFee,
    // Exact Mirror-shaped balance economics for an 18 HBAR gross refund where
    // treasury is also royalty collector and tx payer. Fee credits are explicit.
    transfers: [
      { account: input.holderAccountId, amount: 1_620_000_000 },
      { account: input.treasuryAccountId, amount: -1_621_000_000 },
      { account: "0.0.3", amount: 600_000 },
      { account: "0.0.98", amount: 400_000 },
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

assert.deepEqual(verifyMirrorTransaction(legitimate(), input), {
  status: "confirmed",
});

// A different exact charged fee is valid only if the payer debit and explicit
// network-fee credits change by exactly the same amount.
const largerFee = 2_500_000;
assert.deepEqual(
  verifyMirrorTransaction(
    legitimate({
      charged_tx_fee: largerFee,
      transfers: [
        { account: input.holderAccountId, amount: 1_620_000_000 },
        {
          account: input.treasuryAccountId,
          amount: -(1_620_000_000 + largerFee),
        },
        { account: "0.0.3", amount: 1_500_000 },
        { account: "0.0.98", amount: 1_000_000 },
      ],
    }),
    input
  ),
  { status: "confirmed" }
);

// If transaction payer is not treasury, treasury's authorized net is exact;
// the payer alone carries charged_tx_fee.
const externalPayerInput = {
  ...input,
  transactionId: "0.0.9000@1781395641.257640813",
};
assert.deepEqual(
  verifyMirrorTransaction(
    legitimate({
      transaction_id: "0.0.9000-1781395641-257640813",
      transfers: [
        { account: input.holderAccountId, amount: 1_620_000_000 },
        { account: input.treasuryAccountId, amount: -1_620_000_000 },
        { account: "0.0.9000", amount: -networkFee },
        { account: "0.0.3", amount: 600_000 },
        { account: "0.0.98", amount: 400_000 },
      ],
    }),
    externalPayerInput
  ),
  { status: "confirmed" }
);

assert.deepEqual(verifyMirrorTransaction({ transactions: [] }, input), {
  status: "missing",
});

const negativeCases = [
  [
    "security_substitution_a_to_holder_treasury_to_b",
    legitimate({
      transfers: [
        { account: input.holderAccountId, amount: 1_620_000_000 },
        { account: input.treasuryAccountId, amount: -1_621_000_000 },
        { account: "0.0.7001", amount: -1_620_000_000 },
        { account: "0.0.7002", amount: 1_620_000_000 },
        { account: "0.0.3", amount: 600_000 },
        { account: "0.0.98", amount: 400_000 },
      ],
    }),
  ],
  [
    "non_refund_treasury_transfer",
    legitimate({
      transfers: [
        { account: input.treasuryAccountId, amount: -networkFee },
        { account: "0.0.3", amount: networkFee },
      ],
      assessed_custom_fees: [],
    }),
  ],
  [
    "wrong_holder_amount",
    legitimate({
      transfers: [
        { account: input.holderAccountId, amount: 1_619_999_999 },
        { account: input.treasuryAccountId, amount: -1_621_000_000 },
        { account: "0.0.3", amount: 600_000 },
        { account: "0.0.98", amount: 400_000 },
      ],
    }),
  ],
  [
    "wrong_treasury_amount",
    legitimate({
      transfers: [
        { account: input.holderAccountId, amount: 1_620_000_000 },
        { account: input.treasuryAccountId, amount: -1_620_999_999 },
        { account: "0.0.3", amount: 600_000 },
        { account: "0.0.98", amount: 400_000 },
      ],
    }),
  ],
  ["charged_tx_fee_mismatch", legitimate({ charged_tx_fee: 999_999 })],
  [
    "network_fee_credit_mismatch",
    legitimate({
      transfers: [
        { account: input.holderAccountId, amount: 1_620_000_000 },
        { account: input.treasuryAccountId, amount: -1_621_000_000 },
        { account: "0.0.3", amount: 500_000 },
        { account: "0.0.98", amount: 400_000 },
      ],
    }),
  ],
  [
    "unrelated_negative_account",
    legitimate({
      transfers: [
        { account: input.holderAccountId, amount: 1_620_000_000 },
        { account: input.treasuryAccountId, amount: -1_621_000_000 },
        { account: "0.0.7001", amount: -1 },
        { account: "0.0.3", amount: 600_001 },
        { account: "0.0.98", amount: 400_000 },
      ],
    }),
  ],
  [
    "wrong_token",
    legitimate({
      nft_transfers: [
        {
          token_id: "0.0.999",
          serial_number: input.serial,
          sender_account_id: input.holderAccountId,
          receiver_account_id: input.treasuryAccountId,
        },
      ],
    }),
  ],
  [
    "wrong_serial",
    legitimate({
      nft_transfers: [
        {
          token_id: input.tokenId,
          serial_number: input.serial + 1,
          sender_account_id: input.holderAccountId,
          receiver_account_id: input.treasuryAccountId,
        },
      ],
    }),
  ],
  [
    "wrong_sender",
    legitimate({
      nft_transfers: [
        {
          token_id: input.tokenId,
          serial_number: input.serial,
          sender_account_id: "0.0.999",
          receiver_account_id: input.treasuryAccountId,
        },
      ],
    }),
  ],
  [
    "wrong_receiver",
    legitimate({
      nft_transfers: [
        {
          token_id: input.tokenId,
          serial_number: input.serial,
          sender_account_id: input.holderAccountId,
          receiver_account_id: "0.0.999",
        },
      ],
    }),
  ],
  ["wrong_status", legitimate({ result: "INVALID_SIGNATURE" })],
  [
    "wrong_tx_id",
    legitimate({ transaction_id: "0.0.8504300-1781395641-257640814" }),
  ],
  ["wrong_nonce", legitimate({ nonce: 1 })],
  [
    "wrong_fee_collector",
    legitimate({
      assessed_custom_fees: [
        {
          amount: royalty,
          collector_account_id: "0.0.999",
          effective_payer_account_ids: [input.holderAccountId],
          token_id: null,
        },
      ],
    }),
  ],
  [
    "wrong_fee_payer",
    legitimate({
      assessed_custom_fees: [
        {
          amount: royalty,
          collector_account_id: input.feeCollectorAccountId,
          effective_payer_account_ids: [input.treasuryAccountId],
          token_id: null,
        },
      ],
    }),
  ],
  [
    "token_denom_fee",
    legitimate({
      assessed_custom_fees: [
        {
          amount: royalty,
          collector_account_id: input.feeCollectorAccountId,
          effective_payer_account_ids: [input.holderAccountId],
          token_id: "0.0.777",
        },
      ],
    }),
  ],
  ["missing_fee", legitimate({ assessed_custom_fees: [] })],
  [
    "extra_fee",
    legitimate({
      assessed_custom_fees: [
        {
          amount: royalty,
          collector_account_id: input.feeCollectorAccountId,
          effective_payer_account_ids: [input.holderAccountId],
          token_id: null,
        },
        {
          amount: 1,
          collector_account_id: input.feeCollectorAccountId,
          effective_payer_account_ids: [input.holderAccountId],
          token_id: null,
        },
      ],
    }),
  ],
  [
    "royalty_not_less_than_gross",
    legitimate({
      assessed_custom_fees: [
        {
          amount: 1_800_000_000,
          collector_account_id: input.feeCollectorAccountId,
          effective_payer_account_ids: [input.holderAccountId],
          token_id: null,
        },
      ],
    }),
  ],
  [
    "unexpected_fungible_transfer",
    legitimate({
      token_transfers: [
        { token_id: "0.0.777", account: input.holderAccountId, amount: 1 },
      ],
    }),
  ],
  [
    "extra_nft",
    legitimate({
      nft_transfers: [
        {
          token_id: input.tokenId,
          serial_number: input.serial,
          sender_account_id: input.holderAccountId,
          receiver_account_id: input.treasuryAccountId,
        },
        {
          token_id: input.tokenId,
          serial_number: input.serial + 1,
          sender_account_id: input.holderAccountId,
          receiver_account_id: input.treasuryAccountId,
        },
      ],
    }),
  ],
];

for (const [name, response] of negativeCases) {
  const result = verifyMirrorTransaction(response, input);
  assert.equal(
    result.status,
    "mismatch",
    `${name} must fail closed: ${JSON.stringify(result)}`
  );
}

console.log(
  JSON.stringify({
    ok: true,
    fixture: "world-sec-world-006-royalty-regression",
    positives: [
      "BOOKED 10% royalty + exact charged_tx_fee with treasury payer",
      "different exact charged fee with matching payer debit and fee credits",
      "non-treasury payer keeps treasury economics exact",
    ],
    negatives: negativeCases.map(([name]) => name),
    evidence: "LOCAL/FIXTURE_ONLY",
  })
);
