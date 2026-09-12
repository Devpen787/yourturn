import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { readRecoveryOperation, recoveryOperationKey, recordRecoveryOperationEnvelope, type RecoveryOperation } from './recovery-mandate-operation.ts';
import type { RecoveryMandateAuthorityBoundaryStore } from './recovery-mandate-authority-boundary.ts';

export type RetainedRecoveryOutput = {
  schemaVersion: 1; ownerId: string; operationId: string; intentHash: string;
  mandateId: string; transactionId: string; envelopeDigest: string; bytesBase64: string;
};
export class RetainedRecoveryOutputError extends Error {
  constructor(readonly code: string) { super(code); this.name='RetainedRecoveryOutputError'; }
}
const fail = (code: string): never => { throw new RetainedRecoveryOutputError(code); };
const label = (v: unknown): v is string => typeof v==='string' && /^[A-Za-z0-9._:@-]{1,200}$/.test(v);
const digest = (v: unknown): v is string => typeof v==='string' && /^[a-f0-9]{64}$/.test(v);
const encode = (r: object) => JSON.stringify(Object.fromEntries(Object.keys(r).sort().map(k=>[k,(r as Record<string,unknown>)[k]])));
export function retainedRecoveryOutputKey(operationId: string) {
  if(!label(operationId)) return fail('INVALID_OPERATION_ID');
  return `bookedrights:ledger:retained-output:${operationId}`;
}
function bytes(raw: unknown) {
  if(typeof raw!=='string' || raw.length<4 || raw.length>87384 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(raw)) return fail('INVALID_RETAINED_BYTES');
  const buffer=Buffer.from(raw,'base64');
  if(buffer.length===0 || buffer.length>65536 || buffer.toString('base64')!==raw) return fail('INVALID_RETAINED_BYTES');
  return createHash('sha256').update(buffer).digest('hex');
}
function parse(raw: unknown): RetainedRecoveryOutput {
  let r;
  try { r=typeof raw==='string'?JSON.parse(raw):structuredClone(raw); } catch { return fail('MALFORMED_RETAINED_OUTPUT'); }
  if(!r || typeof r!=='object' || Array.isArray(r) || Object.keys(r).sort().join(',')!=='bytesBase64,envelopeDigest,intentHash,mandateId,operationId,ownerId,schemaVersion,transactionId' ||
    r.schemaVersion!==1 || ![r.ownerId,r.operationId,r.mandateId,r.transactionId].every(label) || !digest(r.intentHash) || !digest(r.envelopeDigest) || bytes(r.bytesBase64)!==r.envelopeDigest) return fail('MALFORMED_RETAINED_OUTPUT');
  return Object.freeze(r);
}
const RETAIN = `
if (redis.call("GET",KEYS[1]) or "") ~= ARGV[1] then return -1 end
local existing = redis.call("GET",KEYS[2])
if existing then
  if existing == ARGV[2] then return 2 else return 0 end
end
redis.call("SET",KEYS[2],ARGV[2])
return 1
`;
/** Exact opaque output retention, NOT transaction/economic validation. The
 * trusted preparer owns native body/payment validation. No key/sign/submit.
 * Retention is allowed after lease/authority expiry solely to preserve evidence;
 * it never reclaims authority or grants permission to use these bytes. */
export async function retainPreparedRecoveryOutput(input: {
  store: RecoveryMandateAuthorityBoundaryStore; operation: RecoveryOperation;
  transactionId: string; bytesBase64: string;
}) {
  const store=input.store,op=structuredClone(input.operation),transactionId=input.transactionId,bytesBase64=input.bytesBase64;
  const candidate=parse({schemaVersion:1,ownerId:op.ownerId,operationId:op.operationId,intentHash:op.intentHash,mandateId:op.mandateId,
    transactionId,envelopeDigest:bytes(bytesBase64),bytesBase64});
  if(op.phase!=='effect-started' || op.transactionId!==null && (op.transactionId!==candidate.transactionId || op.envelopeDigest!==candidate.envelopeDigest)) return fail('OPERATION_CANNOT_RETAIN_OUTPUT');
  const current=await readRecoveryOperation({store,operationId:op.operationId,ownerId:op.ownerId,intentHash:op.intentHash});
  if(!current || !isDeepStrictEqual(op,current)) return fail('OPERATION_CHANGED_BEFORE_RETENTION');
  let status;
  try { status=await store.eval(RETAIN,[recoveryOperationKey(op.operationId),retainedRecoveryOutputKey(op.operationId)],[encode(op),encode(candidate)]); }
  catch { return fail('RETENTION_OUTCOME_UNKNOWN_RELOAD_REQUIRED'); }
  if(status===-1) return fail('OPERATION_CHANGED_BEFORE_RETENTION');
  if(status===0) return fail('RETAINED_OUTPUT_CONFLICT');
  if(status!==1 && status!==2) return fail('RETENTION_OUTCOME_UNKNOWN_RELOAD_REQUIRED');
  return Object.freeze({record:candidate,created:status===1,executionPermit:false as const});
}
/** Authenticated server selection only. This read never begins/resumes an
 * economic effect, validates current authority, signs, or deletes tombstones. */
export async function readRetainedRecoveryOutput(input: {
  store: RecoveryMandateAuthorityBoundaryStore; ownerId: string; operationId: string; intentHash: string;
}) {
  const {store,ownerId,operationId,intentHash}=input,selection={store,ownerId,operationId,intentHash};
  const op=await readRecoveryOperation(selection);
  if(!op) return null;
  const raw=await store.get(retainedRecoveryOutputKey(operationId));
  if(raw===null) return null;
  const r=parse(raw);
  if(r.ownerId!==ownerId || r.operationId!==operationId || r.intentHash!==intentHash || r.mandateId!==op.mandateId ||
    !['effect-started','completed'].includes(op.phase) || op.transactionId!==null && (r.transactionId!==op.transactionId || r.envelopeDigest!==op.envelopeDigest)) return fail('RETAINED_OUTPUT_OPERATION_MISMATCH');
  const latest=await readRecoveryOperation(selection),last=parse(await store.get(retainedRecoveryOutputKey(operationId)));
  if(!latest || !isDeepStrictEqual(latest,op) || !isDeepStrictEqual(last,r)) return fail('RETAINED_OUTPUT_CHANGED_DURING_READ');
  return Object.freeze({record:r,operation:Object.freeze({...op}),executionPermit:false as const});
}
/** Attach only the already retained exact bytes to the current operation using
 * the existing lease/fence CAS. Expired workers cannot attach; a later trusted
 * receipt-only recovery may take over, read exact output and attach its refs. */
export async function attachRetainedRecoveryOutput(input: {
  store: RecoveryMandateAuthorityBoundaryStore; operation: RecoveryOperation;
}) {
  const op=structuredClone(input.operation),store=input.store;
  const loaded=await readRetainedRecoveryOutput({store,ownerId:op.ownerId,operationId:op.operationId,intentHash:op.intentHash});
  if(!loaded || !isDeepStrictEqual(loaded.operation,op)) return fail('CURRENT_RETAINED_OUTPUT_REQUIRED');
  if(op.transactionId!==null) return fail('OUTPUT_ALREADY_ATTACHED');
  return recordRecoveryOperationEnvelope(store,op,loaded.record.transactionId,loaded.record.envelopeDigest);
}
