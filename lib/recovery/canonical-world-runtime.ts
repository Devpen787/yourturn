import { isDeepStrictEqual } from "node:util";
import { createAgentBookVerifier } from "@worldcoin/agentkit";
import { getRedis } from "../store/redis.ts";
import { createPublicEnrollmentRegistry, type PublicEnrollmentManifest } from "../policy/public-enrollment-registry.ts";
import { loadActiveRecoveryMandate, type RecoveryMandateActivationRevalidator, type RecoveryMandateStateStore } from "../ledger/recovery-mandate-state.ts";
import type { RecoveryMandateAuthorityBoundaryStore } from "../ledger/recovery-mandate-authority-boundary.ts";
import { loadRecoveryOperationAuthority } from "../ledger/recovery-operation-authority.ts";
import { resolveCanonicalRecoveryProjection, type CanonicalRecoveryProjection } from "../ledger/canonical-recovery-projection.ts";
import { createRedisWorldAgentNonceStore } from "../world-agentkit/nonce-store.ts";
import { createCanonicalRecoveryStateResolver } from "../hedera-agent-kit/canonical-recovery-state.ts";
import { loadCurrentPaymentRecord } from "../hedera-agent-kit/current-payment-record.ts";
import { loadCurrentBusinessEligibility } from "../hedera-agent-kit/current-business-eligibility.ts";
import { loadCurrentPaymentAuthorization } from "../hedera-agent-kit/current-payment-authorization.ts";
import { paymentCommitmentMemo, RedisPaymentOperationStore } from "../hedera-agent-kit/exact-payment-authorization.ts";
import { createSingleBeginComposition } from "./single-begin-composition.ts";
import type { CanonicalWorldConsumerDependencies, CanonicalRecoverySelection } from "./canonical-world-consumer.ts";
import type { RecoveryOperation } from "../ledger/recovery-mandate-operation.ts";

type RuntimeStore = RecoveryMandateStateStore & RecoveryMandateAuthorityBoundaryStore & {
  eval(script:string,keys:string[],args:(string|number)[]):Promise<unknown>;
};

export type CanonicalWorldRuntimeInput = {
  authenticatedOwnerId:string;
  expectedHolderAccountId:string;
  resourceUri:string;
  publicEnrollmentManifest:PublicEnrollmentManifest;
  revalidateMutableAuthority:RecoveryMandateActivationRevalidator;
  /** Optional test seams. Production uses Redis, public Mirror REST and AgentBook. */
  store?:RuntimeStore;
  now?:()=>number;
  chainFetch?:typeof fetch;
  agentBook?:ReturnType<typeof createAgentBookVerifier>;
};

function requireRuntime(ok:unknown,reason:string):asserts ok{if(!ok)throw new Error(reason);}
function sameProjection(a:CanonicalRecoveryProjection,b:CanonicalRecoveryProjection){return isDeepStrictEqual(a,b);}

/**
 * One server-owned dependency graph for the final World -> Ledger -> Hedera
 * software path. It deliberately stops at retained unsigned transaction bytes.
 * No private signing key, submission client or receipt success is available here.
 */
export function createCanonicalWorldRuntime(input:CanonicalWorldRuntimeInput):CanonicalWorldConsumerDependencies{
  requireRuntime(input&&typeof input.revalidateMutableAuthority==="function","CANONICAL_RUNTIME_REVALIDATOR_REQUIRED");
  requireRuntime(typeof input.authenticatedOwnerId==="string"&&input.authenticatedOwnerId.length>0,"CANONICAL_RUNTIME_OWNER_REQUIRED");
  requireRuntime(/^0\.0\.[1-9][0-9]*$/.test(input.expectedHolderAccountId),"CANONICAL_RUNTIME_HOLDER_REQUIRED");
  const exactResource=new URL(input.resourceUri);
  requireRuntime(exactResource.href===input.resourceUri&&exactResource.pathname==="/api/agent/confirm"&&!exactResource.search&&!exactResource.hash,"CANONICAL_RUNTIME_RESOURCE_INVALID");
  const store=(input.store??getRedis()) as RuntimeStore;
  const now=input.now??Date.now;
  const registry=createPublicEnrollmentRegistry(input.publicEnrollmentManifest,{now});
  const nonceStore=createRedisWorldAgentNonceStore({prefix:"bookedrights:world-agentkit:canonical-nonce"});
  const agentBook=input.agentBook??createAgentBookVerifier();

  const authority=(selection:CanonicalRecoverySelection)=>{
    requireRuntime(selection.ownerId===input.authenticatedOwnerId,"CANONICAL_RUNTIME_OWNER_MISMATCH");
    return {store,authorityBoundaryStore:store,mandateId:selection.mandateId,ownerId:input.authenticatedOwnerId,revalidateMutableAuthority:input.revalidateMutableAuthority};
  };
  const resolveAgentBinding=async(ownerId:string,internalAgentId:string)=>{
    if(ownerId!==input.authenticatedOwnerId)return null;
    const record=await registry.resolveAgent({ownerId,internalAgentId});
    if(!record)return null;
    requireRuntime(record.holderAccountId===input.expectedHolderAccountId,"ENROLLED_HOLDER_MISMATCH");
    requireRuntime(record.resourceUri===input.resourceUri,"ENROLLED_RESOURCE_MISMATCH");
    return {version:record.version,ownerId:record.ownerId,holderAccountId:record.holderAccountId,internalAgentId:record.internalAgentId,worldRequester:record.worldRequester,hederaExecutorAccountId:record.hederaExecutorAccountId,resourceUri:record.resourceUri};
  };

  async function resolveAuthorityForState(projection:CanonicalRecoveryProjection,operation:RecoveryOperation|null){
    requireRuntime(projection.ownerId===input.authenticatedOwnerId&&projection.holderAccountId===input.expectedHolderAccountId,"RUNTIME_PROJECTION_SCOPE_MISMATCH");
    if(operation){
      const loaded=await loadRecoveryOperationAuthority({store,operation,revalidateMutableAuthority:input.revalidateMutableAuthority});
      const m=loaded.mandate,r=loaded.record;
      requireRuntime(m.mandateId===projection.mandateId&&r.digest===projection.mandateDigest&&r.currentGeneration===projection.mandateGeneration&&r.authorityStateVersion===projection.bookingAuthorityVersion&&
        m.ownerId===projection.ownerId&&m.agentId===projection.internalAgentId&&m.bookingTokenId===projection.bookingTokenId&&Number(m.bookingSerial)===projection.bookingSerial&&
        m.minimumRecoveryAtomicUnits.toString()===projection.minimumRecoveryAtomicUnits&&m.expiresAt.toString()===projection.expiresAtUnixSeconds,
        "OWNED_RUNTIME_PROJECTION_CHANGED");
      const binding=await resolveAgentBinding(m.ownerId,m.agentId);requireRuntime(binding,"OWNED_RUNTIME_BINDING_MISSING");
      requireRuntime(binding.version===projection.bindingVersion&&binding.worldRequester===projection.worldRequester&&binding.hederaExecutorAccountId===projection.hederaExecutorAccountId&&binding.resourceUri===projection.resourceUri,
        "OWNED_RUNTIME_BINDING_CHANGED");
      return projection;
    }
    const fresh=await resolveCanonicalRecoveryProjection({authority:{store,authorityBoundaryStore:store,mandateId:projection.mandateId,ownerId:projection.ownerId,revalidateMutableAuthority:input.revalidateMutableAuthority},operationId:projection.operationId,resolveAgentBinding});
    requireRuntime(sameProjection(fresh,projection),"RUNTIME_PROJECTION_CHANGED");
    return fresh;
  }

  function stateResolver(projection:CanonicalRecoveryProjection,operation:RecoveryOperation|null){
    return createCanonicalRecoveryStateResolver({
      publicEnrollmentManifest:input.publicEnrollmentManifest,
      resolveCanonicalAuthority:async operationId=>{requireRuntime(operationId===projection.operationId,"RUNTIME_OPERATION_MISMATCH");return resolveAuthorityForState(projection,operation);},
      readCurrentPayment:operationId=>loadCurrentPaymentRecord({store,now,operationId,authenticatedOwnerId:input.authenticatedOwnerId}),
      readCurrentEligibility:operationId=>loadCurrentBusinessEligibility({store,now,operationId,authenticatedOwnerId:input.authenticatedOwnerId}),
      chainOptions:{...(input.chainFetch?{fetch:input.chainFetch}:{}),now},
      now,
    });
  }

  return Object.freeze({
    resourceUri:input.resourceUri,
    authority,
    resolveAgentBinding,
    nonceStore,
    agentBook,
    async resolveExecutionFacts(projection,operation){
      const resolved=await stateResolver(projection,operation).resolve(projection.operationId);
      return resolved.intentHash;
    },
    async performEffect({projection,operation,intentHash,revalidate}){
      requireRuntime(operation.phase==="claimed"&&operation.intentHash===intentHash,"RUNTIME_CLAIM_REQUIRED");
      const before=await stateResolver(projection,operation).resolve(operation.operationId);
      requireRuntime(before.intentHash===intentHash,"RUNTIME_INTENT_CHANGED");
      const commitmentDigest=paymentCommitmentMemo(before.state.commitment).split(":").at(-1)!;
      const paymentAuthorization=await loadCurrentPaymentAuthorization({store,now,operationId:operation.operationId,authenticatedOwnerId:input.authenticatedOwnerId,expectedCommitmentDigest:commitmentDigest});
      requireRuntime(paymentAuthorization.buyerAccountId===before.state.commitment.receiverAccountId,"RUNTIME_PAYMENT_BUYER_CHANGED");
      const composition=createSingleBeginComposition({prepareDependencies:{store,revalidateMutableAuthority:input.revalidateMutableAuthority,paymentOperationStore:new RedisPaymentOperationStore(),resolveCanonicalState:async owned=>{
        requireRuntime(owned.operationId===operation.operationId&&owned.intentHash===operation.intentHash,"RUNTIME_OWNED_OPERATION_CHANGED");
        const current=await stateResolver(projection,owned).resolve(owned.operationId);
        requireRuntime(current.intentHash===intentHash,"RUNTIME_INTENT_CHANGED");
        return current;
      }}});
      const prepared=await composition.run({operation,paymentAuthorization:{signatureHex:paymentAuthorization.signatureHex},revalidate});
      return Object.freeze({operation:prepared.operation,transactionId:prepared.operation.transactionId!,envelopeDigest:prepared.operation.envelopeDigest!});
    },
  });
}
