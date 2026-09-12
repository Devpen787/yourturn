import assert from "node:assert/strict";
import { Wallet } from "ethers";
import { hashRecoveryMandate } from "../lib/ledger/recovery-mandate.ts";
import { activeRecoveryMandateKey, loadActiveRecoveryMandate } from "../lib/ledger/recovery-mandate-state.ts";
import { currentMandateKey, serializeCurrentMandate } from "../lib/ledger/recovery-mandate-current.ts";
import { recoveryOperationKey } from "../lib/ledger/recovery-mandate-operation.ts";
import { recoveryMandateAuthorityVersionKey } from "../lib/ledger/recovery-mandate-authority-boundary.ts";
import { loadRecoveryOperationAuthority } from "../lib/ledger/recovery-operation-authority.ts";
// Synthetic public state only. No signature/device/network/credential operation.
const wallet=new Wallet("0x"+"11".repeat(32));const checks=[];
function fixture(){
 const now=Math.floor(Date.now()/1000),map=new Map();let writes=0;
 const m={mandateId:"owned-mandate",ownerId:"synthetic-owner",ledgerSignerAddress:wallet.address,agentId:"synthetic-agent",bookingTokenId:"0.0.700001",bookingSerial:BigInt(7),allowedAction:"resale",minimumRecoveryAtomicUnits:BigInt(40000000),settlementAsset:"0.0.429274",expiresAt:BigInt(now+300),nonce:"synthetic-nonce",cancellationAllowed:false,issuedAt:BigInt(now-1)};
 const sm={...m,bookingSerial:"7",minimumRecoveryAtomicUnits:"40000000",expiresAt:m.expiresAt.toString(),issuedAt:m.issuedAt.toString()};
 const pointer={schemaVersion:1,generation:1,state:"active",ownerId:m.ownerId,mandateId:m.mandateId,digest:hashRecoveryMandate(m)};
 const record={state:"active",ownerId:m.ownerId,activatedAt:new Date().toISOString(),mandate:sm,digest:pointer.digest,recoveredSignerAddress:wallet.address,authorityStateVersion:0,currentGeneration:1};
 const op={schemaVersion:1,operationId:"owned-operation",intentHash:"ab".repeat(32),ownerId:m.ownerId,mandateId:m.mandateId,token:m.bookingTokenId,serial:"7",agentId:m.agentId,action:"resale",pointer:serializeCurrentMandate(pointer),stableVersion:0,ownedVersion:1,expiresAt:now+300,revision:0,fence:"owned-fence",leaseUntil:now+30,phase:"claimed",transactionId:null,envelopeDigest:null,receiptDigest:null};
 const vk=recoveryMandateAuthorityVersionKey(m.bookingSerial),ak=activeRecoveryMandateKey(m.mandateId),pk=currentMandateKey(m.bookingTokenId,m.bookingSerial),ok=recoveryOperationKey(op.operationId);
 const save=()=>{map.set(ak,JSON.stringify(record));map.set(pk,serializeCurrentMandate(pointer));map.set(ok,JSON.stringify(op));};save();map.set(vk,"1");
 const store={get:async key=>map.get(key)??null,eval:async()=>{writes++;throw new Error("Read-only loader must never eval");}};
 const args={store,operation:structuredClone(op),revalidateMutableAuthority:async()=>{}};
 return {m,record,pointer,op,map,vk,ak,pk,ok,save,store,args,writes:()=>writes};
}
async function test(name,fn){await fn();checks.push(name);console.log("PASS "+name);}
async function denies(x){await assert.rejects(loadRecoveryOperationAuthority(x.args));assert.equal(x.writes(),0);}
await test("existing owned odd version is validated without any write or permit",async()=>{const x=fixture();const r=await loadRecoveryOperationAuthority(x.args);assert.equal(r.executionPermit,false);assert.equal(r.mandate.minimumRecoveryAtomicUnits,BigInt(40000000));assert.equal(r.operation.ownedVersion,1);assert(Object.isFrozen(r));assert(Object.isFrozen(r.record.mandate));assert(Object.isFrozen(r.operation));assert.equal(x.writes(),0);});
await test("ordinary stable loader still rejects operation-owned odd version",async()=>{const x=fixture();await assert.rejects(loadActiveRecoveryMandate({store:x.store,authorityBoundaryStore:x.store,mandateId:x.m.mandateId,ownerId:x.m.ownerId,revalidateMutableAuthority:async()=>{}}));});
await test("effect-started can revalidate existing authority without issuing another effect",async()=>{const x=fixture();x.op.phase="effect-started";x.save();x.args.operation=structuredClone(x.op);const r=await loadRecoveryOperationAuthority(x.args);assert.equal(r.executionPermit,false);});
for(const value of [0,2,3,null,"01","1.0","bad"])await test("wrong/noncanonical owned version "+value+" denies",async()=>{const x=fixture();x.map.set(x.vk,value);await denies(x);});
for(const field of ["fence","revision","intentHash","ownerId","mandateId","agentId","leaseUntil","phase"])await test("stored operation "+field+" drift denies stale caller",async()=>{const x=fixture();x.op[field]=field==="revision"?1:field==="leaseUntil"?x.op.leaseUntil-1:field==="phase"?"effect-started":field==="intentHash"?"cd".repeat(32):"changed";x.save();await denies(x);});
await test("missing operation denies",async()=>{const x=fixture();x.map.delete(x.ok);await denies(x);});
await test("expired exact lease denies",async()=>{const x=fixture();x.op.leaseUntil=Math.floor(Date.now()/1000);x.save();x.args.operation=structuredClone(x.op);await denies(x);});
for(const phase of ["completed","no-effect"])await test("terminal phase "+phase+" is not authority",async()=>{const x=fixture();x.op.phase=phase;if(phase==="completed"){x.op.transactionId="synthetic-tx";x.op.envelopeDigest="ab".repeat(32);x.op.receiptDigest="cd".repeat(32);}x.save();x.args.operation=structuredClone(x.op);await denies(x);});
for(const [name,change] of [
 ["revoked pointer",x=>x.pointer.state="revoked"],["replacement pointer",x=>{x.pointer.mandateId="replacement";x.pointer.generation=2;}],
 ["active generation",x=>x.record.currentGeneration=2],["active stable version",x=>x.record.authorityStateVersion=2],
 ["signed minimum tamper",x=>x.record.mandate.minimumRecoveryAtomicUnits="1"],["signed owner tamper",x=>x.record.mandate.ownerId="other"],
 ["signed action tamper",x=>x.record.mandate.allowedAction="cancel"],["signed expiry tamper",x=>x.record.mandate.expiresAt="1"],
 ["recovered signer tamper",x=>x.record.recoveredSignerAddress="0x"+"22".repeat(20)],["active extra field",x=>x.record.extra="unexpected"],
 ["signed extra field",x=>x.record.mandate.extra="unexpected"],["noncanonical integer",x=>x.record.mandate.bookingSerial="07"],
])await test(name+" rejects",async()=>{const x=fixture();change(x);x.save();await denies(x);});
await test("mandatory mutable validation cannot be omitted",async()=>{const x=fixture();delete x.args.revalidateMutableAuthority;await denies(x);});
await test("mutable validator denial returns no authority",async()=>{const x=fixture();x.args.revalidateMutableAuthority=async()=>{throw new Error("holder/provider changed");};await denies(x);});
for(const [name,change] of [["revocation",x=>{x.pointer.state="revoked";x.save();}],["takeover",x=>{x.op.fence="successor-fence";x.op.revision++;x.save();}],["active record",x=>{x.record.mandate.minimumRecoveryAtomicUnits="1";x.save();}],["version",x=>x.map.set(x.vk,"3")]])await test(name+" during mutable callback denies",async()=>{const x=fixture();x.args.revalidateMutableAuthority=async()=>change(x);await denies(x);});
await test("callback receives immutable mandate",async()=>{const x=fixture();x.args.revalidateMutableAuthority=async m=>{assert(Object.isFrozen(m));assert.throws(()=>{m.ownerId="other";});};await loadRecoveryOperationAuthority(x.args);});
await test("caller operation mutation during await cannot change captured fence",async()=>{const x=fixture();x.args.revalidateMutableAuthority=async()=>{x.args.operation.fence="caller-change";};const r=await loadRecoveryOperationAuthority(x.args);assert.equal(r.operation.fence,"owned-fence");});
for(const drift of [-1,5000])await test("clock drift "+drift+" during async validation denies",async()=>{const x=fixture();const original=Date.now;const started=Date.now();x.args.revalidateMutableAuthority=async()=>{Date.now=()=>started+drift;};try{await denies(x);}finally{Date.now=original;}});
await test("store error never fabricates authority",async()=>{const x=fixture();x.store.get=async()=>{throw new Error("unavailable");};await denies(x);});
console.log(JSON.stringify({status:"PASS",checks:checks.length,evidenceClass:"LOCAL_SYNTHETIC_READ_ONLY",writes:0,executionPermits:0}));
