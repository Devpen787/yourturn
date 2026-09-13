import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { hashRecoveryMandate } from "../lib/ledger/recovery-mandate.ts";
import { activeRecoveryMandateKey } from "../lib/ledger/recovery-mandate-state.ts";
import { currentMandateKey, serializeCurrentMandate } from "../lib/ledger/recovery-mandate-current.ts";
import { recoveryOperationKey } from "../lib/ledger/recovery-mandate-operation.ts";
import { recoveryMandateAuthorityVersionKey } from "../lib/ledger/recovery-mandate-authority-boundary.ts";
import { loadPostConfirmOwnedProjection, PostConfirmSigningStateDenied } from "../lib/finishline/post-confirm-signing-state.ts";

const NOW=1700000000000,SEC=Math.floor(NOW/1000),OWNER="maya-owner",MANDATE_ID="mandate-1",OP="operation-1",TOKEN="0.0.7001",SERIAL=7,AGENT="agent-1";
const SIGNER="0x1111111111111111111111111111111111111111";
const mandate={mandateId:MANDATE_ID,ownerId:OWNER,ledgerSignerAddress:SIGNER,agentId:AGENT,bookingTokenId:TOKEN,bookingSerial:7n,allowedAction:"resale",minimumRecoveryAtomicUnits:40000000n,settlementAsset:"0.0.429274",expiresAt:BigInt(SEC+300),nonce:"nonce-1",cancellationAllowed:false,issuedAt:BigInt(SEC-60)};
const DIGEST=hashRecoveryMandate(mandate);
const pointer={schemaVersion:1,generation:1,state:"active",ownerId:OWNER,mandateId:MANDATE_ID,digest:DIGEST};
const pointerJson=serializeCurrentMandate(pointer);
const INTENT="33".repeat(32),ENVELOPE="44".repeat(32),TX="0.0.7004@1700000000.000000000";
function active(){return {state:"active",ownerId:OWNER,activatedAt:new Date(NOW-30000).toISOString(),mandate:{...mandate,bookingSerial:"7",minimumRecoveryAtomicUnits:"40000000",expiresAt:String(SEC+300),issuedAt:String(SEC-60)},digest:DIGEST,recoveredSignerAddress:SIGNER,authorityStateVersion:0,currentGeneration:1};}
function operation(overrides={}){return {schemaVersion:1,operationId:OP,intentHash:INTENT,ownerId:OWNER,mandateId:MANDATE_ID,token:TOKEN,serial:"7",agentId:AGENT,action:"resale",pointer:pointerJson,stableVersion:0,ownedVersion:1,expiresAt:SEC+300,revision:2,fence:"fence-1",leaseUntil:SEC-10,phase:"effect-started",transactionId:TX,envelopeDigest:ENVELOPE,receiptDigest:null,...overrides};}
function manifest(holder="0.0.7002",executor="0.0.7004"){return {schemaVersion:1,version:"1",issuedAtMs:NOW-10000,expiresAtMs:NOW+240000,revokedAtMs:null,records:[{kind:"agent",ownerId:OWNER,internalAgentId:AGENT,version:"1",holderAccountId:holder,worldRequester:"0x2222222222222222222222222222222222222222",hederaExecutorAccountId:executor,resourceUri:"https://example.com/api/agent/confirm",expiresAtMs:NOW+240000,revokedAtMs:null}]};}
class Store{
 data=new Map();
 constructor(op=operation()){this.data.set(recoveryOperationKey(OP),JSON.stringify(op));this.data.set(recoveryMandateAuthorityVersionKey(7n),"1");this.data.set(currentMandateKey(TOKEN,7n),pointerJson);this.data.set(activeRecoveryMandateKey(MANDATE_ID),JSON.stringify(active()));}
 async get(key){return this.data.has(key)?this.data.get(key):null;}
 async eval(){throw new Error("POST_CONFIRM_READ_ONLY_VIOLATION");}
}
const args=(store=new Store(),extra={})=>({store,operation:operation(),authenticatedOwnerId:OWNER,expectedHolderAccountId:"0.0.7002",publicEnrollmentManifest:manifest(),revalidateMutableAuthority:async()=>{},now:()=>NOW,...extra});
async function denied(fn,code){let e;try{await fn();}catch(x){e=x;}assert.ok(e instanceof PostConfirmSigningStateDenied,String(e));if(code)assert.equal(e.code,code);}
const checks=[];async function test(name,fn){await fn();checks.push(name);console.log("PASS "+name);}

await test("expired worker lease is not treated as expired business authority",async()=>{const p=await loadPostConfirmOwnedProjection(args());assert.equal(p.operationId,OP);assert.equal(p.bookingAuthorityVersion,0);assert.equal(p.holderAccountId,"0.0.7002");assert.equal(p.hederaExecutorAccountId,"0.0.7004");});
await test("current Redis authority must remain exact operation-owned odd version",async()=>{const store=new Store();store.data.set(recoveryMandateAuthorityVersionKey(7n),"0");await denied(()=>loadPostConfirmOwnedProjection(args(store)),"POST_CONFIRM_OWNED_VERSION_CHANGED");});
await test("current pointer must remain exact active operation pointer",async()=>{const store=new Store();store.data.set(currentMandateKey(TOKEN,7n),serializeCurrentMandate({...pointer,state:"revoked"}));await denied(()=>loadPostConfirmOwnedProjection(args(store)),"POST_CONFIRM_POINTER_CHANGED");});
await test("active mandate generation and stable captured version cannot drift",async()=>{const store=new Store();store.data.set(activeRecoveryMandateKey(MANDATE_ID),JSON.stringify({...active(),currentGeneration:2}));await denied(()=>loadPostConfirmOwnedProjection(args(store)),"POST_CONFIRM_MANDATE_GENERATION_CHANGED");});
await test("mutable authority is revalidated and active record drift around it fails",async()=>{const store=new Store();await denied(()=>loadPostConfirmOwnedProjection(args(store,{revalidateMutableAuthority:async()=>{store.data.set(activeRecoveryMandateKey(MANDATE_ID),JSON.stringify({...active(),activatedAt:new Date(NOW-20000).toISOString()}));}})),"POST_CONFIRM_ACTIVE_MANDATE_CHANGED");});
await test("server enrollment holder mapping must match authenticated expected holder",async()=>{const store=new Store();await denied(()=>loadPostConfirmOwnedProjection(args(store,{publicEnrollmentManifest:manifest("0.0.7999","0.0.7004")})),"POST_CONFIRM_AGENT_ENROLLMENT_CHANGED");});
await test("terminal completed operation cannot regain signing state",async()=>{const store=new Store(operation({phase:"completed",receiptDigest:"55".repeat(32)}));await denied(()=>loadPostConfirmOwnedProjection(args(store,{operation:operation({phase:"completed",receiptDigest:"55".repeat(32)})})),"EFFECT_STARTED_OPERATION_REQUIRED");});
await test("expired mandate fails even though operation bytes still exist",async()=>{const later=NOW+400000;await denied(()=>loadPostConfirmOwnedProjection(args(new Store(),{now:()=>later})),"POST_CONFIRM_OPERATION_EXPIRED");});
await test("source is structurally read-only and preserves canonical intent recomputation",async()=>{const source=await readFile(new URL("../lib/finishline/post-confirm-signing-state.ts",import.meta.url),"utf8");for(const forbidden of ["takeOverRecoveryOperation","beginRecoveryOperationEffect","claimRecoveryOperation","recordRecoveryOperationEnvelope","completeRecoveryOperation",".eval(",".set("])assert.equal(source.includes(forbidden),false,forbidden);for(const required of ["ownedVersion","canonicalProjectionDigest","createCanonicalRecoveryStateResolver","yourturn:canonical-recovery:intent:v1","POST_CONFIRM_CANONICAL_INTENT_CHANGED"])assert.equal(source.includes(required),true,required);});

console.log(JSON.stringify({result:"PASS",checks:checks.length,evidenceClass:"LOCAL_MODEL",writesPerformed:0,leaseReacquisitionPerformed:false,preparationReruns:0},null,2));
