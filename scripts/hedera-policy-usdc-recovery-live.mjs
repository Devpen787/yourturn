import assert from "node:assert/strict";
import crypto from "node:crypto";
import { writeFileSync } from "node:fs";
import {
  AccountAllowanceApproveTransaction,
  AccountId,
  Client,
  PrivateKey,
  Transaction,
} from "@hiero-ledger/sdk";
import { prepareSerialAllowanceForOwner } from "../lib/hedera-agent-kit/delegated-recovery-plugin.ts";
import { preparePolicyAuthorizedUsdcRecovery } from "../lib/hedera-agent-kit/policy-authorized-usdc-recovery.ts";
import {
  HEDERA_TESTNET_USDC_TOKEN_ID,
  HEDERA_USDC_DECIMALS,
  HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS,
  validateAtomicUsdcRecoveryTransaction,
} from "../lib/hedera-agent-kit/usdc-recovery-semantics.ts";

const MIRROR = "https://testnet.mirrornode.hedera.com/api/v1";
const holderAccountId = AccountId.fromString(
  process.env.HEDERA_GUEST_A_ID ?? "0.0.8504405"
).toString();
const spenderAccountId = AccountId.fromString(
  process.env.HEDERA_TREASURY_ID ?? "0.0.8504300"
).toString();
const receiverAccountId = AccountId.fromString(
  process.env.HEDERA_GUEST_B_ID ?? "0.0.8504715"
).toString();
const bookingTokenId = process.env.BOOKED_RIGHTS_TOKEN_ID ?? "0.0.8505698";
const outputPath = process.env.HEDERA_USDC_RECOVERY_PROOF_OUT ?? "hedera-usdc-recovery-live-proof.json";

if ((process.env.HEDERA_NETWORK ?? "testnet").toLowerCase() !== "testnet") {
  throw new Error("usdc_recovery_live_refuses_non_testnet");
}

function parsePrivateKey(raw, hint) {
  const key = raw.trim().replace(/^0x/i, "");
  const normalizedHint = hint?.trim().toUpperCase();
  if (normalizedHint === "ECDSA") return PrivateKey.fromStringECDSA(key);
  if (normalizedHint === "ED25519") return PrivateKey.fromStringED25519(key);
  if (normalizedHint === "DER") return PrivateKey.fromStringDer(key);
  return PrivateKey.fromString(key);
}

function normalizeTxId(txId) {
  return txId.includes("@") ? txId.replace("@", "-") : txId;
}

function mirrorTxUrl(txId) {
  return `${MIRROR}/transactions/${normalizeTxId(txId)}`;
}

function hashscanTxUrl(txId) {
  return `https://hashscan.io/#/testnet/transaction/${normalizeTxId(txId)}`;
}

async function mirrorJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`mirror_http_${response.status}:${url}`);
  }
  return response.json();
}

async function firstOwnerHeldSerial() {
  const url = `${MIRROR}/accounts/${holderAccountId}/nfts?token.id=${bookingTokenId}&limit=100`;
  const body = await mirrorJson(url);
  const nft = (body.nfts ?? []).find(
    (candidate) => candidate.token_id === bookingTokenId
  );
  if (!nft) throw new Error("usdc_recovery_no_owner_held_booking_serial");
  const serial = Number(nft.serial_number);
  if (!Number.isSafeInteger(serial) || serial <= 0) {
    throw new Error("usdc_recovery_invalid_owner_held_serial");
  }
  return { serial, mirror: url };
}

async function tokenBalance(accountId) {
  const url = `${MIRROR}/accounts/${accountId}/tokens?token.id=${HEDERA_TESTNET_USDC_TOKEN_ID}&limit=1`;
  const body = await mirrorJson(url);
  const association = (body.tokens ?? []).find(
    (candidate) => candidate.token_id === HEDERA_TESTNET_USDC_TOKEN_ID
  );
  if (!association) {
    throw new Error(`usdc_recovery_account_not_associated:${accountId}`);
  }
  return { atomicUnits: BigInt(association.balance), mirror: url };
}

async function waitForTransaction(txId) {
  const url = mirrorTxUrl(txId);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const body = await mirrorJson(url);
    const tx = (body.transactions ?? []).find(
      (candidate) => normalizeTxId(candidate.transaction_id) === normalizeTxId(txId)
    ) ?? body.transactions?.[0];
    if (tx) return { tx, mirror: url };
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  throw new Error("usdc_recovery_mirror_transaction_timeout");
}

async function waitForNftOwner(serial) {
  const url = `${MIRROR}/tokens/${bookingTokenId}/nfts/${serial}`;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const body = await mirrorJson(url);
    if (body.account_id === receiverAccountId) {
      return { ownerAccountId: body.account_id, mirror: url };
    }
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  throw new Error("usdc_recovery_mirror_owner_timeout");
}

function createOneShotNonceStore() {
  let claimed = false;
  let fingerprint = null;
  return {
    async reserve({ fingerprint: nextFingerprint }) {
      if (!claimed) {
        claimed = true;
        fingerprint = nextFingerprint;
        return "claimed";
      }
      return fingerprint === nextFingerprint ? "duplicate" : "conflict";
    },
  };
}

function validateApproval(transaction, serial) {
  assert.ok(
    transaction instanceof AccountAllowanceApproveTransaction,
    "usdc_recovery_setup_wrong_allowance_transaction_type"
  );
  assert.equal(transaction.hbarApprovals.length, 0);
  assert.equal(transaction.tokenApprovals.length, 0);
  assert.equal(transaction.tokenNftApprovals.length, 1);
  const approval = transaction.tokenNftApprovals[0];
  assert.equal(approval.tokenId?.toString(), bookingTokenId);
  assert.equal(approval.ownerAccountId?.toString(), holderAccountId);
  assert.equal(approval.spenderAccountId?.toString(), spenderAccountId);
  assert.equal(approval.allSerials, false);
  assert.deepEqual(
    (approval.serialNumbers ?? []).map((value) => Number(value.toString())),
    [serial]
  );
}

function validateMirrorSettlement(tx, serial, amount) {
  assert.equal(tx.result, "SUCCESS", "usdc_recovery_mirror_receipt_not_success");
  const nftTransfers = (tx.nft_transfers ?? []).filter(
    (entry) => entry.token_id === bookingTokenId && Number(entry.serial_number) === serial
  );
  assert.equal(nftTransfers.length, 1, "usdc_recovery_mirror_nft_transfer_count");
  assert.equal(nftTransfers[0].sender_account_id, holderAccountId);
  assert.equal(nftTransfers[0].receiver_account_id, receiverAccountId);
  assert.equal(nftTransfers[0].is_approval, true);

  const usdcTransfers = (tx.token_transfers ?? []).filter(
    (entry) => entry.token_id === HEDERA_TESTNET_USDC_TOKEN_ID
  );
  const spenderLeg = usdcTransfers.find((entry) => entry.account === spenderAccountId);
  const holderLeg = usdcTransfers.find((entry) => entry.account === holderAccountId);
  assert.ok(spenderLeg, "usdc_recovery_mirror_missing_spender_usdc_leg");
  assert.ok(holderLeg, "usdc_recovery_mirror_missing_holder_usdc_leg");
  assert.equal(BigInt(spenderLeg.amount), -amount);
  assert.equal(BigInt(holderLeg.amount), amount);
}

const selected = await firstOwnerHeldSerial();
const amount = BigInt(HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS);
const beforeSpender = await tokenBalance(spenderAccountId);
const beforeHolder = await tokenBalance(holderAccountId);
if (beforeSpender.atomicUnits < amount) {
  throw new Error(
    `usdc_recovery_insufficient_testnet_usdc:${spenderAccountId}:${beforeSpender.atomicUnits.toString()}`
  );
}

const authority = {
  tokenId: bookingTokenId,
  serial: selected.serial,
  ownerAccountId: holderAccountId,
  spenderAccountId,
};

// Setup authority uses the already-proven H1 RETURN_BYTES primitive. The owner
// secret is not read until those exact bytes have been decoded and validated.
const approvalEnvelope = await prepareSerialAllowanceForOwner(authority);
const approvalTransaction = Transaction.fromBytes(
  Buffer.from(approvalEnvelope.bytesBase64, "base64")
);
validateApproval(approvalTransaction, selected.serial);
const ownerRawKey = process.env.HEDERA_GUEST_A_KEY;
if (!ownerRawKey) throw new Error("usdc_recovery_owner_signer_unavailable");
const ownerKey = parsePrivateKey(ownerRawKey, "ECDSA");
const approvalClient = Client.forTestnet();
let approvalResult;
try {
  const signedApproval = await approvalTransaction.sign(ownerKey);
  const approvalResponse = await signedApproval.execute(approvalClient);
  const approvalReceipt = await approvalResponse.getReceipt(approvalClient);
  assert.equal(approvalReceipt.status.toString(), "SUCCESS");
  approvalResult = {
    transactionId: approvalResponse.transactionId.toString(),
    receiptStatus: approvalReceipt.status.toString(),
    hashscan: hashscanTxUrl(approvalResponse.transactionId.toString()),
    mirror: mirrorTxUrl(approvalResponse.transactionId.toString()),
  };
} finally {
  approvalClient.close();
}

const nowMs = Date.now();
const delegation = {
  delegationId: `live-usdc-${selected.serial}-${nowMs}`,
  delegatedAgentAccountId: spenderAccountId,
  spenderAccountId,
  tokenId: bookingTokenId,
  serial: selected.serial,
  holderAccountId,
  allowedActions: ["RECOVER"],
  minimumRecovery: {
    asset: { kind: "HTS", tokenId: HEDERA_TESTNET_USDC_TOKEN_ID },
    atomicUnits: HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS,
  },
  expiresAtMs: nowMs + 15 * 60 * 1000,
  cancellationAllowed: false,
  providerPolicyId: "live-usdc-provider-allow",
  revokedAtMs: null,
};
const invocation = {
  agentAccountId: spenderAccountId,
  currentHolderAccountId: holderAccountId,
  action: "RECOVER",
  nonce: `live-usdc-${selected.serial}-${nowMs}`,
  providerPolicy: { id: delegation.providerPolicyId, state: "ALLOW" },
  recovery: {
    asset: { kind: "HTS", tokenId: HEDERA_TESTNET_USDC_TOKEN_ID },
    atomicUnits: HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS,
  },
  receiverAccountId,
};

const prepared = await preparePolicyAuthorizedUsdcRecovery({
  delegation,
  invocation,
  nonceStore: createOneShotNonceStore(),
  now: () => nowMs,
});
if (!prepared.ok) {
  throw new Error(`usdc_recovery_policy_blocked:${prepared.decision.reason}`);
}

const unsignedBytes = Buffer.from(prepared.envelope.bytesBase64, "base64");
const unsignedBytesSha256 = crypto
  .createHash("sha256")
  .update(unsignedBytes)
  .digest("hex");
const transaction = Transaction.fromBytes(unsignedBytes);
validateAtomicUsdcRecoveryTransaction(transaction, {
  bookingTokenId,
  serial: selected.serial,
  holderAccountId,
  spenderAccountId,
  receiverAccountId,
  settlementTokenId: HEDERA_TESTNET_USDC_TOKEN_ID,
  settlementAmountAtomicUnits: HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS,
  settlementRecipientAccountId: holderAccountId,
  settlementDecimals: HEDERA_USDC_DECIMALS,
});

// The delegated spender secret is read only after the exact HAK-produced bytes
// pass the independent NFT + USDC semantic validator above.
const spenderRawKey = process.env.HEDERA_TREASURY_KEY;
if (!spenderRawKey) throw new Error("usdc_recovery_spender_signer_unavailable");
const spenderKey = parsePrivateKey(spenderRawKey, "DER");
const client = Client.forTestnet();
let settlementResult;
try {
  const signed = await transaction.sign(spenderKey);
  const response = await signed.execute(client);
  const receipt = await response.getReceipt(client);
  const receiptStatus = receipt.status.toString();
  assert.equal(receiptStatus, "SUCCESS");
  settlementResult = {
    transactionId: response.transactionId.toString(),
    receiptStatus,
    hashscan: hashscanTxUrl(response.transactionId.toString()),
    mirror: mirrorTxUrl(response.transactionId.toString()),
  };
} finally {
  client.close();
}

const mirrored = await waitForTransaction(settlementResult.transactionId);
validateMirrorSettlement(mirrored.tx, selected.serial, amount);
const finalOwnership = await waitForNftOwner(selected.serial);
const afterSpender = await tokenBalance(spenderAccountId);
const afterHolder = await tokenBalance(holderAccountId);
assert.equal(
  afterSpender.atomicUnits,
  beforeSpender.atomicUnits - amount,
  "usdc_recovery_spender_balance_delta_mismatch"
);
assert.equal(
  afterHolder.atomicUnits,
  beforeHolder.atomicUnits + amount,
  "usdc_recovery_holder_balance_delta_mismatch"
);

const proof = {
  ok: true,
  evidenceLevel: "LIVE/TESTNET",
  status: "policy_authorized_atomic_nft_usdc_recovery_verified",
  network: "testnet",
  bookingRight: {
    tokenId: bookingTokenId,
    serial: selected.serial,
    holderAccountId,
    receiverAccountId,
    selectedFromMirror: selected.mirror,
    finalOwnership,
  },
  delegatedSpenderAccountId: spenderAccountId,
  setupSerialAllowance: approvalResult,
  policy: {
    outcome: prepared.decision.outcome,
    reason: prepared.decision.reason,
    providerPolicyId: delegation.providerPolicyId,
    minimumUsdcAtomicUnits: HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS,
    replayStoreForLiveProof: "one-shot-in-process; durable Redis semantics separately CI/security-cleared in H2",
  },
  settlement: {
    transactionId: settlementResult.transactionId,
    receiptStatus: settlementResult.receiptStatus,
    transactionCount: 1,
    containsBookingNftAndUsdc: true,
    tokenId: HEDERA_TESTNET_USDC_TOKEN_ID,
    decimals: HEDERA_USDC_DECIMALS,
    atomicUnits: HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS,
    payerAccountId: spenderAccountId,
    recipientAccountId: holderAccountId,
    unsignedReturnBytesSha256: unsignedBytesSha256,
    semanticByteBindingVerifiedBeforeSigning: true,
    hashscan: settlementResult.hashscan,
    mirror: settlementResult.mirror,
    mirrorResult: mirrored.tx.result,
    mirrorNftTransfers: mirrored.tx.nft_transfers ?? [],
    mirrorUsdcTransfers: (mirrored.tx.token_transfers ?? []).filter(
      (entry) => entry.token_id === HEDERA_TESTNET_USDC_TOKEN_ID
    ),
    balances: {
      spenderBeforeAtomicUnits: beforeSpender.atomicUnits.toString(),
      spenderAfterAtomicUnits: afterSpender.atomicUnits.toString(),
      spenderDeltaAtomicUnits: (
        afterSpender.atomicUnits - beforeSpender.atomicUnits
      ).toString(),
      holderBeforeAtomicUnits: beforeHolder.atomicUnits.toString(),
      holderAfterAtomicUnits: afterHolder.atomicUnits.toString(),
      holderDeltaAtomicUnits: (
        afterHolder.atomicUnits - beforeHolder.atomicUnits
      ).toString(),
      spenderMirror: beforeSpender.mirror,
      holderMirror: beforeHolder.mirror,
    },
  },
};

writeFileSync(outputPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
console.log(JSON.stringify(proof, null, 2));
