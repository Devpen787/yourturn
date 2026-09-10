import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import {
  AccountAllowanceApproveTransaction,
  AccountAllowanceDeleteTransaction,
  AccountId,
  NftId,
  TokenId,
  TransactionId,
  TransferTransaction,
} from "@hiero-ledger/sdk";

const authority = {
  tokenId: "0.0.2501",
  serial: 17,
  ownerAccountId: "0.0.2502",
  spenderAccountId: "0.0.2503",
};
const receiverAccountId = "0.0.2504";
const nftId = new NftId(TokenId.fromString(authority.tokenId), authority.serial);
let fixtureCounter = 0;

function freeze(transaction, payerAccountId, transactionType) {
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

function proofEnvelope(envelope, action, receiver = null) {
  return {
    schemaVersion: 1,
    network: "testnet",
    action,
    authority,
    receiverAccountId: receiver,
    preparedBy: "HAK AgentMode.RETURN_BYTES",
    secretAvailableToPreparer: false,
    envelope,
    bytesSha256: "independent-security-retest-fixture",
  };
}

function invoke({ name, envelope, signerAccountId, shouldPass, expectedError }) {
  fixtureCounter += 1;
  const input = `.security-h1-byte-binding-${fixtureCounter}-${name}.json`;
  const output = `.security-h1-byte-binding-${fixtureCounter}-${name}-out.json`;
  writeFileSync(input, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");
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
      assert.equal(result.status, 0, `${name} should pass\n${combined}`);
      const validated = JSON.parse(readFileSync(output, "utf8"));
      assert.equal(validated.status, "return_bytes_semantics_validated_before_signing");
      assert.equal(validated.privateKeyLoaded, false);
      assert.equal(validated.signed, false);
      assert.equal(validated.submitted, false);
    } else {
      assert.notEqual(result.status, 0, `${name} unexpectedly passed`);
      assert.match(combined, expectedError, `${name} failed for an unexpected reason\n${combined}`);
      assert.doesNotMatch(combined, /HEDERA_EXTERNAL_SIGNER_KEY is required/, `${name} reached key loading`);
    }
  } finally {
    try { unlinkSync(input); } catch {}
    try { unlinkSync(output); } catch {}
  }
}

const validApproval = new AccountAllowanceApproveTransaction().approveTokenNftAllowance(
  nftId,
  authority.ownerAccountId,
  authority.spenderAccountId
);
invoke({
  name: "valid-approval",
  envelope: proofEnvelope(freeze(validApproval, authority.ownerAccountId, "AccountAllowanceApproveTransaction"), "approve_serial"),
  signerAccountId: authority.ownerAccountId,
  shouldPass: true,
});

const allSerials = new AccountAllowanceApproveTransaction().approveTokenNftAllowanceAllSerials(
  authority.tokenId,
  authority.ownerAccountId,
  authority.spenderAccountId
);
invoke({
  name: "all-serials",
  envelope: proofEnvelope(freeze(allSerials, authority.ownerAccountId, "AccountAllowanceApproveTransaction"), "approve_serial"),
  signerAccountId: authority.ownerAccountId,
  shouldPass: false,
  expectedError: /all_serials_forbidden/,
});

const multiSerial = new AccountAllowanceApproveTransaction()
  .approveTokenNftAllowance(nftId, authority.ownerAccountId, authority.spenderAccountId)
  .approveTokenNftAllowance(
    new NftId(TokenId.fromString(authority.tokenId), authority.serial + 1),
    authority.ownerAccountId,
    authority.spenderAccountId
  );
invoke({
  name: "multiple-nft-allowances",
  envelope: proofEnvelope(freeze(multiSerial, authority.ownerAccountId, "AccountAllowanceApproveTransaction"), "approve_serial"),
  signerAccountId: authority.ownerAccountId,
  shouldPass: false,
  expectedError: /nft_allowance_count/,
});

const wrongOwnerApproval = new AccountAllowanceApproveTransaction().approveTokenNftAllowance(
  nftId,
  "0.0.2599",
  authority.spenderAccountId
);
invoke({
  name: "wrong-owner-approval",
  envelope: proofEnvelope(freeze(wrongOwnerApproval, authority.ownerAccountId, "AccountAllowanceApproveTransaction"), "approve_serial"),
  signerAccountId: authority.ownerAccountId,
  shouldPass: false,
  expectedError: /owner_mismatch/,
});

const validRevoke = new AccountAllowanceDeleteTransaction().deleteAllTokenNftAllowances(
  nftId,
  authority.ownerAccountId
);
invoke({
  name: "valid-revoke",
  envelope: proofEnvelope(freeze(validRevoke, authority.ownerAccountId, "AccountAllowanceDeleteTransaction"), "revoke_serial"),
  signerAccountId: authority.ownerAccountId,
  shouldPass: true,
});

const wrongSerialRevoke = new AccountAllowanceDeleteTransaction().deleteAllTokenNftAllowances(
  new NftId(TokenId.fromString(authority.tokenId), authority.serial + 1),
  authority.ownerAccountId
);
invoke({
  name: "wrong-serial-revoke",
  envelope: proofEnvelope(freeze(wrongSerialRevoke, authority.ownerAccountId, "AccountAllowanceDeleteTransaction"), "revoke_serial"),
  signerAccountId: authority.ownerAccountId,
  shouldPass: false,
  expectedError: /serial_mismatch/,
});

const validTransfer = new TransferTransaction().addApprovedNftTransfer(
  nftId,
  authority.ownerAccountId,
  receiverAccountId
);
invoke({
  name: "valid-approved-transfer",
  envelope: proofEnvelope(freeze(validTransfer, authority.spenderAccountId, "TransferTransaction"), "delegated_transfer", receiverAccountId),
  signerAccountId: authority.spenderAccountId,
  shouldPass: true,
});

const wrongSenderTransfer = new TransferTransaction().addApprovedNftTransfer(
  nftId,
  "0.0.2598",
  receiverAccountId
);
invoke({
  name: "wrong-sender-transfer",
  envelope: proofEnvelope(freeze(wrongSenderTransfer, authority.spenderAccountId, "TransferTransaction"), "delegated_transfer", receiverAccountId),
  signerAccountId: authority.spenderAccountId,
  shouldPass: false,
  expectedError: /owner_mismatch/,
});

const wrongReceiverTransfer = new TransferTransaction().addApprovedNftTransfer(
  nftId,
  authority.ownerAccountId,
  "0.0.2597"
);
invoke({
  name: "wrong-receiver-transfer",
  envelope: proofEnvelope(freeze(wrongReceiverTransfer, authority.spenderAccountId, "TransferTransaction"), "delegated_transfer", receiverAccountId),
  signerAccountId: authority.spenderAccountId,
  shouldPass: false,
  expectedError: /receiver_mismatch/,
});

const nonApprovedTransfer = new TransferTransaction().addNftTransfer(
  nftId,
  authority.ownerAccountId,
  receiverAccountId
);
invoke({
  name: "non-approved-transfer",
  envelope: proofEnvelope(freeze(nonApprovedTransfer, authority.spenderAccountId, "TransferTransaction"), "delegated_transfer", receiverAccountId),
  signerAccountId: authority.spenderAccountId,
  shouldPass: false,
  expectedError: /transfer_not_approved/,
});

invoke({
  name: "payer-substitution",
  envelope: proofEnvelope(freeze(
    new AccountAllowanceApproveTransaction().approveTokenNftAllowance(nftId, authority.ownerAccountId, authority.spenderAccountId),
    authority.ownerAccountId,
    "AccountAllowanceApproveTransaction"
  ), "approve_serial"),
  signerAccountId: authority.spenderAccountId,
  shouldPass: false,
  expectedError: /Expected values to be strictly equal|owner_signer_mismatch/,
});

console.log(JSON.stringify({
  ok: true,
  finding: "SEC-HEDERA-003",
  attackedHead: "ed6a8e5ca29456ff8959b94aa23d66d4ab640990",
  cases: fixtureCounter,
  validCasesPassed: 3,
  maliciousCasesRejectedBeforeKeyLoad: fixtureCounter - 3,
  result: "repair_holds_for_independent_semantic_binding_retest",
}, null, 2));
