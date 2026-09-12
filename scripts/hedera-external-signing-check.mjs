import assert from "node:assert/strict";
import { PrivateKey, Transaction, TransferTransaction, TransactionId, AccountId, Hbar } from "@hiero-ledger/sdk";
import { buildExactPaymentProposal, paymentCommitmentMemo } from "../lib/hedera-agent-kit/exact-payment-authorization.ts";
import { preparePolicyAuthorizedUsdcRecovery } from "../lib/hedera-agent-kit/policy-authorized-usdc-recovery.ts";
import { resolveRecoveryRoyalty } from "../lib/hedera-agent-kit/recovery-royalty.ts";
import { validateExternalRecoverySigning, RedisPaymentTombstoneReader } from "../lib/hedera-agent-kit/external-signing-validation.ts";
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
  async matches(keys, fingerprint) { return keys.length === 3 && keys.every(key => this.data.get(key) === fingerprint); }
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

const executor = PrivateKey.fromStringED25519("33".repeat(32));
const checks=[];
async function test(name,fn){await fn();checks.push(name);console.log("PASS "+name);}
async function setup(state=fixture(), executorKey=executor) {
 const auth=await authorize(state), store=new MemoryStore();
 const prepared=await preparePolicyAuthorizedUsdcRecovery({operationId:state.commitment.operationId,paymentAuthorization:auth,resolveState:async()=>state,operationStore:store,now:()=>NOW});
 assert.equal(prepared.ok,true,JSON.stringify(prepared));
 const current={state,executor:{accountId:ids.agent,publicKey:executorKey.publicKey.toString(),resolvedAtMs:NOW}};
 const args={phase:"BEFORE_SIGN",operationId:state.commitment.operationId,transactionBytesBase64:prepared.envelope.bytesBase64,paymentAuthorization:auth,resolveCurrent:async()=>current,tombstones:store,now:()=>NOW};
 return {state,auth,store,current,args,executorKey};
}
async function signedSetup(state, key) {
 const x=await setup(state,key);const before=await validateExternalRecoverySigning(x.args);assert.equal(before.ok,true,JSON.stringify(before));
 const tx=Transaction.fromBytes(Buffer.from(before.transactionBytesBase64,"base64"));await tx.sign(x.executorKey);
 x.args={...x.args,phase:"BEFORE_SUBMIT",transactionBytesBase64:Buffer.from(tx.toBytes()).toString("base64")};return x;
}
function deny(result,reason){assert.equal(result.ok,false,JSON.stringify(result));assert.equal(result.transactionBytesProduced,false);assert.equal("transactionBytesBase64" in result,false);if(reason)assert.equal(result.reason,reason);}
await test("before-sign validates exact v2 proposal and attaches existing Bob signature only",async()=>{
 const x=await setup();const r=await validateExternalRecoverySigning(x.args);assert.equal(r.ok,true,JSON.stringify(r));
 const tx=Transaction.fromBytes(Buffer.from(r.transactionBytesBase64,"base64"));assert.equal(tx.getSignatures().getFlatSignatureList()[0].size,1);assert.equal(bob.publicKey.verifyTransaction(tx),true);
 assert.equal(r.executionPermit,false);assert.equal(r.submitted,false);assert.equal(r.signedByThisModule,false);assert.equal(r.validUntilMs,NOW+5000);assert.equal(x.store.calls,1);assert.equal(x.store.data.size,3);
});
for(const [name,state,key] of [["v2",fixture(),executor],["v1",legacyFixture(),executor],["ECDSA executor",fixture(),PrivateKey.fromStringECDSA("44".repeat(32))]]) await test(name+" fully signed exact bytes validate without submitting",async()=>{
 const x=await signedSetup(state,key);const r=await validateExternalRecoverySigning(x.args);assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.transactionBytesBase64,x.args.transactionBytesBase64);assert.equal(x.store.calls,1);
});
await test("native signature order is accepted only with exact reconstructed wire",async()=>{
 const x=await setup();const tx=buildExactPaymentProposal(x.state.commitment);await tx.sign(executor);tx.addSignature(bob.publicKey,Buffer.from(x.auth.signatureHex,"hex"));
 const r=await validateExternalRecoverySigning({...x.args,phase:"BEFORE_SUBMIT",transactionBytesBase64:Buffer.from(tx.toBytes()).toString("base64")});assert.equal(r.ok,true,JSON.stringify(r));
});
for(const [name,mutate] of [
 ["holder action removed",x=>x.state.delegation.allowedActions=[]],
 ["holder revoked",x=>x.state.delegation.revokedAtMs=NOW],
 ["holder expires",x=>x.state.delegation.expiresAtMs=NOW],
 ["provider blocks",x=>{x.state.providerPolicy.state="BLOCK";x.state.invocation.providerPolicy.state="BLOCK";}],
 ["provider reviews",x=>{x.state.providerPolicy.state="REVIEW";x.state.invocation.providerPolicy.state="REVIEW";}],
 ["quote expires",x=>x.state.quote.expiresAtMs=NOW],
 ["fee changes",x=>x.state.tokens.booking.feeMetadata.royaltyFees[0].numerator="2"],
 ["holder net minimum increases",x=>x.state.delegation.minimumRecovery.atomicUnits="41000000"],
 ["balance decreases",x=>x.state.fundingAccount.availableAtomicUnits="1"],
 ["allowance changes",x=>x.state.bookingAllowance.spenderAccountId=ids.other],
 ["funding key rotates",x=>x.state.fundingAccount.publicKey=stranger.publicKey.toString()],
 ["wrong executor account",x=>x.current.executor.accountId=ids.other],
 ["same funding and executor key",x=>x.current.executor.publicKey=bob.publicKey.toString()],
 ["stale executor key",x=>x.current.executor.resolvedAtMs=NOW-5000],
 ["future executor key",x=>x.current.executor.resolvedAtMs=NOW+1],
 ["unsafe executor time",x=>x.current.executor.resolvedAtMs=Number.MAX_SAFE_INTEGER+1],
 ]) await test(name+" denies without output",async()=>{const x=await signedSetup();mutate(x);deny(await validateExternalRecoverySigning(x.args));assert.equal(x.store.calls,1);});
await test("rotated executor rejects old signature",async()=>{const x=await signedSetup();x.current.executor.publicKey=stranger.publicKey.toString();deny(await validateExternalRecoverySigning(x.args),"SIGNATURE_SET_INVALID");});
for(const phase of ["BEFORE_SIGN","BEFORE_SUBMIT"]) for(const alteration of ["missing","conflict"]) for(let i=0;i<3;i++) await test(phase+" "+alteration+" tombstone "+i+" denies",async()=>{
 const x=phase==="BEFORE_SIGN"?await setup():await signedSetup();const key=[...x.store.data.keys()][i];if(alteration==="missing")x.store.data.delete(key);else x.store.data.set(key,"other");deny(await validateExternalRecoverySigning(x.args));assert.equal(x.store.calls,1);
});
for(const [name,mutate] of [
 ["memo",tx=>tx.setTransactionMemo("changed")], ["fee",tx=>tx.setMaxTransactionFee(Hbar.fromTinybars("1"))],
 ["duration",tx=>tx.setTransactionValidDuration(60)], ["extra HBAR transfer",tx=>tx.addHbarTransfer(ids.agent,Hbar.fromTinybars(-1)).addHbarTransfer(ids.other,Hbar.fromTinybars(1))],
 ]) await test("changed "+name+" body rejected even if independently signed",async()=>{
 const x=await setup();const c=x.state.commitment;const tx=new TransferTransaction()
 .addApprovedNftTransfer(c.bookingTokenId,c.serial,c.holderAccountId,c.receiverAccountId)
 .addTokenTransferWithDecimals(c.settlementTokenId,c.settlementSourceAccountId,-BigInt(c.settlementAmountAtomicUnits),6)
 .addTokenTransferWithDecimals(c.settlementTokenId,c.settlementRecipientAccountId,BigInt(c.settlementAmountAtomicUnits),6)
 .setTransactionId(TransactionId.fromString(c.transactionId)).setNodeAccountIds([AccountId.fromString(c.nodeAccountId)])
 .setTransactionValidDuration(c.transactionValidDurationSeconds).setMaxTransactionFee(Hbar.fromTinybars(c.maxTransactionFeeTinybars)).setTransactionMemo(paymentCommitmentMemo(c));mutate(tx);tx.freeze();await tx.sign(bob);await tx.sign(executor);
 deny(await validateExternalRecoverySigning({...x.args,phase:"BEFORE_SUBMIT",transactionBytesBase64:Buffer.from(tx.toBytes()).toString("base64")}));
});
for(const which of ["none","Bob only","executor only","extra stranger","invalid executor signature"])await test(which+" cannot pass submit validation",async()=>{
 const x=await setup();const tx=buildExactPaymentProposal(x.state.commitment);
 if(which!=="none"&&which!=="executor only")tx.addSignature(bob.publicKey,Buffer.from(x.auth.signatureHex,"hex"));
 if(which==="executor only"||which==="extra stranger")await tx.sign(executor);
 if(which==="extra stranger")await tx.sign(stranger);
 if(which==="invalid executor signature")tx.addSignature(executor.publicKey,new Uint8Array(64));
 deny(await validateExternalRecoverySigning({...x.args,phase:"BEFORE_SUBMIT",transactionBytesBase64:Buffer.from(tx.toBytes()).toString("base64")}));
});
await test("already signed input cannot pass unsigned phase",async()=>{const x=await signedSetup();deny(await validateExternalRecoverySigning({...x.args,phase:"BEFORE_SIGN"}),"UNSIGNED_PROPOSAL_REQUIRED");});
for(const value of ["", "aGVsbG8=\n", "@invalid", "A".repeat(32772),"aGVsbG8="])await test("malformed bytes "+JSON.stringify(value.slice(0,10)),async()=>{const x=await setup();deny(await validateExternalRecoverySigning({...x.args,transactionBytesBase64:value}));});
for(const boundary of [2,3,4,5])await test("authority changes at resolver read "+boundary+" blocks",async()=>{
 const x=await setup();let count=0;x.args.resolveCurrent=async()=>{if(++count===boundary)x.state.delegation.revokedAtMs=NOW;return x.current;};deny(await validateExternalRecoverySigning(x.args));
});
await test("key changes during tombstone read blocks",async()=>{const x=await setup();x.args.tombstones={matches:async()=>{x.current.executor.publicKey=stranger.publicKey.toString();return true;}};deny(await validateExternalRecoverySigning(x.args),"SIGNING_STATE_CHANGED");});
await test("tombstones change between passes blocks",async()=>{const x=await setup();let reads=0;x.args.tombstones={matches:async()=>++reads===1};deny(await validateExternalRecoverySigning(x.args));});
await test("clock expiry during read blocks and retains reservations",async()=>{const x=await setup();let clock=NOW;x.args.now=()=>clock;x.args.tombstones={matches:async()=>{clock=NOW+5000;return true;}};deny(await validateExternalRecoverySigning(x.args),"SIGNING_STATE_STALE");assert.equal(x.store.data.size,3);});
await test("resolver timestamps may refresh but original five-second window stays bounded",async()=>{const x=await setup();let clock=NOW,count=0;x.args.now=()=>clock;x.args.resolveCurrent=async()=>{clock=NOW+ ++count;x.state.resolvedAtMs=clock;x.current.executor.resolvedAtMs=clock;return x.current;};const r=await validateExternalRecoverySigning(x.args);assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.validUntilMs,NOW+5001);});
await test("input mutation during async read cannot replace captured bytes/operation/auth",async()=>{const x=await setup();x.args.resolveCurrent=async()=>{x.args.operationId="changed";x.args.transactionBytesBase64="bad";x.args.paymentAuthorization.signatureHex="00".repeat(64);return x.current;};const r=await validateExternalRecoverySigning(x.args);assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.operationId,"operation-1");});
await test("unavailable default Redis denies without reservation or output",async()=>{const x=await setup();delete x.args.tombstones;deny(await validateExternalRecoverySigning(x.args),"REPLAY_STORE_UNAVAILABLE");assert.equal(await new RedisPaymentTombstoneReader().matches(["a","b","c"],"x"),false);});
await test("repeated validation yields no operation permission or new reservation",async()=>{const x=await signedSetup();for(let i=0;i<2;i++){const r=await validateExternalRecoverySigning(x.args);assert.equal(r.ok,true);assert.equal(r.executionPermit,false);}assert.equal(x.store.calls,1);assert.equal(x.store.data.size,3);});
console.log(JSON.stringify({status:"PASS",checks:checks.length,evidenceClass:"LOCAL_SYNTHETIC",liveTransactionsSigned:0,submitted:0}));
