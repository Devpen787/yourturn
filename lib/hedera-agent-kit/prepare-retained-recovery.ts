import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { beginRecoveryOperationEffect, type RecoveryOperation } from "../ledger/recovery-mandate-operation.ts";
import { loadRecoveryOperationAuthority } from "../ledger/recovery-operation-authority.ts";
import { retainPreparedRecoveryOutput, readRetainedRecoveryOutput, attachRetainedRecoveryOutput } from "../ledger/recovery-retained-output.ts";
import type { RecoveryMandateAuthorityBoundaryStore } from "../ledger/recovery-mandate-authority-boundary.ts";
import type { RecoveryMandateActivationRevalidator } from "../ledger/recovery-mandate-state.ts";
import type { createCanonicalRecoveryStateResolver } from "./canonical-recovery-state.ts";
import { verifyExactPaymentAuthorization, type PaymentOperationStore } from "./exact-payment-authorization.ts";
import { preparePolicyAuthorizedUsdcRecovery } from "./policy-authorized-usdc-recovery.ts";

type CanonicalResult = Awaited<ReturnType<ReturnType<typeof createCanonicalRecoveryStateResolver>["resolve"]>>;
export class PrepareRetainedRecoveryDenied extends Error {
  constructor(public readonly code: string) { super(code); this.name="PrepareRetainedRecoveryDenied"; }
}
function requirePreparation(ok: unknown, code: string): asserts ok { if(!ok)throw new PrepareRetainedRecoveryDenied(code); }
function stableJson(v: unknown): string {
  if(Array.isArray(v))return "["+v.map(stableJson).join(",")+"]";
  if(v!==null&&typeof v==="object")return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+stableJson((v as Record<string,unknown>)[k])).join(",")+"}";
  return JSON.stringify(v);
}
/** Server-only economic adapter. It owns the atomic claimed -> effect-started
 * transition. No World identity assertion or HTTP route is supplied here.
 * An existing effect-started record is NEVER sufficient to call preparation.
 * Future World composition must pass its verified claimed operation here and
 * remove its own begin-effect call through a separately reviewed interface edit.
 */
export function createPrepareRetainedRecoveryAdapter(dependencies: {
  store: RecoveryMandateAuthorityBoundaryStore;
  revalidateMutableAuthority: RecoveryMandateActivationRevalidator;
  /** Must call the configured canonical resolver with an actual owned-operation
   * authority adapter, current durable payment and real eligibility sources.
   * Request facts, captured pre-claim projection alone or fixture defaults deny. */
  resolveCanonicalState: (operation: Readonly<RecoveryOperation>) => Promise<CanonicalResult>;
  /** Synthetic tests only. Production keeps the existing durable reservation. */
  paymentOperationStore?: PaymentOperationStore;
}) {
  const {store,revalidateMutableAuthority,resolveCanonicalState,paymentOperationStore}=dependencies;
  requirePreparation(store&&typeof revalidateMutableAuthority==="function"&&typeof resolveCanonicalState==="function","CURRENT_PREPARATION_DEPENDENCIES_REQUIRED");
  async function current(op: RecoveryOperation, signatureHex: string) {
    const owned=await loadRecoveryOperationAuthority({store,operation:op,revalidateMutableAuthority});
    const resolved=structuredClone(await resolveCanonicalState(Object.freeze({...op})));
    const again=await loadRecoveryOperationAuthority({store,operation:op,revalidateMutableAuthority});
    requirePreparation(isDeepStrictEqual(owned,again),"OWNED_AUTHORITY_CHANGED");
    const a=resolved.intent.authority,m=owned.mandate,r=owned.record,s=resolved.state,d=s.delegation;
    const actualDigest=createHash("sha256").update(stableJson(resolved.intent)).digest("hex");
    requirePreparation(resolved.executionPermission===false&&resolved.intentHash===op.intentHash&&actualDigest===op.intentHash,"FULL_INTENT_MISMATCH");
    const {resolvedAtMs:_timestamp,...stateFacts}=s;
    requirePreparation(isDeepStrictEqual(stateFacts,resolved.intent.state)&&resolved.executorPublicKey===resolved.intent.executorPublicKey,"RESOLVED_STATE_INTENT_MISMATCH");
    requirePreparation(a.authority==="ledger-recovery-mandate"&&a.ownerId===m.ownerId&&a.mandateId===m.mandateId&&a.mandateDigest===r.digest&&a.mandateGeneration===r.currentGeneration&&a.bookingAuthorityVersion===op.stableVersion&&
      a.bookingTokenId===m.bookingTokenId&&a.bookingSerial===Number(m.bookingSerial)&&a.internalAgentId===m.agentId&&a.operationId===op.operationId&&a.signedAction==="resale"&&a.executionAction==="RECOVER"&&
      a.minimumRecoveryAtomicUnits===m.minimumRecoveryAtomicUnits.toString()&&a.expiresAtUnixSeconds===m.expiresAt.toString()&&a.expiresAtMs===Number(m.expiresAt)*1000&&a.cancellationAllowed===false&&a.settlementTokenId===m.settlementAsset&&a.settlementDecimals===6,"CANONICAL_OWNED_MANDATE_MISMATCH");
    requirePreparation(d.delegationId===m.mandateId&&d.holderAccountId===a.holderAccountId&&d.delegatedAgentAccountId===a.hederaExecutorAccountId&&d.spenderAccountId===a.hederaExecutorAccountId&&d.tokenId===m.bookingTokenId&&d.serial===Number(m.bookingSerial)&&
      isDeepStrictEqual(d.allowedActions,["RECOVER"])&&d.minimumRecovery.atomicUnits===m.minimumRecoveryAtomicUnits.toString()&&d.expiresAtMs===Number(m.expiresAt)*1000&&d.cancellationAllowed===false&&d.revokedAtMs===null,"HEDERA_AUTHORITY_PROJECTION_MISMATCH");
    verifyExactPaymentAuthorization(s,op.operationId,signatureHex,Date.now());
    return resolved;
  }
  return Object.freeze({
    async prepareAndRetain(input: { operation: RecoveryOperation; paymentAuthorization: { signatureHex: string } }) {
      const selected=structuredClone(input.operation),signatureHex=input.paymentAuthorization?.signatureHex;
      requirePreparation(selected.phase==="claimed","CLAIMED_OPERATION_REQUIRED_NO_REPREPARATION");
      requirePreparation(typeof signatureHex==="string"&&/^[0-9a-f]{128}$/.test(signatureHex),"NATIVE_BOB_AUTHORIZATION_REQUIRED");
      // Validate exact native payment before spending the one-time effect permit.
      await current(selected,signatureHex);
      // Only the call that wins this real Redis CAS may invoke the helper below.
      // A duplicate, stale claimed record or caller-invented started record fails.
      const started=await beginRecoveryOperationEffect(store,selected,async op=>{
        await current(op,signatureHex);return op.intentHash;
      });
      const prepared=await preparePolicyAuthorizedUsdcRecovery({operationId:started.operationId,paymentAuthorization:{signatureHex},operationStore:paymentOperationStore,
        resolveState:async id=>{requirePreparation(id===started.operationId,"HELPER_OPERATION_MISMATCH");return (await current(started,signatureHex)).state;}});
      requirePreparation(prepared.ok,"PREPARATION_DENIED_EFFECT_REQUIRES_RECONCILIATION");
      // Always try to preserve returned bytes, even if authority/lease expired
      // after the helper finished. Retention itself grants no execution permit.
      const retained=await retainPreparedRecoveryOutput({store,operation:started,transactionId:prepared.envelope.transactionId,bytesBase64:prepared.envelope.bytesBase64});
      const attached=await attachRetainedRecoveryOutput({store,operation:started});
      requirePreparation(attached.transactionId===retained.record.transactionId&&attached.envelopeDigest===retained.record.envelopeDigest,"RETAINED_OUTPUT_ATTACHMENT_MISMATCH");
      return Object.freeze({operation:Object.freeze({...attached}),retained:retained.record,preparedUnsigned:true as const,submitted:false as const,executionPermit:false as const});
    },
    /** Authenticated server-selected receipt-only retry. No resolver, native
     * signature, begin-effect, payment reservation, preparation or signing call. */
    async readRetained(input: { ownerId: string; operationId: string; intentHash: string }) {
      const selection=structuredClone(input);
      return readRetainedRecoveryOutput({store,...selection});
    },
  });
}
