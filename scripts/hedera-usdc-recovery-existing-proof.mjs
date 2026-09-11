import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";

const MIRROR = "https://testnet.mirrornode.hedera.com/api/v1";
const transactionId = "0.0.8504405@1789139309.785362819";
const bookingTokenId = "0.0.8505698";
const bookingSerial = 213;
const holderAccountId = "0.0.8504300";
const spenderAccountId = "0.0.8504405";
const receiverAccountId = "0.0.8504715";
const usdcTokenId = "0.0.429274";
const settlementAtomicUnits = 45_000_000n;
const spenderBeforeAtomicUnits = 79_980_000n;
const holderBeforeAtomicUnits = 20_000n;
const outputPath = process.env.HEDERA_USDC_EXISTING_PROOF_OUT ?? "hedera-usdc-recovery-existing-proof.json";

function mirrorTransactionId(value) {
  const match = /^(0\.0\.\d+)@(\d+)\.(\d+)$/.exec(value);
  if (!match) throw new Error(`invalid_hedera_transaction_id:${value}`);
  return `${match[1]}-${match[2]}-${match[3]}`;
}

async function mirrorJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`mirror_http_${response.status}:${url}`);
  return response.json();
}

async function tokenState(accountId) {
  const mirror = `${MIRROR}/accounts/${accountId}/tokens?token.id=${usdcTokenId}&limit=1`;
  const body = await mirrorJson(mirror);
  const association = (body.tokens ?? []).find((item) => item.token_id === usdcTokenId);
  assert.ok(association, `missing_usdc_association:${accountId}`);
  return { accountId, atomicUnits: BigInt(association.balance), mirror };
}

const mirrorId = mirrorTransactionId(transactionId);
const transactionMirror = `${MIRROR}/transactions/${mirrorId}`;
const transactionBody = await mirrorJson(transactionMirror);
const transaction =
  (transactionBody.transactions ?? []).find((item) => item.transaction_id === mirrorId) ??
  transactionBody.transactions?.[0];
assert.ok(transaction, "mirror_transaction_missing");
assert.equal(transaction.result, "SUCCESS", "settlement_transaction_not_success");

const bookingTransfers = (transaction.nft_transfers ?? []).filter(
  (item) => item.token_id === bookingTokenId && Number(item.serial_number) === bookingSerial
);
assert.equal(bookingTransfers.length, 1, "booking_transfer_count_mismatch");
assert.equal(bookingTransfers[0].sender_account_id, holderAccountId);
assert.equal(bookingTransfers[0].receiver_account_id, receiverAccountId);
assert.equal(bookingTransfers[0].is_approval, true);

const usdcTransfers = (transaction.token_transfers ?? []).filter(
  (item) => item.token_id === usdcTokenId
);
assert.equal(usdcTransfers.length, 2, "usdc_transfer_count_mismatch");
const transferAccount = (item) => item.account ?? item.account_id;
const spenderLeg = usdcTransfers.find((item) => transferAccount(item) === spenderAccountId);
const holderLeg = usdcTransfers.find((item) => transferAccount(item) === holderAccountId);
assert.ok(spenderLeg, "missing_spender_usdc_leg");
assert.ok(holderLeg, "missing_holder_usdc_leg");
assert.equal(BigInt(spenderLeg.amount), -settlementAtomicUnits);
assert.equal(BigInt(holderLeg.amount), settlementAtomicUnits);

const ownerMirror = `${MIRROR}/tokens/${bookingTokenId}/nfts/${bookingSerial}`;
const ownerBody = await mirrorJson(ownerMirror);
assert.equal(ownerBody.account_id, receiverAccountId, "final_booking_owner_mismatch");

const [spenderState, holderState] = await Promise.all([
  tokenState(spenderAccountId),
  tokenState(holderAccountId),
]);
const expectedSpender = spenderBeforeAtomicUnits - settlementAtomicUnits;
const expectedHolder = holderBeforeAtomicUnits + settlementAtomicUnits;
assert.equal(spenderState.atomicUnits, expectedSpender, "final_spender_usdc_state_mismatch");
assert.equal(holderState.atomicUnits, expectedHolder, "final_holder_usdc_state_mismatch");

const proof = {
  ok: true,
  evidenceLevel: "LIVE/TESTNET_READ_ONLY_VERIFICATION",
  status: "canonical_45_usdc_recovery_public_state_verified",
  network: "testnet",
  transaction: {
    transactionId,
    mirrorTransactionId: mirrorId,
    result: transaction.result,
    mirror: transactionMirror,
    hashscan: `https://hashscan.io/#/testnet/transaction/${mirrorId}`,
    singleTransactionContainsBookingNftAndUsdc: true,
    bookingNftTransfers: bookingTransfers,
    usdcTransfers,
  },
  finalOwnership: {
    tokenId: bookingTokenId,
    serial: bookingSerial,
    ownerAccountId: ownerBody.account_id,
    mirror: ownerMirror,
  },
  finalUsdcState: {
    tokenId: usdcTokenId,
    settlementAtomicUnits: settlementAtomicUnits.toString(),
    spender: {
      accountId: spenderAccountId,
      atomicUnits: spenderState.atomicUnits.toString(),
      mirror: spenderState.mirror,
    },
    holder: {
      accountId: holderAccountId,
      atomicUnits: holderState.atomicUnits.toString(),
      mirror: holderState.mirror,
    },
  },
};

writeFileSync(outputPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
console.log(JSON.stringify(proof, null, 2));
