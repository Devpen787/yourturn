import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { Transaction } from "@hiero-ledger/sdk";
import { preparePolicyAuthorizedUsdcRecovery } from "../../lib/hedera-agent-kit/policy-authorized-usdc-recovery.ts";
import {
  HEDERA_TESTNET_USDC_TOKEN_ID,
  HEDERA_USDC_DECIMALS,
  HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS,
  validateAtomicUsdcRecoveryTransaction,
} from "../../lib/hedera-agent-kit/usdc-recovery-semantics.ts";

const MIRROR = "https://testnet.mirrornode.hedera.com/api/v1";
const transactionId = "0.0.8504405@1789139309.785362819";
const mirrorTransactionId = "0.0.8504405-1789139309-785362819";
const cleanupTransactionId = "0.0.8504300-1789139313-785767378";
const bookingTokenId = "0.0.8505698";
const serial = 213;
const holderAccountId = "0.0.8504300";
const spenderAccountId = "0.0.8504405";
const receiverAccountId = "0.0.8504715";
const settlementAtomicUnits = 45_000_000n;
const belowMinimumAtomicUnits = "32000000";
const expectedSpenderFinal = 34_980_000n;
const expectedHolderFinal = 45_020_000n;
const outputPath = process.env.SECURITY_HEDERA_USDC_ATOMIC_OUT ?? "security-hedera-usdc-atomic-live-retest.json";

async function mirrorJson(path) {
  const url = path.startsWith("http") ? path : `${MIRROR}${path}`;
  const response = await fetch(url, { headers: { accept: "application/json" } });
  assert.equal(response.ok, true, `mirror_http_${response.status}:${url}`);
  return response.json();
}

function txAccount(item) {
  return item.account ?? item.account_id;
}

function exactPublicSettlement(tx) {
  assert.equal(tx.result, "SUCCESS", "settlement_not_success");
  assert.equal(tx.transaction_id, mirrorTransactionId, "unexpected_transaction_id");

  const nftTransfers = tx.nft_transfers ?? [];
  assert.equal(nftTransfers.length, 1, "unexpected_extra_or_missing_nft_transfer");
  const nft = nftTransfers[0];
  assert.equal(nft.token_id, bookingTokenId);
  assert.equal(Number(nft.serial_number), serial);
  assert.equal(nft.sender_account_id, holderAccountId);
  assert.equal(nft.receiver_account_id, receiverAccountId);
  assert.equal(nft.is_approval, true);

  const tokenTransfers = tx.token_transfers ?? [];
  assert.equal(tokenTransfers.length, 2, "unexpected_extra_or_missing_fungible_transfer");
  assert.equal(tokenTransfers.every((entry) => entry.token_id === HEDERA_TESTNET_USDC_TOKEN_ID), true);
  const spenderLeg = tokenTransfers.find((entry) => txAccount(entry) === spenderAccountId);
  const holderLeg = tokenTransfers.find((entry) => txAccount(entry) === holderAccountId);
  assert.ok(spenderLeg, "missing_spender_leg");
  assert.ok(holderLeg, "missing_holder_leg");
  assert.equal(BigInt(spenderLeg.amount), -settlementAtomicUnits);
  assert.equal(BigInt(holderLeg.amount), settlementAtomicUnits);

  return { nftTransfers, tokenTransfers };
}

function expectPublicVerifierRejects(mutator, expectedPattern) {
  const clone = structuredClone(publicTx);
  mutator(clone);
  assert.throws(() => exactPublicSettlement(clone), expectedPattern);
}

function oneShotStore() {
  let reservations = 0;
  return {
    get reservations() {
      return reservations;
    },
    async reserve() {
      reservations += 1;
      return "claimed";
    },
  };
}

const nowMs = 1_789_139_000_000;
const delegation = {
  delegationId: "security-canonical-usdc-recovery",
  delegatedAgentAccountId: spenderAccountId,
  spenderAccountId,
  tokenId: bookingTokenId,
  serial,
  holderAccountId,
  allowedActions: ["RECOVER"],
  minimumRecovery: {
    asset: { kind: "HTS", tokenId: HEDERA_TESTNET_USDC_TOKEN_ID },
    atomicUnits: HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS,
  },
  expiresAtMs: nowMs + 60_000,
  cancellationAllowed: false,
  providerPolicyId: "security-provider-allow",
  revokedAtMs: null,
};

const deniedStore = oneShotStore();
const denied = await preparePolicyAuthorizedUsdcRecovery({
  delegation,
  invocation: {
    agentAccountId: spenderAccountId,
    currentHolderAccountId: holderAccountId,
    action: "RECOVER",
    nonce: "security-below-minimum-32",
    providerPolicy: { id: delegation.providerPolicyId, state: "ALLOW" },
    recovery: {
      asset: { kind: "HTS", tokenId: HEDERA_TESTNET_USDC_TOKEN_ID },
      atomicUnits: belowMinimumAtomicUnits,
    },
    receiverAccountId,
  },
  nonceStore: deniedStore,
  now: () => nowMs,
});
assert.equal(denied.ok, false);
assert.equal(denied.decision.outcome, "BLOCK");
assert.equal(denied.decision.reason, "BELOW_MINIMUM_RECOVERY");
assert.equal(denied.transactionBytesProduced, false);
assert.equal(deniedStore.reservations, 0, "below_minimum_must_not_reserve_nonce");

const acceptedStore = oneShotStore();
const accepted = await preparePolicyAuthorizedUsdcRecovery({
  delegation,
  invocation: {
    agentAccountId: spenderAccountId,
    currentHolderAccountId: holderAccountId,
    action: "RECOVER",
    nonce: "security-canonical-45",
    providerPolicy: { id: delegation.providerPolicyId, state: "ALLOW" },
    recovery: {
      asset: { kind: "HTS", tokenId: HEDERA_TESTNET_USDC_TOKEN_ID },
      atomicUnits: settlementAtomicUnits.toString(),
    },
    receiverAccountId,
  },
  nonceStore: acceptedStore,
  now: () => nowMs,
});
assert.equal(accepted.ok, true, "canonical_45_must_prepare");
assert.equal(acceptedStore.reservations, 1);
const decoded = Transaction.fromBytes(Buffer.from(accepted.envelope.bytesBase64, "base64"));
validateAtomicUsdcRecoveryTransaction(decoded, {
  bookingTokenId,
  serial,
  holderAccountId,
  spenderAccountId,
  receiverAccountId,
  settlementTokenId: HEDERA_TESTNET_USDC_TOKEN_ID,
  settlementAmountAtomicUnits: settlementAtomicUnits.toString(),
  settlementRecipientAccountId: holderAccountId,
  settlementDecimals: HEDERA_USDC_DECIMALS,
});

const liveSource = readFileSync("scripts/hedera-policy-usdc-recovery-live.mjs", "utf8");
const belowMinimumAssertion = liveSource.indexOf("32_usdc_denial_must_precede_nonce_reservation");
const ownerSecretLoad = liveSource.indexOf("const ownerSigner = signerMaterialFor(holderAccountId)");
const semanticValidation = liveSource.indexOf("validateAtomicUsdcRecoveryTransaction(transaction");
const spenderSecretLoad = liveSource.indexOf("const spenderSigner = signerMaterialFor(spenderAccountId)");
const signerCall = liveSource.indexOf("transaction.sign(spenderKey)");
assert.ok(belowMinimumAssertion >= 0 && ownerSecretLoad > belowMinimumAssertion, "below_minimum_not_proven_before_owner_secret");
assert.ok(semanticValidation >= 0 && spenderSecretLoad > semanticValidation, "semantic_gate_not_before_spender_secret");
assert.ok(signerCall > semanticValidation, "semantic_gate_not_before_signing");

const txBody = await mirrorJson(`/transactions/${mirrorTransactionId}`);
const txMatches = (txBody.transactions ?? []).filter((candidate) => candidate.transaction_id === mirrorTransactionId);
assert.equal(txMatches.length, 1, "exact_transaction_record_count_mismatch");
const publicTx = txMatches[0];
const exactTransfers = exactPublicSettlement(publicTx);

// Attack the independent verifier itself: widened or altered public movements must fail.
expectPublicVerifierRejects(
  (tx) => tx.nft_transfers.push({ ...tx.nft_transfers[0], serial_number: 214 }),
  /unexpected_extra_or_missing_nft_transfer/
);
expectPublicVerifierRejects(
  (tx) => tx.token_transfers.push({ token_id: "0.0.999999", account: receiverAccountId, amount: 1 }),
  /unexpected_extra_or_missing_fungible_transfer/
);
expectPublicVerifierRejects(
  (tx) => { tx.token_transfers.find((entry) => txAccount(entry) === spenderAccountId).amount = -44_000_000; },
  /Expected values to be strictly equal/
);
expectPublicVerifierRejects(
  (tx) => { tx.nft_transfers[0].receiver_account_id = spenderAccountId; },
  /Expected values to be strictly equal/
);

const owner = await mirrorJson(`/tokens/${bookingTokenId}/nfts/${serial}`);
assert.equal(owner.account_id, receiverAccountId, "final_owner_mismatch");

async function tokenBalance(accountId) {
  const body = await mirrorJson(`/accounts/${accountId}/tokens?token.id=${HEDERA_TESTNET_USDC_TOKEN_ID}&limit=1`);
  const association = (body.tokens ?? []).find((entry) => entry.token_id === HEDERA_TESTNET_USDC_TOKEN_ID);
  assert.ok(association, `missing_usdc_association:${accountId}`);
  return BigInt(association.balance);
}
const [spenderFinal, holderFinal] = await Promise.all([
  tokenBalance(spenderAccountId),
  tokenBalance(holderAccountId),
]);
assert.equal(spenderFinal, expectedSpenderFinal, "current_spender_balance_mismatch");
assert.equal(holderFinal, expectedHolderFinal, "current_holder_balance_mismatch");

const cleanupBody = await mirrorJson(`/transactions/${cleanupTransactionId}`);
const cleanup = (cleanupBody.transactions ?? []).find((candidate) => candidate.transaction_id === cleanupTransactionId);
assert.ok(cleanup, "cleanup_transaction_missing");
assert.equal(cleanup.result, "SENDER_DOES_NOT_OWN_NFT_SERIAL_NO", "cleanup_did_not_observe_moved_nft");

const result = {
  ok: true,
  evidenceLevel: "INDEPENDENT_SECURITY_LIVE_TESTNET_READ_ONLY",
  attackedHead: process.env.GITHUB_SHA ?? null,
  canonicalTransactionId: transactionId,
  canonicalMirrorTransactionId: mirrorTransactionId,
  publicTransaction: {
    result: publicTx.result,
    exactNftTransferCount: exactTransfers.nftTransfers.length,
    exactFungibleTransferCount: exactTransfers.tokenTransfers.length,
    bookingTokenId,
    serial,
    holderAccountId,
    receiverAccountId,
    usdcTokenId: HEDERA_TESTNET_USDC_TOKEN_ID,
    settlementAtomicUnits: settlementAtomicUnits.toString(),
    spenderAccountId,
  },
  finalState: {
    ownerAccountId: owner.account_id,
    spenderUsdcAtomicUnits: spenderFinal.toString(),
    holderUsdcAtomicUnits: holderFinal.toString(),
  },
  policyControls: {
    minimumAtomicUnits: HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS,
    exact32RejectedBeforeNonce: deniedStore.reservations === 0 && denied.transactionBytesProduced === false,
    exact45PreparedAndSemanticallyDecoded: true,
  },
  chainOfCustodySourceOrdering: {
    belowMinimumBeforeOwnerSecretLoad: ownerSecretLoad > belowMinimumAssertion,
    semanticValidationBeforeSpenderSecretLoad: spenderSecretLoad > semanticValidation,
    semanticValidationBeforeSigning: signerCall > semanticValidation,
  },
  corroboratingCleanup: {
    transactionId: cleanupTransactionId,
    result: cleanup.result,
  },
  adversarialVerifierMutationsRejected: 4,
  claimBoundary: {
    singleHederaTransactionContainsExactBookingNftAnd45Usdc: true,
    transactionBoundaryAtomicWordingSupported: true,
    fullRecoveryWorkflowAtomicWordingSupported: false,
    liveDurableRedisReplayProvenByThisArtifact: false,
  },
};

writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
