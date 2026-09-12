import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { Transaction } from "@hiero-ledger/sdk";
import {
  prepareApprovedSerialTransferForSpender,
  prepareSerialAllowanceForOwner,
  prepareSerialRevocationForOwner,
} from "../lib/hedera-agent-kit/delegated-recovery-plugin.ts";

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

const args = parseArgs(process.argv.slice(2));
const action = requireString(args, "action");
const out = requireString(args, "out");
const authority = {
  tokenId: requireString(args, "token"),
  serial: Number(requireString(args, "serial")),
  ownerAccountId: requireString(args, "owner"),
  spenderAccountId: requireString(args, "spender"),
};

if (!Number.isSafeInteger(authority.serial) || authority.serial <= 0) {
  throw new Error("--serial must be a positive safe integer");
}

let envelope;
let receiverAccountId = null;
if (action === "approve_serial") {
  envelope = await prepareSerialAllowanceForOwner(authority);
} else if (action === "revoke_serial") {
  envelope = await prepareSerialRevocationForOwner(authority);
} else if (action === "delegated_transfer") {
  receiverAccountId = requireString(args, "receiver");
  envelope = await prepareApprovedSerialTransferForSpender({
    authority,
    receiverAccountId,
  });
} else {
  throw new Error(`unsupported --action: ${action}`);
}

assert.equal(envelope.mode, "RETURN_BYTES");
assert.equal(envelope.signed, false);
assert.equal(envelope.submitted, false);
assert.ok(envelope.bytesBase64.length > 20);

const decoded = Transaction.fromBytes(Buffer.from(envelope.bytesBase64, "base64"));
assert.equal(decoded.transactionId?.toString(), envelope.transactionId);
assert.equal(decoded.transactionId?.accountId?.toString(), envelope.payerAccountId);

const expectedPayer =
  action === "delegated_transfer"
    ? authority.spenderAccountId
    : authority.ownerAccountId;
assert.equal(envelope.payerAccountId, expectedPayer);

const bytesSha256 = createHash("sha256")
  .update(Buffer.from(envelope.bytesBase64, "base64"))
  .digest("hex");

const proofEnvelope = {
  schemaVersion: 1,
  network: "testnet",
  action,
  authority,
  receiverAccountId,
  preparedBy: "HAK AgentMode.RETURN_BYTES",
  secretAvailableToPreparer: false,
  envelope,
  bytesSha256,
};
writeFileSync(out, `${JSON.stringify(proofEnvelope, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      ok: true,
      evidenceLevel: "LIVE/TESTNET_PREPARED",
      status: "hak_return_bytes_prepared_for_external_signer",
      network: "testnet",
      action,
      authority,
      receiverAccountId,
      transactionId: envelope.transactionId,
      payerAccountId: envelope.payerAccountId,
      transactionType: envelope.transactionType,
      bytesSha256,
      signedByPreparer: false,
      submittedByPreparer: false,
      secretAvailableToPreparer: false,
      outputFile: out,
    },
    null,
    2
  )
);
