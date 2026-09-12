import { createHash } from "node:crypto";
import { getRedis } from "../store/redis.ts";
import type { RecoveryMandateAuthorityBoundaryStore } from "../ledger/recovery-mandate-authority-boundary.ts";
import { readRecoveryOperation, completeRecoveryOperation, takeOverRecoveryOperation } from "../ledger/recovery-mandate-operation.ts";
import { readRetainedRecoveryOutput } from "../ledger/recovery-retained-output.ts";
import { validateExternalRecoverySigning, type ExternalSigningState } from "../hedera-agent-kit/external-signing-validation.ts";
import { loadCurrentPaymentRecord, readPaymentRecordForReconciliation } from "../hedera-agent-kit/current-payment-record.ts";
import { loadCurrentPaymentAuthorization } from "../hedera-agent-kit/current-payment-authorization.ts";
import { paymentCommitmentMemo } from "../hedera-agent-kit/exact-payment-authorization.ts";
import { readRecoverySettlementReceipt } from "../hedera-agent-kit/recovery-receipt-reader.ts";

type Store = RecoveryMandateAuthorityBoundaryStore;
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
function exactOutputDigest(bytesBase64:string){
  requireLifecycle(typeof bytesBase64==="string"&&bytesBase64.length>0&&bytesBase64.length<=65536*4/3+8&&/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(bytesBase64),"SIGNING_OUTPUT_INVALID");
  const bytes=Buffer.from(bytesBase64,"base64");
  requireLifecycle(bytes.length>0&&bytes.length<=65536&&bytes.toString("base64")===bytesBase64,"SIGNING_OUTPUT_INVALID");
  return createHash("sha256").update(bytes).digest("hex");
}
async function exactRetained(store:Store,s:ReturnType<typeof selection>){
  const retained=await readRetainedRecoveryOutput({store,...s});
  requireLifecycle(retained!==null,"RETAINED_OUTPUT_REQUIRED");
  requireLifecycle(retained.operation.phase==="effect-started"||retained.operation.phase==="completed","STARTED_OPERATION_REQUIRED");
  requireLifecycle(retained.operation.transactionId===retained.record.transactionId&&retained.operation.envelopeDigest===retained.record.envelopeDigest,"RETAINED_OPERATION_REFERENCES_REQUIRED");
  return retained;
}
async function currentServerPaymentAuthorization(store:Store,s:ReturnType<typeof selection>,now:()=>number,transactionId:string){
  const payment=await loadCurrentPaymentRecord({store,now,operationId:s.operationId,authenticatedOwnerId:s.ownerId});
  requireLifecycle(payment.commitment.transactionId===transactionId,"CURRENT_PAYMENT_TRANSACTION_MISMATCH");
  const memo=paymentCommitmentMemo(payment.commitment),commitmentDigest=memo.slice(memo.lastIndexOf(":")+1);
  requireLifecycle(/^[a-f0-9]{64}$/.test(commitmentDigest),"CURRENT_PAYMENT_COMMITMENT_INVALID");
  const authorization=await loadCurrentPaymentAuthorization({store,now,operationId:s.operationId,authenticatedOwnerId:s.ownerId,expectedCommitmentDigest:commitmentDigest});
  requireLifecycle(authorization.buyerAccountId===payment.commitment.receiverAccountId,"CURRENT_PAYMENT_AUTHORIZATION_BUYER_MISMATCH");
  return Object.freeze({payment,authorization});
}

/** Read-only external-signer handoff. The retained proposal itself is immutable
 * and unsigned. Bob's exact payment authorization is loaded only from the
 * authenticated durable server record bound to the current payment commitment;
 * callers cannot inject or replace it. The independently-cleared BEFORE_SIGN
 * validator may return derived Bob-authorized bytes for the external executor
 * signer. No signing/submission permit or private key is exposed here. */
export async function prepareExternalRecoverySigning(input:{ownerId:string;operationId:string;intentHash:string},dependencies:ExternalRecoveryLifecycleDependencies){
  const s=selection(input),store=dependencies.store??getRedis(),now=dependencies.now??Date.now,retained=await exactRetained(store,s);
  requireLifecycle(retained.operation.phase==="effect-started","OPERATION_ALREADY_TERMINAL");
  const {authorization}=await currentServerPaymentAuthorization(store,s,now,retained.record.transactionId);
  const validate=dependencies.validateSigning??validateExternalRecoverySigning;
  const result=await validate({phase:"BEFORE_SIGN",operationId:s.operationId,transactionBytesBase64:retained.record.bytesBase64,
    paymentAuthorization:{signatureHex:authorization.signatureHex},resolveCurrent:dependencies.resolveCurrentSigningState,now});
  requireLifecycle(result.ok,"BEFORE_SIGN_VALIDATION_DENIED");
  requireLifecycle(result.phase==="BEFORE_SIGN"&&result.operationId===s.operationId&&result.transactionId===retained.record.transactionId&&
    result.transactionBytesSha256===exactOutputDigest(result.transactionBytesBase64)&&result.executionPermit===false&&result.submitted===false&&result.signedByThisModule===false,
    "SIGNING_HANDOFF_OUTPUT_MISMATCH");
  return Object.freeze({...result,retainedEnvelopeDigest:retained.record.envelopeDigest,executionPermit:false as const});
}

/** Validation-only boundary for bytes returned by the external executor signer.
 * Bob's payment signature again comes only from the authenticated durable server
 * record. A later human-authorized caller may submit the validated exact bytes
 * once; this module never submits, retries, regenerates or signs them. */
export async function validateExternallySignedRecovery(input:{ownerId:string;operationId:string;intentHash:string;signedTransactionBytesBase64:string},dependencies:ExternalRecoveryLifecycleDependencies){
  const s=selection(input),store=dependencies.store??getRedis(),now=dependencies.now??Date.now,retained=await exactRetained(store,s);
  requireLifecycle(retained.operation.phase==="effect-started","OPERATION_ALREADY_TERMINAL");
  const {authorization}=await currentServerPaymentAuthorization(store,s,now,retained.record.transactionId);
  const validate=dependencies.validateSigning??validateExternalRecoverySigning;
  const result=await validate({phase:"BEFORE_SUBMIT",operationId:s.operationId,transactionBytesBase64:input.signedTransactionBytesBase64,
    paymentAuthorization:{signatureHex:authorization.signatureHex},resolveCurrent:dependencies.resolveCurrentSigningState,now});
  requireLifecycle(result.ok,"BEFORE_SUBMIT_VALIDATION_DENIED");
  requireLifecycle(result.phase==="BEFORE_SUBMIT"&&result.operationId===s.operationId&&result.transactionId===retained.record.transactionId&&
    result.transactionBytesBase64===input.signedTransactionBytesBase64&&result.transactionBytesSha256===exactOutputDigest(result.transactionBytesBase64)&&
    result.executionPermit===false&&result.submitted===false&&result.signedByThisModule===false,"SIGNED_TRANSACTION_OUTPUT_MISMATCH");
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
