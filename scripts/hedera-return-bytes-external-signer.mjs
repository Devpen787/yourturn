import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import {
  AccountAllowanceApproveTransaction,
  AccountAllowanceDeleteTransaction,
  AccountId,
  Client,
  PrivateKey,
  TokenId,
  Transaction,
  TransferTransaction,
} from "@hiero-ledger/sdk";

function parseArgs(argv) {
  const values = {};
  for (const arg of argv) {
    if (!arg.startsWith("--") || !arg.includes("=")) continue;
    const index = arg.indexOf("=");
    values[arg.slice(2, index)] = arg.slice(index + 1);
  }
  return values;
}

function requireString(args, name) {
  const value = args[name]?.trim();
  if (!value) throw new Error(`--${name} is required`);
  return value;
}

function parsePrivateKey(raw, hint) {
  const key = raw.trim().replace(/^0x/i, "");
  const normalizedHint = hint?.trim().toUpperCase();
  if (normalizedHint === "ECDSA") return PrivateKey.fromStringECDSA(key);
  if (normalizedHint === "ED25519") return PrivateKey.fromStringED25519(key);
  if (normalizedHint === "DER") return PrivateKey.fromStringDer(key);
  return PrivateKey.fromString(key);
}

function canonicalAccountId(value) {
  return AccountId.fromString(String(value)).toString();
}

function canonicalTokenId(value) {
  return TokenId.fromString(String(value)).toString();
}

function requireAuthority(proofEnvelope) {
  const authority = proofEnvelope?.authority;
  assert.ok(authority && typeof authority === "object", "delegated_recovery_byte_semantics_missing_authority");
  const serial = Number(authority.serial);
  assert.ok(
    Number.isSafeInteger(serial) && serial > 0,
    "delegated_recovery_byte_semantics_invalid_serial"
  );
  return {
    tokenId: canonicalTokenId(authority.tokenId),
    serial,
    ownerAccountId: canonicalAccountId(authority.ownerAccountId),
    spenderAccountId: canonicalAccountId(authority.spenderAccountId),
  };
}

function assertExactlyOneSerial(serialNumbers, expectedSerial) {
  const serials = (serialNumbers ?? []).map((serial) => Number(serial.toString()));
  assert.deepEqual(serials, [expectedSerial], "delegated_recovery_byte_semantics_serial_mismatch");
}

function assertNoHiddenTransferSideEffects(transaction) {
  assert.equal(
    [...transaction.hbarTransfers].length,
    0,
    "delegated_recovery_byte_semantics_hidden_hbar_transfer"
  );
  assert.equal(
    [...transaction.tokenTransfers].length,
    0,
    "delegated_recovery_byte_semantics_hidden_fungible_transfer"
  );
}

/**
 * Bind the human-readable HAK proof envelope to the exact decoded Hedera bytes
 * before any key is loaded, any signature is created, or any transaction is submitted.
 */
function assertDelegatedRecoveryByteSemantics(proofEnvelope, transaction, signerAccountId) {
  const authority = requireAuthority(proofEnvelope);
  const action = proofEnvelope.action;

  if (action === "approve_serial") {
    assert.ok(
      transaction instanceof AccountAllowanceApproveTransaction,
      "delegated_recovery_byte_semantics_wrong_transaction_type"
    );
    assert.equal(
      signerAccountId,
      authority.ownerAccountId,
      "delegated_recovery_byte_semantics_owner_signer_mismatch"
    );
    assert.equal(
      transaction.hbarApprovals.length,
      0,
      "delegated_recovery_byte_semantics_hidden_hbar_allowance"
    );
    assert.equal(
      transaction.tokenApprovals.length,
      0,
      "delegated_recovery_byte_semantics_hidden_fungible_allowance"
    );
    assert.equal(
      transaction.tokenNftApprovals.length,
      1,
      "delegated_recovery_byte_semantics_nft_allowance_count"
    );
    const approval = transaction.tokenNftApprovals[0];
    assert.equal(
      approval.tokenId?.toString(),
      authority.tokenId,
      "delegated_recovery_byte_semantics_token_mismatch"
    );
    assert.equal(
      approval.ownerAccountId?.toString(),
      authority.ownerAccountId,
      "delegated_recovery_byte_semantics_owner_mismatch"
    );
    assert.equal(
      approval.spenderAccountId?.toString(),
      authority.spenderAccountId,
      "delegated_recovery_byte_semantics_spender_mismatch"
    );
    assert.equal(
      approval.allSerials,
      false,
      "delegated_recovery_byte_semantics_all_serials_forbidden"
    );
    assertExactlyOneSerial(approval.serialNumbers, authority.serial);
    assert.equal(
      approval.delegatingSpender ?? null,
      null,
      "delegated_recovery_byte_semantics_delegating_spender_forbidden"
    );
    return;
  }

  if (action === "revoke_serial") {
    assert.ok(
      transaction instanceof AccountAllowanceDeleteTransaction,
      "delegated_recovery_byte_semantics_wrong_transaction_type"
    );
    assert.equal(
      signerAccountId,
      authority.ownerAccountId,
      "delegated_recovery_byte_semantics_owner_signer_mismatch"
    );
    assert.equal(
      transaction.tokenNftAllowanceDeletions.length,
      1,
      "delegated_recovery_byte_semantics_nft_revocation_count"
    );
    const deletion = transaction.tokenNftAllowanceDeletions[0];
    assert.equal(
      deletion.tokenId?.toString(),
      authority.tokenId,
      "delegated_recovery_byte_semantics_token_mismatch"
    );
    assert.equal(
      deletion.ownerAccountId?.toString(),
      authority.ownerAccountId,
      "delegated_recovery_byte_semantics_owner_mismatch"
    );
    assert.equal(
      deletion.allSerials,
      false,
      "delegated_recovery_byte_semantics_all_serials_forbidden"
    );
    assertExactlyOneSerial(deletion.serialNumbers, authority.serial);
    // Hedera's serial-specific delete primitive intentionally has no spender
    // field: it removes allowances for this owner+NFT serial, so the signer can
    // bind only the authority-reducing semantics that are actually in the bytes.
    assert.equal(
      deletion.spenderAccountId ?? null,
      null,
      "delegated_recovery_byte_semantics_unexpected_revocation_spender"
    );
    return;
  }

  if (action === "delegated_transfer") {
    assert.ok(
      transaction instanceof TransferTransaction,
      "delegated_recovery_byte_semantics_wrong_transaction_type"
    );
    assert.equal(
      signerAccountId,
      authority.spenderAccountId,
      "delegated_recovery_byte_semantics_spender_signer_mismatch"
    );
    const receiverAccountId = canonicalAccountId(proofEnvelope.receiverAccountId);
    assertNoHiddenTransferSideEffects(transaction);
    const nftEntries = [...transaction.nftTransfers];
    assert.equal(
      nftEntries.length,
      1,
      "delegated_recovery_byte_semantics_nft_token_count"
    );
    const [tokenId, transfers] = nftEntries[0];
    assert.equal(
      tokenId.toString(),
      authority.tokenId,
      "delegated_recovery_byte_semantics_token_mismatch"
    );
    assert.equal(
      transfers.length,
      1,
      "delegated_recovery_byte_semantics_nft_transfer_count"
    );
    const transfer = transfers[0];
    assert.equal(
      Number(transfer.serial.toString()),
      authority.serial,
      "delegated_recovery_byte_semantics_serial_mismatch"
    );
    assert.equal(
      transfer.sender.toString(),
      authority.ownerAccountId,
      "delegated_recovery_byte_semantics_owner_mismatch"
    );
    assert.equal(
      transfer.recipient.toString(),
      receiverAccountId,
      "delegated_recovery_byte_semantics_receiver_mismatch"
    );
    assert.equal(
      transfer.isApproved,
      true,
      "delegated_recovery_byte_semantics_transfer_not_approved"
    );
    return;
  }

  throw new Error(`delegated_recovery_byte_semantics_unsupported_action:${action}`);
}

function hashscanTxUrl(txId) {
  const normalized = txId.includes("@") ? txId.replace("@", "-") : txId;
  return `https://hashscan.io/#/testnet/transaction/${normalized}`;
}

function mirrorTxUrl(txId) {
  const normalized = txId.includes("@") ? txId.replace("@", "-") : txId;
  return `https://testnet.mirrornode.hedera.com/api/v1/transactions/${normalized}`;
}

function errorStatus(error) {
  return error?.status?.toString?.() ?? null;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

const args = parseArgs(process.argv.slice(2));
const envelopePath = requireString(args, "envelope");
const signerAccountId = canonicalAccountId(requireString(args, "account-id"));
const out = requireString(args, "out");
const expectedStatus = args["expect-status"]?.trim() || null;
const validateOnly = args["validate-only"] === "true";

if ((process.env.HEDERA_NETWORK ?? "testnet").toLowerCase() !== "testnet") {
  throw new Error("external signer refuses non-testnet execution");
}

const proofEnvelope = JSON.parse(readFileSync(envelopePath, "utf8"));
assert.equal(proofEnvelope.network, "testnet");
assert.equal(proofEnvelope.preparedBy, "HAK AgentMode.RETURN_BYTES");
assert.equal(proofEnvelope.secretAvailableToPreparer, false);
assert.equal(proofEnvelope.envelope.mode, "RETURN_BYTES");
assert.equal(proofEnvelope.envelope.signed, false);
assert.equal(proofEnvelope.envelope.submitted, false);
assert.equal(proofEnvelope.envelope.payerAccountId, signerAccountId);

const transaction = Transaction.fromBytes(
  Buffer.from(proofEnvelope.envelope.bytesBase64, "base64")
);
assert.equal(transaction.transactionId?.toString(), proofEnvelope.envelope.transactionId);
assert.equal(transaction.transactionId?.accountId?.toString(), signerAccountId);
assertDelegatedRecoveryByteSemantics(proofEnvelope, transaction, signerAccountId);

if (validateOnly) {
  const result = {
    ok: true,
    evidenceLevel: "CI/LOCAL",
    status: "return_bytes_semantics_validated_before_signing",
    network: "testnet",
    action: proofEnvelope.action,
    transactionId: proofEnvelope.envelope.transactionId,
    payerAccountId: signerAccountId,
    bytesSha256: proofEnvelope.bytesSha256,
    privateKeyLoaded: false,
    signed: false,
    submitted: false,
  };
  writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

const rawKey = process.env.HEDERA_EXTERNAL_SIGNER_KEY;
if (!rawKey) throw new Error("HEDERA_EXTERNAL_SIGNER_KEY is required");
const privateKey = parsePrivateKey(
  rawKey,
  process.env.HEDERA_EXTERNAL_SIGNER_KEY_TYPE
);

const client = Client.forTestnet();
let result;
try {
  const signed = await transaction.sign(privateKey);
  const response = await signed.execute(client);
  const receipt = await response.getReceipt(client);
  const status = receipt.status.toString();
  if (expectedStatus && status !== expectedStatus) {
    throw new Error(`expected ${expectedStatus}, got successful receipt ${status}`);
  }
  result = {
    ok: true,
    evidenceLevel: "LIVE/TESTNET",
    status: "externally_signed_return_bytes_submitted",
    network: "testnet",
    action: proofEnvelope.action,
    transactionId: response.transactionId.toString(),
    receiptStatus: status,
    payerAccountId: signerAccountId,
    bytesSha256: proofEnvelope.bytesSha256,
    preparedBy: proofEnvelope.preparedBy,
    signerBoundary: "external_workflow_step",
    agentRuntimeHadPrivateKey: false,
    semanticByteBindingVerifiedBeforeSigning: true,
    hashscan: hashscanTxUrl(response.transactionId.toString()),
    mirror: mirrorTxUrl(response.transactionId.toString()),
  };
} catch (error) {
  const status = errorStatus(error);
  const message = errorMessage(error);
  if (expectedStatus && (status === expectedStatus || message.includes(expectedStatus))) {
    result = {
      ok: true,
      evidenceLevel: "LIVE/TESTNET",
      status: "externally_signed_return_bytes_expected_denial",
      network: "testnet",
      action: proofEnvelope.action,
      transactionId: proofEnvelope.envelope.transactionId,
      receiptStatus: status,
      expectedStatus,
      payerAccountId: signerAccountId,
      bytesSha256: proofEnvelope.bytesSha256,
      preparedBy: proofEnvelope.preparedBy,
      signerBoundary: "external_workflow_step",
      agentRuntimeHadPrivateKey: false,
      semanticByteBindingVerifiedBeforeSigning: true,
      deniedAsExpected: true,
      message,
      hashscan: hashscanTxUrl(proofEnvelope.envelope.transactionId),
      mirror: mirrorTxUrl(proofEnvelope.envelope.transactionId),
    };
  } else {
    result = {
      ok: false,
      evidenceLevel: "LIVE/TESTNET_ATTEMPT",
      status: "external_return_bytes_submission_failed",
      network: "testnet",
      action: proofEnvelope.action,
      transactionId: proofEnvelope.envelope.transactionId,
      receiptStatus: status,
      expectedStatus,
      payerAccountId: signerAccountId,
      bytesSha256: proofEnvelope.bytesSha256,
      preparedBy: proofEnvelope.preparedBy,
      signerBoundary: "external_workflow_step",
      agentRuntimeHadPrivateKey: false,
      semanticByteBindingVerifiedBeforeSigning: true,
      message,
      hashscan: hashscanTxUrl(proofEnvelope.envelope.transactionId),
      mirror: mirrorTxUrl(proofEnvelope.envelope.transactionId),
    };
  }
} finally {
  client.close();
}

writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
