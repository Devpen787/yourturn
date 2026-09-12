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
function legacyFixture() {
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

import { resolveRecoveryRoyalty } from "../lib/hedera-agent-kit/recovery-royalty.ts";
import { writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
function updateEconomics(s) {
  s.commitment.economics = structuredClone(resolveRecoveryRoyalty({
    grossAtomicUnits:s.commitment.settlementAmountAtomicUnits, holderAccountId:s.commitment.holderAccountId,
    buyerAccountId:s.commitment.settlementSourceAccountId, bookingTokenId:s.commitment.bookingTokenId,
    policy:s.providerPolicy.royalty, metadata:s.tokens.booking.feeMetadata,
  }));
  s.invocation.recovery.atomicUnits=s.commitment.economics.sellerNetAtomicUnits;
}
function fixture(numerator="1",denominator="10",gross="45000000") {
 const s=legacyFixture(); s.commitment.domain="yourturn:hedera:testnet:exact-payment:v2";
 s.commitment.settlementAmountAtomicUnits=gross;
 const collector=numerator==="0"?null:ids.other;
 s.providerPolicy.royalty={numerator,denominator,collectorAccountId:collector};
 s.tokens.booking.customFeeCount=numerator==="0"?0:1;
 s.tokens.booking.feeMetadata={tokenId:s.commitment.bookingTokenId,treasuryAccountId:"0.0.7006",feeScheduleKey:null,fixedFees:[],fractionalFees:[],royaltyFees:numerator==="0"?[]:[{numerator,denominator,collectorAccountId:collector,allCollectorsAreExempt:false,fallbackFee:null}]};
 updateEconomics(s); return s;
}
const checks=[];
async function test(name,fn){await fn();checks.push(name);console.log("PASS "+name);}
function denied(r,reason){assert.equal(r.ok,false,JSON.stringify(r));assert.equal(r.transactionBytesProduced,false);assert.equal("envelope" in r,false);assert.equal("paymentAuthorization" in r,false);if(reason)assert.equal(r.decision.reason,reason);}
const dummyAuth={signatureHex:"11".repeat(64)};
await test("v2 native body authorizes Bob45 gross; policy and result protect Maya40.5 net",async()=>{
 const s=fixture();const r=await run(s);assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.settlement.atomicUnits,"40500000");assert.deepEqual(r.settlement.economics,{...s.commitment.economics,buyerGrossAtomicUnits:"45000000"});
 const tx=Transaction.fromBytes(Buffer.from(r.envelope.bytesBase64,"base64"));
 assert.equal(tx.tokenTransfers.size,1);assert.equal(tx.tokenTransfers.get(USDC).size,2);
 assert.equal(tx.tokenTransfers.get(USDC).get(ids.bob).toString(),"-45000000");assert.equal(tx.tokenTransfers.get(USDC).get(ids.maya).toString(),"45000000");
 assert.equal(tx.tokenTransfers.get(USDC).get(ids.other),null,"royalty must be assessed once by chain, not added twice");
 assert.equal(tx.transactionMemo,paymentCommitmentMemo(s.commitment));assert(tx.transactionMemo.startsWith("yt:pay:v2:"));
 assert.equal(tx.nftTransfers.size,1);assert.equal(tx.hbarTransfers.size,0);assert(tx.getSignatures().getFlatSignatureList().every(m=>m.size===0));
 tx.addSignature(PublicKey.fromString(r.paymentAuthorization.publicKey),Buffer.from(r.paymentAuthorization.signatureHex,"hex"));assert.equal(bob.publicKey.verifyTransaction(tx),true);
 assert.equal(r.envelope.signed,false);assert.equal(r.envelope.submitted,false);
});
for (const [n,d,net] of [["0","100","45000000"],["5","100","42750000"],["25","100","33750000"],["99","100","450000"]]) await test("provider rate "+n+"/"+d+" has no hidden ten-percent cap",async()=>{const s=fixture(n,d);s.delegation.minimumRecovery.atomicUnits="1";const r=await run(s);assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.settlement.atomicUnits,net);});
await test("100 percent cannot satisfy a positive holder minimum",async()=>{const s=fixture("1","1");s.delegation.minimumRecovery.atomicUnits="1";const store=new MemoryStore();denied(await run(s,{store}),"BELOW_MINIMUM_RECOVERY");assert.equal(store.calls,0);});
await test("32 gross at ten percent fails active30 net floor before reservation",async()=>{const s=fixture("1","10","32000000");s.delegation.minimumRecovery.atomicUnits="30000000";const store=new MemoryStore();denied(await run(s,{store}),"BELOW_MINIMUM_RECOVERY");assert.equal(store.calls,0);});
await test("32 gross at five percent clears fresh30 net floor",async()=>{const s=fixture("5","100","32000000");s.delegation.minimumRecovery.atomicUnits="30000000";const r=await run(s);assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.settlement.atomicUnits,"30400000");});
await test("provider net minimum independently blocks",async()=>{const s=fixture();s.providerPolicy.minimumRecoveryAtomicUnits="41000000";const store=new MemoryStore();denied(await run(s,{store}),"BELOW_PROVIDER_MINIMUM");assert.equal(store.calls,0);});
await test("funding must cover gross, not net",async()=>{const s=fixture();s.fundingAccount.availableAtomicUnits="40500000";denied(await run(s),"PAYMENT_FUNDS_INSUFFICIENT");});
await test("net invocation cannot be replaced with gross",async()=>{const s=fixture();s.invocation.recovery.atomicUnits="45000000";denied(await run(s),"PAYMENT_AMOUNT_MISMATCH");});
await test("v2 canonical minimum cannot be zero",async()=>{const s=fixture();s.delegation.minimumRecovery.atomicUnits="0";denied(await run(s),"POSITIVE_CANONICAL_HOLDER_MINIMUM_REQUIRED");});
const metadataAttacks=[
 ["missing complete fees",s=>delete s.tokens.booking.feeMetadata],
 ["missing policy",s=>delete s.providerPolicy.royalty],
 ["provider rate differs",s=>s.providerPolicy.royalty.numerator="2"],
 ["provider collector differs",s=>s.providerPolicy.royalty.collectorAccountId="0.0.7010"],
 ["onchain fee differs",s=>s.tokens.booking.feeMetadata.royaltyFees[0].numerator="2"],
 ["unsupported fixed fee",s=>s.tokens.booking.feeMetadata.fixedFees=[{amount:"1"}]],
 ["unsupported fallback",s=>s.tokens.booking.feeMetadata.royaltyFees[0].fallbackFee={amount:"1"}],
 ["hidden extra fee",s=>s.tokens.booking.feeMetadata.royaltyFees.push({...s.tokens.booking.feeMetadata.royaltyFees[0]})],
 ["wrong token metadata",s=>s.tokens.booking.feeMetadata.tokenId="0.0.7011"],
 ["mutable fee schedule",s=>s.tokens.booking.feeMetadata.feeScheduleKey="key"],
 ["collector equals buyer",s=>{s.tokens.booking.feeMetadata.royaltyFees[0].collectorAccountId=ids.bob;s.providerPolicy.royalty.collectorAccountId=ids.bob;}],
];
for(const [name,mutate] of metadataAttacks)await test(name+" denies before reservation",async()=>{const s=fixture();mutate(s);const store=new MemoryStore();denied(await run(s,{store}),"ROYALTY_POLICY_OR_METADATA_INVALID");assert.equal(store.calls,0);});
await test("fee-count summary must match complete metadata",async()=>{const s=fixture();s.tokens.booking.customFeeCount=0;denied(await run(s),"ROYALTY_METADATA_COUNT_MISMATCH");});
await test("settlement token fees stay forbidden",async()=>{const s=fixture();s.tokens.settlement.customFeeCount=1;denied(await run(s),"EXACT_NET_TOKEN_POLICY_REQUIRED");});
for(const [name,mutate] of [
 ["changed net",s=>s.commitment.economics.sellerNetAtomicUnits="45000000"],
 ["changed royalty amount",s=>s.commitment.economics.royaltyAmountAtomicUnits="1"],
 ["invented exemption",s=>s.commitment.economics.exemption="treasury"],
 ["changed fee hash",s=>s.commitment.economics.feeMetadataHash="cd".repeat(32)],
])await test(name+" cannot widen signed economics",async()=>{const s=fixture();mutate(s);denied(await run(s),"ROYALTY_COMMITMENT_MISMATCH");});
await test("strict v2 commitment requires economics",async()=>{const s=fixture();delete s.commitment.economics;denied(await run(s,{auth:dummyAuth}),"PAYMENT_COMMITMENT_INVALID");});
await test("unsigned fee fields cannot be added to v1",async()=>{const s=fixture();s.commitment.domain="yourturn:hedera:testnet:exact-payment:v1";denied(await run(s,{auth:dummyAuth}),"PAYMENT_COMMITMENT_INVALID");});
await test("downgrade cannot ignore new provider or chain fee data",async()=>{const s=fixture();s.commitment.domain="yourturn:hedera:testnet:exact-payment:v1";delete s.commitment.economics;denied(await run(s),"ROYALTY_COMMITMENT_REQUIRED");});
await test("v1 cannot ignore provider fee policy on zero-fee asset",async()=>{const s=legacyFixture();s.providerPolicy.royalty={numerator:"1",denominator:"10",collectorAccountId:ids.other};denied(await run(s),"ROYALTY_COMMITMENT_REQUIRED");});
await test("old native signature cannot authorize repriced economics",async()=>{const s=fixture();const auth=await authorize(s);s.providerPolicy.royalty.numerator="2";s.tokens.booking.feeMetadata.royaltyFees[0].numerator="2";updateEconomics(s);s.delegation.minimumRecovery.atomicUnits="30000000";denied(await run(s,{auth}),"PAYMENT_SIGNATURE_INVALID");});
await test("v2 memo binds operation, policy and each economic field",async()=>{const s=fixture();const memo=paymentCommitmentMemo(s.commitment);for(const key of ["operationId","providerPolicyVersion","quoteHash"]){const c=structuredClone(s.commitment);c[key]=key==="quoteHash"?"cd".repeat(32):c[key]+"-changed";assert.notEqual(paymentCommitmentMemo(c),memo);}for(const [key,value] of [["numerator","2"],["royaltyAmountAtomicUnits","1"],["sellerNetAtomicUnits","45000000"],["collectorAccountId","0.0.7010"],["exemption","collector"],["feeMetadataHash","cd".repeat(32)]]){const c=structuredClone(s.commitment);c.economics[key]=value;assert.notEqual(paymentCommitmentMemo(c),memo);}});
for(const exemption of ["treasury","collector"])await test("actual seller "+exemption+" exemption is explicit and metadata-bound",async()=>{const s=fixture();if(exemption==="treasury")s.tokens.booking.feeMetadata.treasuryAccountId=ids.maya;else{s.tokens.booking.feeMetadata.royaltyFees[0].collectorAccountId=ids.maya;s.providerPolicy.royalty.collectorAccountId=ids.maya;}updateEconomics(s);const r=await run(s);assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.settlement.atomicUnits,"45000000");assert.equal(r.settlement.economics.exemption,exemption);});
await test("agent as collector does not exempt seller",async()=>{const s=fixture();s.tokens.booking.feeMetadata.royaltyFees[0].collectorAccountId=ids.agent;s.providerPolicy.royalty.collectorAccountId=ids.agent;updateEconomics(s);const r=await run(s);assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.settlement.atomicUnits,"40500000");assert.equal(r.settlement.economics.exemption,"none");});
for(const [name,mutate] of [
 ["provider royalty changed",s=>s.providerPolicy.royalty.numerator="2"],
 ["chain collector changed",s=>s.tokens.booking.feeMetadata.royaltyFees[0].collectorAccountId="0.0.7010"],
 ["treasury changed",s=>s.tokens.booking.feeMetadata.treasuryAccountId=ids.maya],
 ["net commitment changed",s=>s.commitment.economics.sellerNetAtomicUnits="45000000"],
])await test(name+" during reservation yields no envelope and retains replay reservation",async()=>{const s=fixture();const store=new MemoryStore();const reserve=store.reserve.bind(store);store.reserve=async(...args)=>{const r=await reserve(...args);mutate(s);return r;};const auth=await authorize(s);denied(await run(s,{store,auth}),"EXECUTION_STATE_CHANGED");assert.equal(store.calls,1);assert.equal(store.data.size,3);});
await test("v2 replay and concurrent duplicate produce at most one envelope",async()=>{const s=fixture();const auth=await authorize(s);const store=new MemoryStore();const rs=await Promise.all([run(s,{auth,store}),run(s,{auth,store})]);assert.equal(rs.filter(r=>r.ok).length,1);denied(await run(s,{auth,store}));assert.equal(store.data.size,3);});
const sourceSha=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
await writeFile("hedera-royalty-authorization-evidence.json",JSON.stringify({sourceSha,evidenceClass:"CI/LOCAL_SYNTHETIC",status:"PASS",checks:checks.length,cases:checks,liveTransactionsSigned:0,liveTransactionsSubmitted:0,realCredentialsLoaded:false},null,2));
console.log(JSON.stringify({status:"PASS",checks:checks.length}));
