import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AccountAllowanceApproveTransaction,
  AccountAllowanceDeleteTransaction,
  Transaction,
  TransferTransaction,
} from "@hiero-ledger/sdk";
import {
  YOURTURN_DELEGATED_RECOVERY_APPROVE_NFT_TOOL,
  createDelegatedRecoveryReturnBytesRuntime,
  prepareApprovedSerialTransferForSpender,
  prepareSerialAllowanceForOwner,
  prepareSerialRevocationForOwner,
} from "../lib/hedera-agent-kit/delegated-recovery-plugin.ts";

const authority = {
  tokenId: "0.0.2001",
  serial: 7,
  ownerAccountId: "0.0.1001",
  spenderAccountId: "0.0.1002",
};
const receiverAccountId = "0.0.1003";

const pluginSource = readFileSync(
  new URL("../lib/hedera-agent-kit/delegated-recovery-plugin.ts", import.meta.url),
  "utf8"
);
for (const forbidden of [
  "PrivateKey",
  ".setOperator(",
  "HEDERA_GUEST_A_KEY",
  "HEDERA_TREASURY_KEY",
  "process.env",
]) {
  assert.equal(
    pluginSource.includes(forbidden),
    false,
    `non-custodial plugin must not contain ${forbidden}`
  );
}

function decode(envelope) {
  assert.equal(envelope.mode, "RETURN_BYTES");
  assert.equal(envelope.signed, false);
  assert.equal(envelope.submitted, false);
  assert.ok(envelope.bytesBase64.length > 20);
  const tx = Transaction.fromBytes(Buffer.from(envelope.bytesBase64, "base64"));
  assert.equal(tx.transactionId?.toString(), envelope.transactionId);
  assert.equal(tx.transactionId?.accountId?.toString(), envelope.payerAccountId);
  return tx;
}

const approvalEnvelope = await prepareSerialAllowanceForOwner(authority);
const approval = decode(approvalEnvelope);
assert.ok(approval instanceof AccountAllowanceApproveTransaction);
assert.equal(approvalEnvelope.payerAccountId, authority.ownerAccountId);
assert.equal(approvalEnvelope.transactionType, "AccountAllowanceApproveTransaction");
assert.equal(approval.tokenNftApprovals.length, 1);
const nftApproval = approval.tokenNftApprovals[0];
assert.equal(nftApproval.allSerials, false);
assert.deepEqual(
  (nftApproval.serialNumbers ?? []).map((serial) => Number(serial.toString())),
  [authority.serial]
);
assert.equal(nftApproval.ownerAccountId?.toString(), authority.ownerAccountId);
assert.equal(nftApproval.spenderAccountId?.toString(), authority.spenderAccountId);

const revocationEnvelope = await prepareSerialRevocationForOwner(authority);
const revocation = decode(revocationEnvelope);
assert.ok(revocation instanceof AccountAllowanceDeleteTransaction);
assert.equal(revocationEnvelope.payerAccountId, authority.ownerAccountId);
assert.equal(revocationEnvelope.transactionType, "AccountAllowanceDeleteTransaction");
assert.equal(revocation.tokenNftAllowanceDeletions.length, 1);
const nftDeletion = revocation.tokenNftAllowanceDeletions[0];
assert.equal(nftDeletion.allSerials, false);
assert.deepEqual(
  (nftDeletion.serialNumbers ?? []).map((serial) => Number(serial.toString())),
  [authority.serial]
);
assert.equal(nftDeletion.ownerAccountId?.toString(), authority.ownerAccountId);

const transferEnvelope = await prepareApprovedSerialTransferForSpender({
  authority,
  receiverAccountId,
});
const transfer = decode(transferEnvelope);
assert.ok(transfer instanceof TransferTransaction);
assert.equal(transferEnvelope.payerAccountId, authority.spenderAccountId);
assert.equal(transferEnvelope.transactionType, "TransferTransaction");

await assert.rejects(
  () =>
    prepareSerialAllowanceForOwner({
      ...authority,
      // Runtime JS callers cannot smuggle the Core Token Plugin's collection-wide switch.
      allSerials: true,
    }),
  /unrecognized|unknown/i
);

const adversarialRuntime = createDelegatedRecoveryReturnBytesRuntime(
  authority.ownerAccountId
);
try {
  const approveTool = adversarialRuntime.tools.find(
    (tool) => tool.method === YOURTURN_DELEGATED_RECOVERY_APPROVE_NFT_TOOL
  );
  assert.ok(approveTool);
  const payerMismatchResult = await approveTool.execute(
    adversarialRuntime.client,
    adversarialRuntime.context,
    { ...authority, ownerAccountId: "0.0.9999" }
  );
  assert.match(
    payerMismatchResult?.raw?.error ?? "",
    /delegated_recovery_payer_mismatch/
  );
} finally {
  adversarialRuntime.client.close();
}

console.log(
  JSON.stringify(
    {
      ok: true,
      evidenceLevel: "CI/LOCAL",
      status: "hak_delegated_recovery_return_bytes_verified",
      hakMode: "RETURN_BYTES",
      privateKeyRequiredByRuntime: false,
      submittedByRuntime: false,
      authority: {
        tokenId: authority.tokenId,
        serial: authority.serial,
        ownerAccountId: authority.ownerAccountId,
        spenderAccountId: authority.spenderAccountId,
        approvedForAll: false,
      },
      preparedTransactions: [
        {
          action: "approve_serial",
          payerAccountId: approvalEnvelope.payerAccountId,
          type: approvalEnvelope.transactionType,
        },
        {
          action: "revoke_serial",
          payerAccountId: revocationEnvelope.payerAccountId,
          type: revocationEnvelope.transactionType,
        },
        {
          action: "delegated_transfer",
          payerAccountId: transferEnvelope.payerAccountId,
          type: transferEnvelope.transactionType,
        },
      ],
      assertions: {
        ownerApprovalPreparedWithoutBackendKey: true,
        ownerRevocationPreparedWithoutBackendKey: true,
        spenderTransferPreparedWithoutBackendKey: true,
        sourceContainsNoKeyLoadingPath: true,
        singleSerialOnly: true,
        allSerialsRejected: true,
        mismatchedContextPayerRejected: true,
        noTransactionSubmitted: true,
      },
    },
    null,
    2
  )
);
