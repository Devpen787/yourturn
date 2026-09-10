import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import {
  AccountAllowanceApproveTransaction,
  AccountAllowanceDeleteTransaction,
  AccountId,
  NftId,
  TokenId,
  Transaction,
  TransactionId,
  TransferTransaction,
} from "@hiero-ledger/sdk";
import {
  YOURTURN_DELEGATED_RECOVERY_APPROVE_NFT_TOOL,
  createDelegatedRecoveryReturnBytesRuntime,
  prepareApprovedSerialTransferForSpender,
  prepareSerialAllowanceForOwner,
  prepareSerialRevocationForOwner,
} from "../lib/hedera-agent-kit/delegated-recovery-plugin.ts";
import {
  hasExactExpectedHederaStatus,
  hederaErrorStatus,
} from "./hedera-return-bytes-status-guard.mjs";

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

const signerSource = readFileSync(
  new URL("./hedera-return-bytes-external-signer.mjs", import.meta.url),
  "utf8"
);
assert.equal(
  signerSource.includes("message.includes(expectedStatus)"),
  false,
  "generic error text must never qualify as a Hedera denial"
);
assert.match(
  signerSource,
  /hasExactExpectedHederaStatus\(error, expectedStatus\)/,
  "external signer must gate expected denials on exact status-bearing failures"
);

const expectedDenialStatus = "SPENDER_DOES_NOT_HAVE_ALLOWANCE";
const unexpectedSuccessMismatch = new Error(
  `expected ${expectedDenialStatus}, got successful receipt SUCCESS`
);
assert.equal(hederaErrorStatus(unexpectedSuccessMismatch), null);
assert.equal(
  hasExactExpectedHederaStatus(unexpectedSuccessMismatch, expectedDenialStatus),
  false,
  "an actual SUCCESS receipt converted into the local mismatch error must fail hard"
);

const genericMessageOnlyFailure = new Error(
  `upstream text happened to contain ${expectedDenialStatus}`
);
assert.equal(
  hasExactExpectedHederaStatus(genericMessageOnlyFailure, expectedDenialStatus),
  false,
  "generic/local message text must not qualify as a network denial"
);

const genuineStatusBearingDenial = {
  status: { toString: () => expectedDenialStatus },
  message: "receipt contained exact Hedera denial status",
};
assert.equal(
  hederaErrorStatus(genuineStatusBearingDenial),
  expectedDenialStatus
);
assert.equal(
  hasExactExpectedHederaStatus(genuineStatusBearingDenial, expectedDenialStatus),
  true,
  "exact status-bearing Hedera denial must remain accepted"
);
assert.equal(
  hasExactExpectedHederaStatus(
    { status: { toString: () => "INVALID_SIGNATURE" } },
    expectedDenialStatus
  ),
  false,
  "a different Hedera status must not satisfy the expected denial"
);

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
assert.equal(nftApproval.tokenId?.toString(), authority.tokenId);
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
assert.equal(nftDeletion.tokenId?.toString(), authority.tokenId);
assert.equal(nftDeletion.ownerAccountId?.toString(), authority.ownerAccountId);

const transferEnvelope = await prepareApprovedSerialTransferForSpender({
  authority,
  receiverAccountId,
});
const transfer = decode(transferEnvelope);
assert.ok(transfer instanceof TransferTransaction);
assert.equal(transferEnvelope.payerAccountId, authority.spenderAccountId);
assert.equal(transferEnvelope.transactionType, "TransferTransaction");
const transferEntries = [...transfer.nftTransfers];
assert.equal(transferEntries.length, 1);
assert.equal(transferEntries[0][0].toString(), authority.tokenId);
assert.equal(transferEntries[0][1].length, 1);
assert.equal(Number(transferEntries[0][1][0].serial.toString()), authority.serial);
assert.equal(transferEntries[0][1][0].sender.toString(), authority.ownerAccountId);
assert.equal(transferEntries[0][1][0].recipient.toString(), receiverAccountId);
assert.equal(transferEntries[0][1][0].isApproved, true);

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

function proofEnvelopeFor(envelope, action, receiver = null) {
  return {
    schemaVersion: 1,
    network: "testnet",
    action,
    authority,
    receiverAccountId: receiver,
    preparedBy: "HAK AgentMode.RETURN_BYTES",
    secretAvailableToPreparer: false,
    envelope,
    bytesSha256: "ci-semantic-binding-fixture",
  };
}

function freezeAdversarialTransaction(transaction, payerAccountId, transactionType) {
  transaction
    .setTransactionId(TransactionId.generate(AccountId.fromString(payerAccountId)))
    .setNodeAccountIds([AccountId.fromString("0.0.3")])
    .freeze();
  return {
    bytesBase64: Buffer.from(transaction.toBytes()).toString("base64"),
    transactionId: transaction.transactionId.toString(),
    payerAccountId,
    transactionType,
    mode: "RETURN_BYTES",
    signed: false,
    submitted: false,
  };
}

let fixtureCounter = 0;
function validateAtActualExternalSignerBoundary({
  name,
  proofEnvelope,
  signerAccountId,
  shouldPass,
  expectedError,
}) {
  fixtureCounter += 1;
  const input = `.hedera-semantic-binding-${fixtureCounter}-${name}.json`;
  const output = `.hedera-semantic-binding-${fixtureCounter}-${name}-out.json`;
  writeFileSync(input, `${JSON.stringify(proofEnvelope, null, 2)}\n`, "utf8");
  try {
    const result = spawnSync(
      process.execPath,
      [
        "scripts/hedera-return-bytes-external-signer.mjs",
        `--envelope=${input}`,
        `--account-id=${signerAccountId}`,
        `--out=${output}`,
        "--validate-only=true",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          HEDERA_NETWORK: "testnet",
          HEDERA_EXTERNAL_SIGNER_KEY: "",
        },
      }
    );
    const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    if (shouldPass) {
      assert.equal(result.status, 0, combined);
      const validated = JSON.parse(readFileSync(output, "utf8"));
      assert.equal(validated.privateKeyLoaded, false);
      assert.equal(validated.signed, false);
      assert.equal(validated.submitted, false);
      assert.equal(validated.status, "return_bytes_semantics_validated_before_signing");
    } else {
      assert.notEqual(result.status, 0, `${name} unexpectedly passed`);
      assert.match(combined, expectedError, `${name} did not fail for semantic binding`);
      assert.doesNotMatch(
        combined,
        /HEDERA_EXTERNAL_SIGNER_KEY is required/,
        `${name} reached key-loading before semantic rejection`
      );
    }
  } finally {
    try {
      unlinkSync(input);
    } catch {}
    try {
      unlinkSync(output);
    } catch {}
  }
}

validateAtActualExternalSignerBoundary({
  name: "valid-approval",
  proofEnvelope: proofEnvelopeFor(approvalEnvelope, "approve_serial"),
  signerAccountId: authority.ownerAccountId,
  shouldPass: true,
});

const nftId = new NftId(TokenId.fromString(authority.tokenId), authority.serial);
const widerApproval = new AccountAllowanceApproveTransaction().approveTokenNftAllowanceAllSerials(
  authority.tokenId,
  authority.ownerAccountId,
  authority.spenderAccountId
);
validateAtActualExternalSignerBoundary({
  name: "all-serials",
  proofEnvelope: proofEnvelopeFor(
    freezeAdversarialTransaction(
      widerApproval,
      authority.ownerAccountId,
      "AccountAllowanceApproveTransaction"
    ),
    "approve_serial"
  ),
  signerAccountId: authority.ownerAccountId,
  shouldPass: false,
  expectedError: /all_serials_forbidden/,
});

for (const [name, transaction, expectedError] of [
  [
    "wrong-serial",
    new AccountAllowanceApproveTransaction().approveTokenNftAllowance(
      new NftId(TokenId.fromString(authority.tokenId), authority.serial + 1),
      authority.ownerAccountId,
      authority.spenderAccountId
    ),
    /serial_mismatch/,
  ],
  [
    "wrong-token",
    new AccountAllowanceApproveTransaction().approveTokenNftAllowance(
      new NftId(TokenId.fromString("0.0.2999"), authority.serial),
      authority.ownerAccountId,
      authority.spenderAccountId
    ),
    /token_mismatch/,
  ],
  [
    "wrong-spender",
    new AccountAllowanceApproveTransaction().approveTokenNftAllowance(
      nftId,
      authority.ownerAccountId,
      "0.0.1999"
    ),
    /spender_mismatch/,
  ],
]) {
  validateAtActualExternalSignerBoundary({
    name,
    proofEnvelope: proofEnvelopeFor(
      freezeAdversarialTransaction(
        transaction,
        authority.ownerAccountId,
        "AccountAllowanceApproveTransaction"
      ),
      "approve_serial"
    ),
    signerAccountId: authority.ownerAccountId,
    shouldPass: false,
    expectedError,
  });
}

const wrongType = new AccountAllowanceDeleteTransaction().deleteAllTokenNftAllowances(
  nftId,
  authority.ownerAccountId
);
validateAtActualExternalSignerBoundary({
  name: "wrong-transaction-type",
  proofEnvelope: proofEnvelopeFor(
    freezeAdversarialTransaction(
      wrongType,
      authority.ownerAccountId,
      "AccountAllowanceDeleteTransaction"
    ),
    "approve_serial"
  ),
  signerAccountId: authority.ownerAccountId,
  shouldPass: false,
  expectedError: /wrong_transaction_type/,
});

const wrongReceiverTransfer = new TransferTransaction().addApprovedNftTransfer(
  nftId,
  authority.ownerAccountId,
  "0.0.1998"
);
validateAtActualExternalSignerBoundary({
  name: "wrong-receiver",
  proofEnvelope: proofEnvelopeFor(
    freezeAdversarialTransaction(
      wrongReceiverTransfer,
      authority.spenderAccountId,
      "TransferTransaction"
    ),
    "delegated_transfer",
    receiverAccountId
  ),
  signerAccountId: authority.spenderAccountId,
  shouldPass: false,
  expectedError: /receiver_mismatch/,
});

const nonApprovedTransfer = new TransferTransaction().addNftTransfer(
  nftId,
  authority.ownerAccountId,
  receiverAccountId
);
validateAtActualExternalSignerBoundary({
  name: "non-approved-transfer",
  proofEnvelope: proofEnvelopeFor(
    freezeAdversarialTransaction(
      nonApprovedTransfer,
      authority.spenderAccountId,
      "TransferTransaction"
    ),
    "delegated_transfer",
    receiverAccountId
  ),
  signerAccountId: authority.spenderAccountId,
  shouldPass: false,
  expectedError: /transfer_not_approved/,
});

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
        semanticByteBindingRunsAtActualExternalSignerBoundary: true,
        widenedAllSerialsRejectedBeforeKeyLoad: true,
        wrongSerialRejectedBeforeKeyLoad: true,
        wrongTokenRejectedBeforeKeyLoad: true,
        wrongSpenderRejectedBeforeKeyLoad: true,
        wrongReceiverRejectedBeforeKeyLoad: true,
        wrongTransactionTypeRejectedBeforeKeyLoad: true,
        nonApprovedTransferRejectedBeforeKeyLoad: true,
        unexpectedSuccessCannotQualifyAsExpectedDenial: true,
        genericMessageCannotQualifyAsExpectedDenial: true,
        exactStatusBearingDenialStillAccepted: true,
        noTransactionSubmitted: true,
      },
    },
    null,
    2
  )
);
