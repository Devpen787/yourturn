import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { getAddress } from "ethers";
import { getRedis } from "../store/redis.ts";
import { hashRecoveryMandate, validateRecoveryMandate } from "../ledger/recovery-mandate.ts";
import { activeRecoveryMandateKey, type ActiveRecoveryMandateRecord, type RecoveryMandateActivationRevalidator } from "../ledger/recovery-mandate-state.ts";
import { readCurrentMandate, serializeCurrentMandate } from "../ledger/recovery-mandate-current.ts";
import { readRecoveryOperation, recoveryOperationKey, type RecoveryOperation } from "../ledger/recovery-mandate-operation.ts";
import { recoveryMandateAuthorityVersionKey, type RecoveryMandateAuthorityBoundaryStore } from "../ledger/recovery-mandate-authority-boundary.ts";
import { canonicalProjectionDigest, type CanonicalRecoveryProjection } from "../ledger/canonical-recovery-projection.ts";
import { createPublicEnrollmentRegistry, type PublicEnrollmentManifest } from "../policy/public-enrollment-registry.ts";
import { createCanonicalRecoveryStateResolver } from "../hedera-agent-kit/canonical-recovery-state.ts";
import { loadCurrentPaymentRecord } from "../hedera-agent-kit/current-payment-record.ts";
import { loadCurrentBusinessEligibility } from "../hedera-agent-kit/current-business-eligibility.ts";
import type { ExternalSigningState } from "../hedera-agent-kit/external-signing-validation.ts";

export class PostConfirmSigningStateDenied extends Error { constructor(readonly code:string){super(code);this.name="PostConfirmSigningStateDenied";} }
function requireState(ok:unknown,code:string):asserts ok{if(!ok)throw new PostConfirmSigningStateDenied(code);}
const label=(v:unknown):v is string=>typeof v==="string"&&/^[A-Za-z0-9._:@-]{1,200}$/.test(v);
const operationId=(v:unknown):v is string=>typeof v==="string"&&/^[A-Za-z0-9._:-]{1,128}$/.test(v);
const account=(v:unknown):v is string=>typeof v==="string"&&/^0\.0\.[1-9][0-9]{0,18}$/.test(v);
const digest=(v:unknown):v is string=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);
type RuntimeStore=RecoveryMandateAuthorityBoundaryStore&{eval(script:string,keys:string[],args:(string|number)[]):Promise<unknown>};
export type PostConfirmSigningStateInput={authenticatedOwnerId:string;expectedHolderAccountId:string;publicEnrollmentManifest:PublicEnrollmentManifest;revalidateMutableAuthority:RecoveryMandateActivationRevalidator;store?:RuntimeStore;now?:()=>number;chainFetch?:typeof fetch;};

function parseActive(raw:unknown,nowMs:number){
  let value:any;try{value=typeof raw==="string"?JSON.parse(raw):structuredClone(raw);}catch{throw new PostConfirmSigningStateDenied("ACTIVE_MANDATE_MALFORMED");}
  requireState(value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).sort().join(",")==="activatedAt,authorityStateVersion,currentGeneration,digest,mandate,ownerId,recoveredSignerAddress,state","ACTIVE_MANDATE_MALFORMED");
  const r=value as ActiveRecoveryMandateRecord;
  requireState(r.state==="active"&&typeof r.activatedAt==="string"&&Number.isFinite(Date.parse(r.activatedAt))&&Date.parse(r.activatedAt)>=0&&Date.parse(r.activatedAt)<=nowMs&&Number.isSafeInteger(r.authorityStateVersion)&&r.authorityStateVersion>=0&&r.authorityStateVersion%2===0&&Number.isSafeInteger(r.currentGeneration)&&r.currentGeneration>0,"ACTIVE_MANDATE_INVALID");
  requireState(r.mandate&&typeof r.mandate==="object"&&Object.keys(r.mandate).sort().join(",")==="agentId,allowedAction,bookingSerial,bookingTokenId,cancellationAllowed,expiresAt,issuedAt,ledgerSignerAddress,mandateId,minimumRecoveryAtomicUnits,nonce,ownerId,settlementAsset","ACTIVE_MANDATE_MALFORMED");
  for(const field of [r.mandate.bookingSerial,r.mandate.minimumRecoveryAtomicUnits,r.mandate.expiresAt,r.mandate.issuedAt])requireState(typeof field==="string"&&/^(0|[1-9][0-9]*)$/.test(field),"ACTIVE_MANDATE_INTEGER_INVALID");
  const m=validateRecoveryMandate({...r.mandate,bookingSerial:BigInt(r.mandate.bookingSerial),minimumRecoveryAtomicUnits:BigInt(r.mandate.minimumRecoveryAtomicUnits),expiresAt:BigInt(r.mandate.expiresAt),issuedAt:BigInt(r.mandate.issuedAt)});
  requireState(r.digest===hashRecoveryMandate(m)&&getAddress(r.recoveredSignerAddress)===m.ledgerSignerAddress,"ACTIVE_MANDATE_DIGEST_OR_SIGNER_CHANGED");
  return Object.freeze({record:Object.freeze(structuredClone(r)),mandate:Object.freeze({...m})});
}
async function readOperationForOwner(store:RuntimeStore,id:string,ownerId:string){
  const raw=await store.get(recoveryOperationKey(id));if(raw===null)return null;
  let hinted:any;try{hinted=typeof raw==="string"?JSON.parse(raw):structuredClone(raw);}catch{throw new PostConfirmSigningStateDenied("POST_CONFIRM_OPERATION_MALFORMED");}
  requireState(hinted&&typeof hinted==="object"&&digest(hinted.intentHash),"POST_CONFIRM_OPERATION_MALFORMED");
  try{return await readRecoveryOperation({store,operationId:id,ownerId,intentHash:hinted.intentHash});}catch{throw new PostConfirmSigningStateDenied("POST_CONFIRM_OPERATION_MALFORMED_OR_OWNER_MISMATCH");}
}

/** Security-approved Option A: current read/validation under an already-owned odd authority version after the worker lease may expire. */
export async function loadPostConfirmOwnedProjection(input:{store:RuntimeStore;operation:RecoveryOperation;authenticatedOwnerId:string;expectedHolderAccountId:string;publicEnrollmentManifest:PublicEnrollmentManifest;revalidateMutableAuthority:RecoveryMandateActivationRevalidator;now?:()=>number;}):Promise<CanonicalRecoveryProjection>{
  requireState(input&&input.store&&typeof input.revalidateMutableAuthority==="function"&&label(input.authenticatedOwnerId)&&account(input.expectedHolderAccountId),"POST_CONFIRM_DEPENDENCIES_REQUIRED");
  const store=input.store,expected=Object.freeze(structuredClone(input.operation)),now=input.now??Date.now,started=now();requireState(Number.isSafeInteger(started)&&started>0,"POST_CONFIRM_CLOCK_INVALID");let last=started;
  const clock=()=>{const n=now();requireState(Number.isSafeInteger(n)&&n>=last&&n-started<5000,"POST_CONFIRM_WINDOW_EXPIRED");last=n;return n;};
  requireState(expected.ownerId===input.authenticatedOwnerId&&expected.phase==="effect-started"&&operationId(expected.operationId)&&digest(expected.intentHash)&&Number.isSafeInteger(expected.stableVersion)&&expected.stableVersion>=0&&expected.stableVersion%2===0&&expected.ownedVersion===expected.stableVersion+1&&expected.ownedVersion%2===1&&typeof expected.transactionId==="string"&&expected.transactionId.length>0&&digest(expected.envelopeDigest),"EFFECT_STARTED_OPERATION_REQUIRED");
  const assertOwned=async()=>{
    const current=await readRecoveryOperation({store,operationId:expected.operationId,ownerId:expected.ownerId,intentHash:expected.intentHash});
    requireState(current!==null&&isDeepStrictEqual(current,expected)&&current.phase==="effect-started","POST_CONFIRM_OPERATION_CHANGED");
    requireState(Math.floor(clock()/1000)<current.expiresAt,"POST_CONFIRM_OPERATION_EXPIRED");
    const rawVersion=await store.get(recoveryMandateAuthorityVersionKey(BigInt(current.serial)));
    requireState((typeof rawVersion==="number"&&Number.isSafeInteger(rawVersion)||typeof rawVersion==="string"&&/^(0|[1-9][0-9]*)$/.test(rawVersion))&&String(rawVersion)===String(current.ownedVersion),"POST_CONFIRM_OWNED_VERSION_CHANGED");
    const pointer=await readCurrentMandate(store,current.token,BigInt(current.serial));requireState(pointer!==null&&pointer.state==="active"&&serializeCurrentMandate(pointer)===current.pointer,"POST_CONFIRM_POINTER_CHANGED");return Object.freeze({...current});
  };
  await assertOwned();const first=parseActive(await store.get(activeRecoveryMandateKey(expected.mandateId)),clock()),m=first.mandate,r=first.record,seconds=Math.floor(clock()/1000);
  requireState(r.ownerId===expected.ownerId&&m.ownerId===expected.ownerId&&m.mandateId===expected.mandateId&&m.bookingTokenId===expected.token&&m.bookingSerial.toString()===expected.serial&&m.agentId===expected.agentId&&m.allowedAction===expected.action&&m.allowedAction==="resale"&&m.cancellationAllowed===false&&m.settlementAsset==="0.0.429274"&&m.minimumRecoveryAtomicUnits>0n&&m.minimumRecoveryAtomicUnits<=9223372036854775807n&&m.bookingSerial<=BigInt(Number.MAX_SAFE_INTEGER)&&m.expiresAt<=BigInt(Math.floor(Number.MAX_SAFE_INTEGER/1000))&&Number(m.expiresAt)===expected.expiresAt&&m.issuedAt<=BigInt(seconds)&&m.expiresAt>BigInt(seconds)&&r.authorityStateVersion===expected.stableVersion,"POST_CONFIRM_ACTIVE_MANDATE_CHANGED");
  let pointer:any;try{pointer=JSON.parse(expected.pointer);}catch{throw new PostConfirmSigningStateDenied("POST_CONFIRM_POINTER_CHANGED");}requireState(r.digest===pointer.digest&&r.currentGeneration===pointer.generation,"POST_CONFIRM_MANDATE_GENERATION_CHANGED");
  await assertOwned();await input.revalidateMutableAuthority(Object.freeze({...m}));await assertOwned();const second=parseActive(await store.get(activeRecoveryMandateKey(expected.mandateId)),clock());requireState(isDeepStrictEqual(first,second),"POST_CONFIRM_ACTIVE_MANDATE_CHANGED");
  const registry=createPublicEnrollmentRegistry(input.publicEnrollmentManifest,{now});const binding=await registry.resolveAgent({ownerId:m.ownerId,internalAgentId:m.agentId});requireState(binding!==null&&binding.ownerId===input.authenticatedOwnerId&&binding.holderAccountId===input.expectedHolderAccountId&&binding.holderAccountId!==binding.hederaExecutorAccountId,"POST_CONFIRM_AGENT_ENROLLMENT_CHANGED");
  await assertOwned();const bindingAgain=await registry.resolveAgent({ownerId:m.ownerId,internalAgentId:m.agentId});requireState(bindingAgain!==null&&isDeepStrictEqual(binding,bindingAgain),"POST_CONFIRM_AGENT_ENROLLMENT_CHANGED");await assertOwned();
  const expiresAtMs=Number(m.expiresAt*1000n);requireState(Number.isSafeInteger(expiresAtMs)&&clock()<expiresAtMs,"POST_CONFIRM_MANDATE_EXPIRED");
  return Object.freeze({authority:"ledger-recovery-mandate",mandateId:m.mandateId,mandateDigest:r.digest,mandateGeneration:r.currentGeneration,bookingAuthorityVersion:expected.stableVersion,ownerId:m.ownerId,holderAccountId:binding.holderAccountId,bookingTokenId:m.bookingTokenId,bookingSerial:Number(m.bookingSerial),internalAgentId:m.agentId,worldRequester:binding.worldRequester,hederaExecutorAccountId:binding.hederaExecutorAccountId,bindingVersion:binding.version,resourceUri:binding.resourceUri,operationId:expected.operationId,signedAction:"resale",executionAction:"RECOVER",minimumRecoveryAtomicUnits:m.minimumRecoveryAtomicUnits.toString(),settlementTokenId:"0.0.429274",settlementDecimals:6,expiresAtUnixSeconds:m.expiresAt.toString(),expiresAtMs,cancellationAllowed:false});
}
function fullIntentHash(projection:CanonicalRecoveryProjection,executionFactsDigest:string){requireState(digest(executionFactsDigest),"POST_CONFIRM_EXECUTION_FACTS_DIGEST_REQUIRED");return createHash("sha256").update(JSON.stringify({domain:"yourturn:canonical-recovery:intent:v1",projection:canonicalProjectionDigest(projection),executionFactsDigest})).digest("hex");}

/** Production factory for ExternalRecoveryLifecycleDependencies.resolveCurrentSigningState. No write/transition API is reachable here. */
export function createPostConfirmSigningStateResolver(input:PostConfirmSigningStateInput){
  requireState(input&&label(input.authenticatedOwnerId)&&account(input.expectedHolderAccountId)&&typeof input.revalidateMutableAuthority==="function","POST_CONFIRM_DEPENDENCIES_REQUIRED");const store=(input.store??getRedis()) as RuntimeStore,now=input.now??Date.now;
  return async(rawOperationId:string):Promise<ExternalSigningState|null>=>{
    requireState(operationId(rawOperationId),"POST_CONFIRM_OPERATION_ID_INVALID");const operation=await readOperationForOwner(store,rawOperationId,input.authenticatedOwnerId);if(operation===null)return null;requireState(operation.phase==="effect-started","EFFECT_STARTED_OPERATION_REQUIRED");
    const projection=await loadPostConfirmOwnedProjection({store,operation,authenticatedOwnerId:input.authenticatedOwnerId,expectedHolderAccountId:input.expectedHolderAccountId,publicEnrollmentManifest:input.publicEnrollmentManifest,revalidateMutableAuthority:input.revalidateMutableAuthority,now});
    const resolver=createCanonicalRecoveryStateResolver({publicEnrollmentManifest:input.publicEnrollmentManifest,resolveCanonicalAuthority:async selected=>{requireState(selected===operation.operationId,"POST_CONFIRM_OPERATION_ID_CHANGED");return loadPostConfirmOwnedProjection({store,operation,authenticatedOwnerId:input.authenticatedOwnerId,expectedHolderAccountId:input.expectedHolderAccountId,publicEnrollmentManifest:input.publicEnrollmentManifest,revalidateMutableAuthority:input.revalidateMutableAuthority,now});},readCurrentPayment:selected=>loadCurrentPaymentRecord({store,now,operationId:selected,authenticatedOwnerId:input.authenticatedOwnerId}),readCurrentEligibility:selected=>loadCurrentBusinessEligibility({store,now,operationId:selected,authenticatedOwnerId:input.authenticatedOwnerId}),policyStore:store,chainOptions:{...(input.chainFetch?{fetch:input.chainFetch}:{}),now},now});
    const resolved=await resolver.resolve(operation.operationId);requireState(fullIntentHash(projection,resolved.intentHash)===operation.intentHash,"POST_CONFIRM_CANONICAL_INTENT_CHANGED");
    const finalProjection=await loadPostConfirmOwnedProjection({store,operation,authenticatedOwnerId:input.authenticatedOwnerId,expectedHolderAccountId:input.expectedHolderAccountId,publicEnrollmentManifest:input.publicEnrollmentManifest,revalidateMutableAuthority:input.revalidateMutableAuthority,now});requireState(isDeepStrictEqual(projection,finalProjection)&&fullIntentHash(finalProjection,resolved.intentHash)===operation.intentHash,"POST_CONFIRM_AUTHORITY_CHANGED_AFTER_STATE_RESOLUTION");
    return Object.freeze({state:resolved.state,executor:Object.freeze({accountId:projection.hederaExecutorAccountId,publicKey:resolved.executorPublicKey,resolvedAtMs:resolved.state.resolvedAtMs})});
  };
}
