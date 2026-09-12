import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import {
  AccountAllowanceApproveTransaction,
  AccountId,
  BatchTransaction,
  NftId,
  PublicKey,
  TokenId,
  Transaction,
  TransactionId,
  TransferTransaction,
} from "@hiero-ledger/sdk";
import {
  ControlledBookingTransferDenied,
  buildControlledBookingTransferBatch,
  decodeAndValidateControlledBookingTransferBatch,
  validateControlledBookingTransferBatch,
} from "../lib/hedera/controlled-booking-transfer.ts";

const sdkPackage = JSON.parse(
  readFileSync("node_modules/@hiero-ledger/sdk/package.json", "utf8"),
);
assert.match(sdkPackage.version, /^2\.81\./, "qualification expects the locked 2.81 Hiero line");
assert.equal(typeof BatchTransaction, "function");
assert.equal(typeof BatchTransaction.prototype.setInnerTransactions, "function");
assert.equal(typeof Transaction.prototype.batchify, "function");

// Public test key only. No matching private key is present or required.
const BATCH_KEY =
  "302a300506032b6570032100bc46c36d8aeb94270064edb8d3d4d5d29446e1bb2f36cc47b2c9b755ef0aac25";

const fixture = Object.freeze({
  providerId: "studio-a",
  providerPolicyVersion: "studio-a-v7",
  bookingTokenId: "0.0.8001",
  serial: 213,
  sellerAccountId: "0.0.7002",
  receiverAccountId: "0.0.7003",
  delegatedAgentAccountId: "0.0.7004",
  providerOperationsAccountId: "0.0.7005",
  settlementTokenId: "0.0.429274",
  settlementSourceAccountId: "0.0.7003",
  settlementRecipientAccountId: "0.0.7002",
  settlementAmountAtomicUnits: "45000000",
  settlementDecimals: 6,
  batchKeyPublicKey: BATCH_KEY,
  nodeAccountId: "0.0.3",
  currentState: Object.freeze({
    providerPolicyAllows: true,
    holderMandateAllows: true,
    buyerEligible: true,
    exactPaymentAuthorized: true,
    providerScopedCollection: true,
    tokenFreezeDefault: true,
    sellerOwnsSerial: true,
    sellerAssociated: true,
    receiverAssociated: true,
    sellerRelationshipFrozen: true,
    receiverRelationshipFrozen: true,
    currentBookingTokenId: "0.0.8001",
    currentBookingSerial: 213,
    currentHolderAccountId: "0.0.7002",
    delegatedAllowanceSpenderAccountId: "0.0.7004",
  }),
});

const clone = (value) => structuredClone(value);
let positiveCases = 0;
let negativeCases = 0;

function passPositive(fn) {
  fn();
  positiveCases += 1;
}

function deny(fn, expectedCode) {
  assert.throws(
    fn,
    (error) => {
      if (expectedCode) assert.equal(error?.code ?? error?.message, expectedCode);
      return true;
    },
  );
  negativeCases += 1;
}

const batchKey = PublicKey.fromString(BATCH_KEY);

function freezeInner(transaction, payer) {
  transaction.setTransactionId(TransactionId.generate(AccountId.fromString(payer)));
  transaction.setBatchKey(batchKey);
  transaction.freeze();
  return transaction;
}

function wrapInner(inner) {
  const batch = new BatchTransaction().setInnerTransactions(inner);
  batch.setTransactionId(TransactionId.generate(AccountId.fromString(fixture.providerOperationsAccountId)));
  batch.setNodeAccountIds([AccountId.fromString(fixture.nodeAccountId)]);
  batch.freeze();
  return batch;
}

function buildTransfer(overrides = {}) {
  const bookingTokenId = overrides.bookingTokenId ?? fixture.bookingTokenId;
  const serial = overrides.serial ?? fixture.serial;
  const seller = overrides.sellerAccountId ?? fixture.sellerAccountId;
  const receiver = overrides.receiverAccountId ?? fixture.receiverAccountId;
  const settlementTokenId = overrides.settlementTokenId ?? fixture.settlementTokenId;
  const funder = overrides.settlementSourceAccountId ?? fixture.settlementSourceAccountId;
  const recipient = overrides.settlementRecipientAccountId ?? fixture.settlementRecipientAccountId;
  const amount = BigInt(overrides.settlementAmountAtomicUnits ?? fixture.settlementAmountAtomicUnits);
  const decimals = overrides.settlementDecimals ?? fixture.settlementDecimals;
  const payer = overrides.payerAccountId ?? fixture.delegatedAgentAccountId;

  const transaction = new TransferTransaction()
    .addApprovedNftTransfer(
      new NftId(TokenId.fromString(bookingTokenId), serial),
      AccountId.fromString(seller),
      AccountId.fromString(receiver),
    )
    .addTokenTransferWithDecimals(settlementTokenId, funder, -amount, decimals)
    .addTokenTransferWithDecimals(settlementTokenId, recipient, amount, decimals);

  if (overrides.extraNft) {
    transaction.addApprovedNftTransfer(
      new NftId(TokenId.fromString(bookingTokenId), serial + 1),
      AccountId.fromString(seller),
      AccountId.fromString(receiver),
    );
  }
  if (overrides.extraToken) {
    transaction
      .addTokenTransferWithDecimals("0.0.429275", funder, -BigInt(1), 6)
      .addTokenTransferWithDecimals("0.0.429275", recipient, BigInt(1), 6);
  }
  if (overrides.hbar) {
    transaction
      .addHbarTransfer(funder, "-0.00000001")
      .addHbarTransfer(recipient, "0.00000001");
  }
  return freezeInner(transaction, payer);
}

function replaceTransfer(goodInner, transfer) {
  const next = [...goodInner];
  next[2] = transfer;
  return wrapInner(next);
}

const built = buildControlledBookingTransferBatch(fixture);
const bytes = built.toBytes();
const decoded = Transaction.fromBytes(bytes);

passPositive(() => {
  const validated = validateControlledBookingTransferBatch(decoded, fixture);
  assert.ok(validated instanceof BatchTransaction);
  assert.equal(validated.innerTransactions.length, 5);
  assert.equal(validated.transactionId?.accountId?.toString(), fixture.providerOperationsAccountId);
});
passPositive(() => {
  const validated = decodeAndValidateControlledBookingTransferBatch(bytes, fixture);
  assert.equal(validated.innerTransactions.length, 5);
});
passPositive(() => {
  // Receiver may already be unfrozen before an authorized purchase. The batch
  // still freezes the receiver after transfer so the entitlement rests frozen.
  const unfrozenReceiver = clone(fixture);
  unfrozenReceiver.currentState.receiverRelationshipFrozen = false;
  const candidate = buildControlledBookingTransferBatch(unfrozenReceiver);
  const validated = decodeAndValidateControlledBookingTransferBatch(candidate.toBytes(), unfrozenReceiver);
  assert.equal(validated.innerTransactions.length, 4);
});

const goodInner = /** @type {BatchTransaction} */ (decoded).innerTransactions;

// Exact expected identity/economic mutations against unchanged bytes.
for (const mutate of [
  (x) => (x.bookingTokenId = "0.0.8002"),
  (x) => (x.serial = 214),
  (x) => (x.sellerAccountId = "0.0.7012"),
  (x) => (x.receiverAccountId = "0.0.7013"),
  (x) => (x.settlementSourceAccountId = "0.0.7013"),
  (x) => (x.settlementRecipientAccountId = "0.0.7012"),
  (x) => (x.settlementAmountAtomicUnits = "44000000"),
  (x) => (x.settlementDecimals = 5),
]) {
  const changed = clone(fixture);
  mutate(changed);
  deny(() => validateControlledBookingTransferBatch(decoded, changed));
}

// Actual payload mutations: NFT, stable-value rows, payer, HBAR and scope.
for (const overrides of [
  { bookingTokenId: "0.0.8002" },
  { serial: 214 },
  { sellerAccountId: "0.0.7012" },
  { receiverAccountId: "0.0.7013" },
  { settlementSourceAccountId: "0.0.7013" },
  { settlementRecipientAccountId: "0.0.7012" },
  { settlementAmountAtomicUnits: "44000000" },
  { settlementDecimals: 5 },
  { payerAccountId: "0.0.7014" },
  { extraNft: true },
  { extraToken: true },
  { hbar: true },
]) {
  deny(() => validateControlledBookingTransferBatch(replaceTransfer(goodInner, buildTransfer(overrides)), fixture));
}

// Missing final receiver refreeze and an unfreeze-only escape are both denied.
deny(() => validateControlledBookingTransferBatch(wrapInner(goodInner.slice(0, -1)), fixture));
deny(() => validateControlledBookingTransferBatch(wrapInner(goodInner.slice(0, 2)), fixture));

// Any extra inner transaction widens the exact authorized batch.
deny(() =>
  validateControlledBookingTransferBatch(wrapInner([...goodInner, goodInner[0]]), fixture),
);

// Collection-wide NFT authority is specifically outside the transfer contract.
const allSerialAllowance = freezeInner(
  new AccountAllowanceApproveTransaction().approveTokenNftAllowanceAllSerials(
    fixture.bookingTokenId,
    fixture.sellerAccountId,
    fixture.delegatedAgentAccountId,
  ),
  fixture.sellerAccountId,
);
const allowanceWidened = [...goodInner];
allowanceWidened[2] = allSerialAllowance;
deny(() => validateControlledBookingTransferBatch(wrapInner(allowanceWidened), fixture));

// Trusted-current-state preconditions fail closed before any batch bytes exist.
for (const mutate of [
  (x) => (x.currentState.providerPolicyAllows = false),
  (x) => (x.currentState.holderMandateAllows = false),
  (x) => (x.currentState.buyerEligible = false),
  (x) => (x.currentState.exactPaymentAuthorized = false),
  (x) => (x.currentState.providerScopedCollection = false),
  (x) => (x.currentState.tokenFreezeDefault = false),
  (x) => (x.currentState.sellerOwnsSerial = false),
  (x) => (x.currentState.sellerAssociated = false),
  (x) => (x.currentState.receiverAssociated = false),
  (x) => (x.currentState.sellerRelationshipFrozen = false),
  (x) => (x.currentState.currentBookingTokenId = "0.0.8002"),
  (x) => (x.currentState.currentBookingSerial = 214),
  (x) => (x.currentState.currentHolderAccountId = "0.0.7012"),
  (x) => (x.currentState.delegatedAllowanceSpenderAccountId = "0.0.7014"),
]) {
  const changed = clone(fixture);
  mutate(changed);
  deny(() => buildControlledBookingTransferBatch(changed));
}

// Role collision and malformed-key paths are denied before construction.
for (const mutate of [
  (x) => (x.settlementSourceAccountId = x.sellerAccountId),
  (x) => (x.settlementRecipientAccountId = x.receiverAccountId),
  (x) => (x.providerOperationsAccountId = x.delegatedAgentAccountId),
  (x) => (x.delegatedAgentAccountId = x.receiverAccountId),
  (x) => (x.batchKeyPublicKey = "not-a-public-key"),
]) {
  const changed = clone(fixture);
  mutate(changed);
  deny(() => buildControlledBookingTransferBatch(changed));
}

assert.ok(negativeCases >= 40, `expected a broad fail-closed matrix, got ${negativeCases}`);

const packageJson = readFileSync("package.json");
const packageLock = readFileSync("package-lock.json");
const evidence = {
  schemaVersion: 1,
  evidenceClass: "CI_LOCAL_CREDENTIAL_FREE",
  sdkVersion: sdkPackage.version,
  hip551: {
    batchTransactionAvailable: typeof BatchTransaction === "function",
    batchifyAvailable: typeof Transaction.prototype.batchify === "function",
    batchifyInvoked: false,
    reason: "batchify signs with a client operator; qualification uses setBatchKey + freeze without any signer",
    decodedAtomicBatch: true,
  },
  selectedProductionAssumptions: {
    providerScopedCollection: true,
    freezeDefault: true,
    sellerFrozenAtRest: true,
    receiverFrozenAfterTransfer: true,
    bobIsStableValueFunderAndReceiver: true,
    mayaIsSettlementRecipient: true,
    delegatedAgentIsApprovedNftExecutor: true,
    providerOperationsRoleIsSeparate: true,
  },
  innerFeeBoundary: {
    providerOperationsPaysFreezeUnfreezeAndOuterBatch: true,
    delegatedAgentPaysApprovedTransferInnerTransaction: true,
    bobPaysNetworkFee: false,
    claimOfSingleRelayerSponsoringAllInnerFees: false,
  },
  positiveCases,
  negativeCases,
  transactionBytesProduced: bytes.length > 0,
  liveTransactionsSigned: 0,
  liveTransactionsSubmitted: 0,
  networkMutation: false,
  realCredentialsLoaded: false,
  packageJsonSha256: createHash("sha256").update(packageJson).digest("hex"),
  packageLockSha256: createHash("sha256").update(packageLock).digest("hex"),
};
writeFileSync(
  "hedera-controlled-transfer-evidence.json",
  `${JSON.stringify(evidence, null, 2)}\n`,
);

console.log(
  JSON.stringify(
    {
      status: "PASS",
      sdkVersion: sdkPackage.version,
      positiveCases,
      negativeCases,
      bytes: bytes.length,
      liveTransactionsSigned: 0,
      liveTransactionsSubmitted: 0,
      realCredentialsLoaded: false,
    },
    null,
    2,
  ),
);
