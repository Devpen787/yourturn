import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { AccountId, Client, PrivateKey, Transaction } from "@hiero-ledger/sdk";

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
const signerAccountId = AccountId.fromString(requireString(args, "account-id")).toString();
const out = requireString(args, "out");
const expectedStatus = args["expect-status"]?.trim() || null;

if ((process.env.HEDERA_NETWORK ?? "testnet").toLowerCase() !== "testnet") {
  throw new Error("external signer refuses non-testnet execution");
}
const rawKey = process.env.HEDERA_EXTERNAL_SIGNER_KEY;
if (!rawKey) throw new Error("HEDERA_EXTERNAL_SIGNER_KEY is required");
const privateKey = parsePrivateKey(
  rawKey,
  process.env.HEDERA_EXTERNAL_SIGNER_KEY_TYPE
);

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
