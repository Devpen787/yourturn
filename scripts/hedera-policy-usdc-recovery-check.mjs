import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { AgentMode } from "@hashgraph/hedera-agent-kit";
import { PrivateKey, PublicKey, Transaction, TransferTransaction } from "@hiero-ledger/sdk";
import { preparePolicyAuthorizedUsdcRecovery } from "../lib/hedera-agent-kit/policy-authorized-usdc-recovery.ts";
import { buildExactPaymentProposal, paymentCommitmentMemo, RedisPaymentOperationStore } from "../lib/hedera-agent-kit/exact-payment-authorization.ts";
import { createDelegatedRecoveryReturnBytesRuntime, YOURTURN_DELEGATED_RECOVERY_SETTLE_USDC_TOOL } from "../lib/hedera-agent-kit/delegated-recovery-plugin.ts";

// Public deterministic test keys + already-expired 2023 transaction IDs. No live
// account keys, dotenv, operator, query, execute, network funds, or submit.
const bob = PrivateKey.fromStringED25519("11".repeat(32));
const stranger = PrivateKey.fromStringED25519("22".repeat(32));
const NOW = 1700000000000;
const USDC = "0.0.429274";
const ids = { maya: "0.0.7002", bob: "0.0.7003", agent: "0.0.7004", other: "0.0.7005" };
function fixture() {
  return {
    resolvedAtMs: NOW,
    delegation: {
      delegationId: "mandate-active-40", delegatedAgentAccountId: ids.agent, spenderAccountId: ids.agent,
      tokenId: "0.0.7001", serial: 7, holderAccountId: ids.maya,
      allowedActions: ["RECOVER"], minimumRecovery: { asset: { kind: "HTS", tokenId: USDC }, atomicUnits: "40000000" },
      expiresAtMs: NOW + 600000, cancellationAllowed: true, providerPolicyId: "studio-a", revokedAtMs: null,
    },
    invocation: {
      agentAccountId: ids.agent, currentHolderAccountId: ids.maya, action: "RECOVER", nonce: "operation-1",
      providerPolicy: { id: "studio-a", state: "ALLOW" },
      recovery: { asset: { kind: "HTS", tokenId: USDC }, atomicUnits: "45000000" }, receiverAccountId: ids.bob,
    },
    buyerAccountId: ids.bob,
    commitment: {
      domain: "yourturn:hedera:testnet:exact-payment:v1", commitmentId: "payment-1", operationId: "operation-1",
      delegationId: "mandate-active-40", quoteId: "quote-45", quoteHash: "ab".repeat(32),
      providerPolicyId: "studio-a", providerPolicyVersion: "v1", bookingTokenId: "0.0.7001", serial: 7,
      holderAccountId: ids.maya, delegatedAgentAccountId: ids.agent, settlementSourceAccountId: ids.bob,
      receiverAccountId: ids.bob, settlementRecipientAccountId: ids.maya, transactionFeePayerAccountId: ids.agent,
      settlementTokenId: USDC, settlementDecimals: 6, settlementAmountAtomicUnits: "45000000",
      transactionId: `${ids.agent}@1700000000.000000000`, nodeAccountId: "0.0.3", transactionValidDurationSeconds: 120,
      maxTransactionFeeTinybars: "200000000", expiresAtMs: NOW + 120000,
    },
    quote: { id: "quote-45", hash: "ab".repeat(32), expiresAtMs: NOW + 120000 },
    providerPolicy: { id: "studio-a", version: "v1", state: "ALLOW", validUntilMs: NOW + 600000, minimumRecoveryAtomicUnits: null },
    fundingAccount: { accountId: ids.bob, publicKey: bob.publicKey.toString(), tokenId: USDC, decimals: 6, availableAtomicUnits: "45000000" },
    tokens: { booking:{tokenId:"0.0.7001",customFeeCount:0,feeScheduleKey:null}, settlement:{tokenId:USDC,customFeeCount:0,feeScheduleKey:null} },
    bookingAllowance:{tokenId:"0.0.7001",serial:7,ownerAccountId:ids.maya,spenderAccountId:ids.agent,approvedForAll:false},
    paymentRevokedAtMs: null,
  };
}
class MemoryStore {
  data = new Map(); calls = 0;
  async reserve(keys, fingerprint) {
    this.calls++;
    if (keys.some(k => this.data.has(k) && this.data.get(k) !== fingerprint)) return "conflict";
    if (keys.some(k => this.data.has(k))) return "duplicate";
    keys.forEach(k => this.data.set(k, fingerprint));
    return "claimed";
  }
}
async function authorize(state, key = bob) {
  let signatureHex;
  await buildExactPaymentProposal(state.commitment).signWith(key.publicKey, async body => {
    signatureHex = Buffer.from(key.sign(body)).toString("hex");
    return Buffer.from(signatureHex, "hex");
  });
  return { signatureHex };
}
async function run(state, options = {}) {
  return preparePolicyAuthorizedUsdcRecovery({
    operationId: state.commitment.operationId,
    paymentAuthorization: options.auth ?? await authorize(state),
    resolveState: async () => state, operationStore: options.store ?? new MemoryStore(), now: () => NOW,
    ...options.args,
  });
}
const checks = [];
async function test(name, fn) { await fn(); checks.push(name); }
function denied(result, reason) {
  assert.equal(result.ok, false, JSON.stringify(result));
  assert.equal(result.transactionBytesProduced, false);
  assert.equal("envelope" in result, false);
  assert.equal("paymentAuthorization" in result, false);
  if (reason) assert.equal(result.decision.reason, reason);
}
function quote32(s) {
  s.commitment.settlementAmountAtomicUnits = "32000000";
  s.invocation.recovery.atomicUnits = "32000000";
  s.commitment.quoteId = s.quote.id = "quote-32";
  s.commitment.quoteHash = s.quote.hash = "cd".repeat(32);
}
await test("hero 40/45: unsigned atomic Maya NFT -> Bob; Bob 45 USDC -> Maya; agent fees", async () => {
  const s = fixture(); const result = await run(s);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.envelope.signed, false); assert.equal(result.envelope.submitted, false);
  assert.equal(result.envelope.mode, "RETURN_BYTES");
  const tx = Transaction.fromBytes(Buffer.from(result.envelope.bytesBase64, "base64"));
  assert.ok(tx instanceof TransferTransaction);
  assert.equal(tx.hbarTransfers.size, 0);
  const nfts = Array.from(tx.nftTransfers);
  assert.equal(nfts.length, 1); assert.equal(nfts[0][1].length, 1);
  assert.equal(nfts[0][0].toString(), "0.0.7001");
  const nft = nfts[0][1][0];
  assert.equal(nft.serial.toNumber(), 7); assert.equal(nft.sender.toString(), ids.maya);
  assert.equal(nft.recipient.toString(), ids.bob); assert.equal(nft.isApproved, true);
  assert.equal(tx.tokenTransfers.size, 1);
  const amounts = tx.tokenTransfers.get(USDC);
  assert.equal(amounts.size, 2); assert.equal(amounts.get(ids.bob).toString(), "-45000000");
  assert.equal(amounts.get(ids.maya).toString(), "45000000"); assert.equal(amounts.get(ids.agent), null);
  assert.equal(tx.tokenIdDecimals.get(USDC), 6);
  assert.equal(tx.transactionId.accountId.toString(), ids.agent);
  assert.equal(tx.transactionMemo, paymentCommitmentMemo(s.commitment));
  assert.ok(tx.getSignatures().getFlatSignatureList().every(map => map.size === 0));
  assert.deepEqual(result.settlement, { tokenId: USDC, atomicUnits: "45000000", decimals: 6,
    delegatedAgentAccountId: ids.agent, settlementSourceAccountId: ids.bob, receiverAccountId: ids.bob,
    settlementRecipientAccountId: ids.maya, transactionFeePayerAccountId: ids.agent });
  // Native exact-transaction authorization survives the RETURN_BYTES round trip.
  tx.addSignature(PublicKey.fromString(result.paymentAuthorization.publicKey), Buffer.from(result.paymentAuthorization.signatureHex, "hex"));
  assert.equal(bob.publicKey.verifyTransaction(tx), true);
});
await test("32 blocked under active 40 before reservation", async () => {
  const s = fixture(); quote32(s); const store = new MemoryStore();
  denied(await run(s, {store}), "BELOW_MINIMUM_RECOVERY"); assert.equal(store.calls, 0);
});
await test("fresh active 30 replacement permits 32 when provider permits", async () => {
  const s = fixture(); quote32(s);
  s.delegation.delegationId = s.commitment.delegationId = "mandate-active-30";
  s.delegation.minimumRecovery.atomicUnits = "30000000";
  assert.equal((await run(s)).ok, true);
});
await test("provider floor 35 independently blocks 32 despite active 30", async () => {
  const s = fixture(); quote32(s); s.delegation.minimumRecovery.atomicUnits = "30000000";
  s.providerPolicy.minimumRecoveryAtomicUnits = "35000000";
  denied(await run(s), "BELOW_PROVIDER_MINIMUM");
});
await test("zero holder minimum is representable without weakening provider", async () => {
  const s = fixture(); s.delegation.minimumRecovery.atomicUnits = "0"; s.providerPolicy.minimumRecoveryAtomicUnits = "46000000";
  denied(await run(s), "BELOW_PROVIDER_MINIMUM");
});
const attacks = [
  ["wrong Bob", s => s.buyerAccountId = ids.other, "PAYMENT_RECEIVER_MISMATCH"],
  ["wrong payment source", s => s.commitment.settlementSourceAccountId = ids.other, "PAYMENT_SOURCE_MISMATCH"],
  ["receiver differs from payment commitment", s => s.invocation.receiverAccountId = ids.other, "PAYMENT_RECEIVER_MISMATCH"],
  ["wrong recipient", s => s.commitment.settlementRecipientAccountId = ids.other, "PAYMENT_RECIPIENT_MISMATCH"],
  ["changed amount", s => s.invocation.recovery.atomicUnits = "46000000", "PAYMENT_AMOUNT_MISMATCH"],
  ["changed quote ID", s => s.quote.id = "quote-new", "PAYMENT_QUOTE_MISMATCH"],
  ["changed quote hash", s => s.quote.hash = "ee".repeat(32), "PAYMENT_QUOTE_MISMATCH"],
  ["wrong USDC token", s => s.fundingAccount.tokenId = "0.0.456858", "PAYMENT_ASSET_MISMATCH"],
  ["wrong decimals", s => s.fundingAccount.decimals = 8, "PAYMENT_ASSET_MISMATCH"],
  ["stale provider policy", s => s.providerPolicy.validUntilMs = NOW - 1, "PROVIDER_POLICY_STALE"],
  ["changed provider version", s => s.providerPolicy.version = "v2", "PROVIDER_POLICY_CHANGED"],
  ["provider BLOCK", s => s.providerPolicy.state = s.invocation.providerPolicy.state = "BLOCK", "PROVIDER_POLICY_DENIED"],
  ["provider REVIEW", s => s.providerPolicy.state = s.invocation.providerPolicy.state = "REVIEW", "PROVIDER_POLICY_DENIED"],
  ["provider unknown", s => s.providerPolicy.state = s.invocation.providerPolicy.state = "allow", "PROVIDER_POLICY_DENIED"],
  ["invalid provider minimum", s => s.providerPolicy.minimumRecoveryAtomicUnits = "-1", "PROVIDER_MINIMUM_INVALID"],
  ["missing provider minimum decision", s => delete s.providerPolicy.minimumRecoveryAtomicUnits, "PROVIDER_MINIMUM_INVALID"],
  ["expired holder mandate", s => s.delegation.expiresAtMs = NOW, "DELEGATION_EXPIRED"],
  ["revoked holder mandate", s => s.delegation.revokedAtMs = NOW - 1, "DELEGATION_REVOKED"],
  ["missing token fee evidence", s => delete s.tokens, "EXACT_NET_TOKEN_POLICY_REQUIRED"],
  ["NFT custom fee would widen economics", s => s.tokens.booking.customFeeCount = 1, "EXACT_NET_TOKEN_POLICY_REQUIRED"],
  ["USDC custom fee would widen economics", s => s.tokens.settlement.customFeeCount = 1, "EXACT_NET_TOKEN_POLICY_REQUIRED"],
  ["mutable fee schedule", s => s.tokens.booking.feeScheduleKey = "mutable-key", "EXACT_NET_TOKEN_POLICY_REQUIRED"],
  ["missing serial allowance", s => delete s.bookingAllowance, "SERIAL_ALLOWANCE_REQUIRED"],
  ["wrong serial allowance", s => s.bookingAllowance.serial = 8, "SERIAL_ALLOWANCE_REQUIRED"],
  ["revoked or changed allowance spender", s => s.bookingAllowance.spenderAccountId = ids.other, "SERIAL_ALLOWANCE_REQUIRED"],
  ["collection-wide allowance refused", s => s.bookingAllowance.approvedForAll = true, "SERIAL_ALLOWANCE_REQUIRED"],
  ["payment revoked", s => s.paymentRevokedAtMs = NOW - 1, "PAYMENT_REVOKED"],
  ["missing payment revocation state", s => delete s.paymentRevokedAtMs, "PAYMENT_REVOKED"],
  ["payment expired", s => s.quote.expiresAtMs = NOW, "PAYMENT_EXPIRED"],
  ["insufficient funds", s => s.fundingAccount.availableAtomicUnits = "44999999", "PAYMENT_FUNDS_INSUFFICIENT"],
  ["stale funding/authority resolution", s => s.resolvedAtMs -= 5001, "EXECUTION_STATE_STALE"],
  ["future authority resolution", s => s.resolvedAtMs += 1, "EXECUTION_STATE_STALE"],
  ["wrong current holder", s => s.invocation.currentHolderAccountId = ids.other, "PAYMENT_HOLDER_MISMATCH"],
  ["wrong delegated agent", s => s.invocation.agentAccountId = ids.other, "PAYMENT_AGENT_MISMATCH"],
  ["separate fee relayer without native spender authority", s => s.commitment.transactionFeePayerAccountId = ids.other, "ALLOWANCE_SPENDER_FEE_PAYER_MISMATCH"],
  ["wrong native transaction payer", s => s.commitment.transactionId = `${ids.other}@1700000000.000000000`, "PAYMENT_TRANSACTION_PAYER_MISMATCH"],
  ["wrong booking serial", s => s.delegation.serial = 8, "PAYMENT_BOOKING_MISMATCH"],
  ["wrong operation", s => s.invocation.nonce = "operation-2", "OPERATION_MISMATCH"],
  ["scope without RECOVER", s => s.delegation.allowedActions = [], "ACTION_NOT_ALLOWED"],
  ["malformed allowedActions", s => s.delegation.allowedActions = ["recover"], "INVALID_DELEGATION"],
  ["wrong action", s => s.invocation.action = "REVOKE", "TOOL_ACTION_MISMATCH"],
  ["unsupported threshold key", s => s.fundingAccount.publicKey = "threshold:1of2", "FUNDING_KEY_UNSUPPORTED"],
];
for (const [name, mutate, reason] of attacks) await test(name, async () => {
  const s = fixture(); const auth = await authorize(s); const store = new MemoryStore(); mutate(s);
  denied(await run(s, {auth, store}), reason); assert.equal(store.calls, 0, name);
});
for (const [name, signatureHex, reason] of [
  ["missing authorization", "", "PAYMENT_AUTHORIZATION_MISSING"],
  ["insufficient signature", "11", "PAYMENT_AUTHORIZATION_MISSING"],
  ["forged signature", "00".repeat(64), "PAYMENT_SIGNATURE_INVALID"],
]) await test(name, async () => denied(await run(fixture(), {auth:{signatureHex}}), reason));
await test("wrong Bob key cannot authorize exact payment", async () => {
  const s = fixture(); denied(await run(s, {auth:await authorize(s, stranger)}), "PAYMENT_SIGNATURE_INVALID");
});
await test("coherent amount/quote mutation cannot reuse Bob signature", async () => {
  const s = fixture(); const auth = await authorize(s); s.commitment.settlementAmountAtomicUnits = s.invocation.recovery.atomicUnits = "44000000";
  s.commitment.quoteId = s.quote.id = "quote-44"; denied(await run(s, {auth}), "PAYMENT_SIGNATURE_INVALID");
});
await test("coherent receiver and funding substitution cannot reuse Bob signature", async () => {
  const s = fixture(); const auth = await authorize(s);
  s.buyerAccountId = s.fundingAccount.accountId = s.commitment.settlementSourceAccountId = s.commitment.receiverAccountId = s.invocation.receiverAccountId = ids.other;
  s.fundingAccount.publicKey = stranger.publicKey.toString(); denied(await run(s,{auth}), "PAYMENT_SIGNATURE_INVALID");
});
for (const field of ["commitmentId", "operationId", "quoteId", "quoteHash", "providerPolicyVersion", "serial", "maxTransactionFeeTinybars"]) await test(`native authorization binds ${field}`, async () => {
  const s = fixture(); const auth = await authorize(s);
  if (field === "serial") s.commitment.serial = s.delegation.serial = s.bookingAllowance.serial = 8;
  else if (field === "operationId") s.commitment.operationId = s.invocation.nonce = "operation-2";
  else if (field === "quoteId") s.commitment.quoteId = s.quote.id = "quote-new";
  else if (field === "quoteHash") s.commitment.quoteHash = s.quote.hash = "ee".repeat(32);
  else if (field === "providerPolicyVersion") s.commitment.providerPolicyVersion = s.providerPolicy.version = "v2";
  else if (field === "maxTransactionFeeTinybars") s.commitment.maxTransactionFeeTinybars = "100000000";
  else s.commitment[field] = "payment-2";
  denied(await run(s, {auth}), "PAYMENT_SIGNATURE_INVALID");
});
await test("duplicate operation and payment commitment return no second bytes", async () => {
  const s = fixture(); const store = new MemoryStore(); const auth = await authorize(s);
  assert.equal((await run(s,{store,auth})).ok, true);
  denied(await run(s,{store,auth}), "IDEMPOTENT_REPLAY");
});
await test("new payment authorization cannot reopen an existing durable operation", async () => {
  const s = fixture(); const store = new MemoryStore(); assert.equal((await run(s,{store})).ok, true);
  s.commitment.commitmentId = "payment-2"; denied(await run(s,{store}), "NONCE_CONFLICT");
});
await test("reused payment commitment cannot attach to a new operation", async () => {
  const s = fixture(); const store = new MemoryStore(); assert.equal((await run(s,{store})).ok, true);
  s.commitment.operationId = s.invocation.nonce = "operation-2"; denied(await run(s,{store}), "NONCE_CONFLICT");
});
await test("concurrent duplicate operation emits exactly one envelope", async () => {
  const s = fixture(); const auth = await authorize(s); const store = new MemoryStore();
  const results = await Promise.all([run(s,{store,auth}),run(s,{store,auth}),run(s,{store,auth})]);
  assert.equal(results.filter(x => x.ok).length, 1); results.filter(x => !x.ok).forEach(x => denied(x,"IDEMPOTENT_REPLAY"));
});
for (const response of ["unavailable", undefined, "unexpected"]) await test(`store fails closed (${String(response)})`, async () => {
  denied(await run(fixture(), {store:{reserve:async()=>response}}), "REPLAY_STORE_UNAVAILABLE");
});
await test("store thrown error fails closed", async () => denied(await run(fixture(), {store:{reserve:async()=>{throw new Error("offline");}}}), "REPLAY_STORE_UNAVAILABLE"));
await test("expiry while waiting for durable reservation yields no bytes", async () => {
  let time = NOW; const store = new MemoryStore(); const original = store.reserve.bind(store);
  store.reserve = async (...args) => { const result = await original(...args); time += 120001; return result; };
  denied(await run(fixture(), {store,args:{now:()=>time}})); assert.equal(store.data.size, 3);
});
await test("absent authoritative resolver denies without fallback", async () => {
  denied(await preparePolicyAuthorizedUsdcRecovery({ operationId:"operation-1" }), "EXECUTION_STATE_REQUIRED");
  denied(await run(fixture(), {args:{resolveState:async()=>null}}), "EXECUTION_STATE_REQUIRED");
});
await test("raw legacy HAK settlement cannot bypass Bob authorization", async () => {
  const runtime = createDelegatedRecoveryReturnBytesRuntime(ids.agent);
  try {
    assert.equal(runtime.context.mode, AgentMode.RETURN_BYTES);
    const tool = runtime.tools.find(t => t.method === YOURTURN_DELEGATED_RECOVERY_SETTLE_USDC_TOOL);
    let result;
    try { result = await tool.execute(runtime.client,runtime.context,{}); }
    catch (error) { assert.match(String(error),/payment_authorization_required/); }
    assert.equal(result?.bytes, undefined);
  } finally { runtime.client.close(); }
});
await test("unconfigured durable Redis fails closed without process-memory fallback", async () => {
  const oldUrl = process.env.KV_REST_API_URL;
  const oldToken = process.env.KV_REST_API_TOKEN;
  delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
  try {
    const store = new RedisPaymentOperationStore();
    assert.equal(await store.reserve(["unused-fixture-key"],"fixture"), "unavailable");
    denied(await run(fixture(),{store}), "REPLAY_STORE_UNAVAILABLE");
  } finally {
    if (oldUrl !== undefined) process.env.KV_REST_API_URL = oldUrl;
    if (oldToken !== undefined) process.env.KV_REST_API_TOKEN = oldToken;
  }
});
await test("client-injected key cannot replace authoritative Bob key", async () => {
  const s = fixture(); const auth = await authorize(s,stranger); auth.publicKey = stranger.publicKey.toString();
  denied(await run(s,{auth}), "PAYMENT_SIGNATURE_INVALID");
});
await test("ECDSA native account signature is supported without key custody", async () => {
  const s = fixture(); const key = PrivateKey.fromStringECDSA("33".repeat(32));
  s.fundingAccount.publicKey = key.publicKey.toString();
  assert.equal((await run(s,{auth:await authorize(s,key)})).ok,true);
});
await test("wrong commitment USDC or decimals cannot authorize preparation", async () => {
  for (const [field,value] of [["settlementTokenId","0.0.456858"],["settlementDecimals",8]]) {
    const s = fixture(); const auth = await authorize(s); s.commitment[field] = value;
    denied(await run(s,{auth}), "PAYMENT_COMMITMENT_INVALID");
  }
});
await test("denial before policy authorization never serializes transaction bytes", async () => {
  const s = fixture(); const auth = await authorize(s);
  const original = TransferTransaction.prototype.toBytes; let calls = 0;
  TransferTransaction.prototype.toBytes = function(...args) { calls++; return original.apply(this,args); };
  try {
    s.delegation.allowedActions = [];
    denied(await run(s,{auth}), "ACTION_NOT_ALLOWED");
    assert.equal(calls,0);
  } finally { TransferTransaction.prototype.toBytes = original; }
});

await test("historical live runner stops before environment or signing", async () => {
  const result = spawnSync(process.execPath,["--experimental-transform-types","scripts/hedera-policy-usdc-recovery-live.mjs"],{
    cwd:process.cwd(), env:{PATH:process.env.PATH,NODE_OPTIONS:"--no-warnings"}, encoding:"utf8",
  });
  assert.equal(result.status,1);
  assert.match(result.stderr,/historical_usdc_live_runner_retired_use_411f703_for_historical_evidence_only/);
});

console.log(JSON.stringify({ status:"PASS", evidenceClass:"CI/LOCAL", checks:checks.length, assertions:checks,
  liveTransactionsSigned:0, liveTransactionsSubmitted:0, historicalSource:"411f703e164cac82b5498c1f25a2cf21af7bc4be" },null,2));
