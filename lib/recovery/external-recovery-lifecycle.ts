import { getRedis } from "../store/redis.ts";
import type { RecoveryMandateAuthorityBoundaryStore } from "../ledger/recovery-mandate-authority-boundary.ts";
import { readRecoveryOperation, completeRecoveryOperation, takeOverRecoveryOperation, type RecoveryOperation } from "../ledger/recovery-mandate-operation.ts";
import { readRetainedRecoveryOutput } from "../ledger/recovery-retained-output.ts";
import { validateExternalRecoverySigning, type ExternalSigningState } from "../hedera-agent-kit/external-signing-validation.ts";
import { readPaymentRecordForReconciliation } from "../hedera-agent-kit/current-payment-record.ts";
import { readRecoverySettlementReceipt } from "../hedera-agent-kit/recovery-receipt-reader.ts";

type Store = RecoveryMandateAuthorityBoundaryStore;
type Validation = Awaited<ReturnType<typeof validateExternalRecoverySigning>>;
type Receipt = Awaited<ReturnType<typeof readRecoverySettlementReceipt>>;

export type ExternalRecoveryLifecycleDependencies = {
  store?: Store;
  resolveCurrentSigningState(operationId:string):Promise<ExternalSigningState|null>;
  validateSigning?: typeof validateExternalRecoverySigning;
  readReceipt?: typeof readRecoverySettlementReceipt;
  now?:()=>number;
  receiptFetch?:typeof fetch;
};

export class ExternalRecoveryLifecycleDenied extends Error {
  constructor(public readonly code:string){super(code);this.name="ExternalRecoveryLifecycleDenied";}
}
function requireLifecycle(ok:unknown,code:string):asserts ok{if(!ok)throw new ExternalRecoveryLifecycleDenied(code);}
function selection(input:{ownerId:string;operationId:string;intentHash:string}){
  requireLifecycle(typeof input?.ownerId==="string"&&/^[A-Za-z0-9._:@-]{1,200}$/.test(input.ownerId),"INVALID_OWNER");
  requireLifecycle(typeof input.operationId==="string"&&/^[A-Za-z0-9._:-]{1,128}$/.test(input.operationId),"INVALID_OPERATION");
  requireLifecycle(typeof input.intentHash==="string"&&/^[a-f0-9]{64}$/.test(input.intentHash),"INVALID_INTENT");
  return Object.freeze({...input});
}
async function exactRetained(store:Store,s:ReturnType<typeof selection>){
  const retained=await readRetainedRecoveryOutput({store,...s});
  requireLifecycle(retained!==null,"RETAINED_OUTPUT_REQUIRED");
  requireLifecycle(retained.operation.phase==="effect-started"||retained.operation.phase==="completed","STARTED_OPERATION_REQUIRED");
  requireLifecycle(retained.operation.transactionId===retained.record.transactionId&&retained.operation.envelopeDigest===retained.record.envelopeDigest,"RETAINED_OPERATION_REFERENCES_REQUIRED");
  return retained;
}

/** Read-only external-signer handoff. The returned bytes are the exact immutable
 * retained proposal. This performs the independently-cleared BEFORE_SIGN check
 * but creates no signing/submission permission and does not expose a private key. */
export async function prepareExternalRecoverySigning(input:{
  ownerId:string;operationId:string;intentHash:string;paymentAuthorization:{signatureHex:string};
},dependencies:ExternalRecoveryLifecycleDependencies){
  const s=selection(input),store=dependencies.store??getRedis(),retained=await exactRetained(store,s);
  requireLifecycle(retained.operation.phase==="effect-started","OPERATION_ALREADY_TERMINAL");
  const validate=dependencies.validateSigning??validateExternalRecoverySigning;
  const result=await validate({phase:"BEFORE_SIGN",operationId:s.operationId,transactionBytesBase64:retained.record.bytesBase64,
    paymentAuthorization:{signatureHex:input.paymentAuthorization.signatureHex},resolveCurrent:dependencies.resolveCurrentSigningState,now:dependencies.now});
  requireLifecycle(result.ok,"BEFORE_SIGN_VALIDATION_DENIED");
  requireLifecycle(result.transactionId===retained.record.transactionId&&result.transactionBytesSha256===retained.record.envelopeDigest,"RETAINED_SIGNING_OUTPUT_MISMATCH");
  return Object.freeze({...result,retainedEnvelopeDigest:retained.record.envelopeDigest,executionPermit:false as const});
}

/** Validation-only boundary for bytes returned by the external signer. A later
 * human-authorized caller may submit these exact bytes once. This module never
 * submits, retries, regenerates or signs them. */
export async function validateExternallySignedRecovery(input:{
  ownerId:string;operationId:string;intentHash:string;signedTransactionBytesBase64:string;paymentAuthorization:{signatureHex:string};
},dependencies:ExternalRecoveryLifecycleDependencies){
  const s=selection(input),store=dependencies.store??getRedis(),retained=await exactRetained(store,s);
  requireLifecycle(retained.operation.phase==="effect-started","OPERATION_ALREADY_TERMINAL");
  const validate=dependencies.validateSigning??validateExternalRecoverySigning;
  const result=await validate({phase:"BEFORE_SUBMIT",operationId:s.operationId,transactionBytesBase64:input.signedTransactionBytesBase64,
    paymentAuthorization:{signatureHex:input.paymentAuthorization.signatureHex},resolveCurrent:dependencies.resolveCurrentSigningState,now:dependencies.now});
  requireLifecycle(result.ok,"BEFORE_SUBMIT_VALIDATION_DENIED");
  requireLifecycle(result.transactionId===retained.record.transactionId,"SIGNED_TRANSACTION_ID_MISMATCH");
  return Object.freeze({...result,retainedEnvelopeDigest:retained.record.envelopeDigest,executionPermit:false as const,submitted:false as const});
}

/** Receipt-only reconciliation. This path creates no new spend authority and may
 * finish a previously-started effect after mandate/payment expiry or revocation.
 * If the original worker lease expired, it takes over only the receipt phase. */
export async function reconcileExternalRecoverySettlement(input:{ownerId:string;operationId:string;intentHash:string},dependencies:ExternalRecoveryLifecycleDependencies){
  const s=selection(input),store=dependencies.store??getRedis(),now=dependencies.now??Date.now;
  let op=await readRecoveryOperation({store,...s});
  requireLifecycle(op!==null,"OPERATION_REQUIRED");
  if(op.phase==="completed") return Object.freeze({operation:Object.freeze({...op}),alreadyCompleted:true,executionPermit:false as const});
  requireLifecycle(op.phase==="effect-started"&&op.transactionId!==null&&op.envelopeDigest!==null,"STARTED_RETAINED_OPERATION_REQUIRED");
  await exactRetained(store,s);
  const payment=await readPaymentRecordForReconciliation({store,now,operationId:s.operationId,authenticatedOwnerId:s.ownerId});
  requireLifecycle(payment.record.operationId===s.operationId&&payment.record.commitment.transactionId===op.transactionId,"RECONCILIATION_PAYMENT_MISMATCH");
  const readReceipt=dependencies.readReceipt??readRecoverySettlementReceipt;
  const receipt:Receipt=await readReceipt({operationId:s.operationId,commitment:payment.record.commitment},{...(dependencies.receiptFetch?{fetch:dependencies.receiptFetch}:{}),now});
  requireLifecycle(receipt.receipt.transactionId===op.transactionId&&/^[a-f0-9]{64}$/.test(receipt.receiptDigest),"RECEIPT_OPERATION_MISMATCH");
  if(Math.floor(now()/1000)>=op.leaseUntil) op=await takeOverRecoveryOperation(store,op);
  const completed=await completeRecoveryOperation(store,op,async current=>{
    requireLifecycle(current.operationId===s.operationId&&current.transactionId===receipt.receipt.transactionId,"RECEIPT_OPERATION_CHANGED");
    return {transactionId:receipt.receipt.transactionId,receiptDigest:receipt.receiptDigest};
  });
  return Object.freeze({operation:Object.freeze({...completed}),receiptDigest:receipt.receiptDigest,consensusSynchronous:false as const,executionPermit:false as const});
}
