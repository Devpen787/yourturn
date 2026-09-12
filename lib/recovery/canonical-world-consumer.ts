import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { parseAgentkitHeader } from "@worldcoin/agentkit";
import { resolveCanonicalRecoveryProjection, canonicalProjectionDigest, type CanonicalRecoveryProjection, type RecoveryAgentBinding } from "../ledger/canonical-recovery-projection.ts";
import { loadActiveRecoveryMandate } from "../ledger/recovery-mandate-state.ts";
import { loadRecoveryOperationAuthority } from "../ledger/recovery-operation-authority.ts";
import { readRecoveryOperation, claimRecoveryOperation, type RecoveryOperation } from "../ledger/recovery-mandate-operation.ts";
import { verifyWorldAgentRequest, type WorldAgentBookLookup } from "../world-agentkit/server-verifier.ts";
import { evaluateWorldAgentGate, type WorldAgentVerification } from "../world-agentkit/trust-boundary.ts";
import type { WorldAgentNonceStore } from "../world-agentkit/nonce-store.ts";

type Authority = Parameters<typeof loadActiveRecoveryMandate>[0];
export type CanonicalRecoverySelection = { ownerId: string; mandateId: string; operationId: string };
export type CanonicalWorldConsumerDependencies = {
  /** Fixed trusted endpoint, also bound by the HTTP factory to request.url. */
  resourceUri: string;
  /** Owner is supplied by verified server authentication, not request JSON. */
  authority(selection: CanonicalRecoverySelection): Authority;
  resolveAgentBinding(ownerId: string, internalAgentId: string): Promise<RecoveryAgentBinding | null>;
  /** Current provider/quote/payment/chain/registry facts. No request authority.
   * After claim this resolver MUST use the given owned operation if it reads
   * Ledger authority; the ordinary stable loader correctly denies odd state. */
  resolveExecutionFacts(projection: CanonicalRecoveryProjection, operation: RecoveryOperation | null): Promise<string>;
  nonceStore: WorldAgentNonceStore;
  agentBook: WorldAgentBookLookup;
  /** Server-only economic adapter. This adapter is the ONE owner of the
   * claimed -> effect-started transition. It must revalidate at its own atomic
   * begin/reservation boundary and durably retain exact output before return.
   * World never begins or records the effect itself. */
  performEffect(input: {
    projection: CanonicalRecoveryProjection;
    operation: RecoveryOperation;
    intentHash: string;
    revalidate(operation: RecoveryOperation): Promise<void>;
  }): Promise<{ operation: RecoveryOperation; transactionId: string; envelopeDigest: string }>;
};
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const digest = (s: unknown): s is string => typeof s === 'string' && /^[a-f0-9]{64}$/.test(s);
function requireValid(v: unknown, reason: string): asserts v { if (!v) throw new Error(reason); }
function select(input: CanonicalRecoverySelection) {
  requireValid(input && Object.keys(input).sort().join(',') === 'mandateId,operationId,ownerId', 'Invalid canonical selection');
  requireValid([input.ownerId,input.mandateId].every(v => typeof v === 'string' && /^[A-Za-z0-9._:@-]{1,200}$/.test(v)) &&
    typeof input.operationId === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(input.operationId), 'Invalid canonical identity');
  return Object.freeze({ ...input });
}
function authorityFor(s: CanonicalRecoverySelection, d: CanonicalWorldConsumerDependencies) {
  const a = d.authority(s);
  requireValid(a.ownerId === s.ownerId && a.mandateId === s.mandateId && a.authorityBoundaryStore && a.revalidateMutableAuthority, 'Canonical authority selection mismatch');
  return a;
}
function validateBinding(raw: RecoveryAgentBinding | null, ownerId: string, agentId: string) {
  requireValid(raw && Object.keys(raw).sort().join(',') === 'hederaExecutorAccountId,holderAccountId,internalAgentId,ownerId,resourceUri,version,worldRequester', 'Missing canonical agent binding');
  const b = Object.freeze({ ...raw, worldRequester: raw.worldRequester.toLowerCase() });
  const uri = new URL(b.resourceUri);
  requireValid(b.ownerId === ownerId && b.internalAgentId === agentId && /^[A-Za-z0-9._:@-]{1,200}$/.test(b.version) &&
    /^0x[0-9a-f]{40}$/.test(b.worldRequester) && !/^0x0{40}$/.test(b.worldRequester) &&
    [b.holderAccountId,b.hederaExecutorAccountId].every(v=>/^0\.0\.[1-9][0-9]*$/.test(v)) && b.holderAccountId !== b.hederaExecutorAccountId &&
    (uri.protocol === 'https:' || uri.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(uri.hostname)) &&
    !uri.username && !uri.password && !uri.hash && !uri.search && uri.pathname === '/api/agent/confirm' && uri.href === b.resourceUri, 'Invalid canonical agent binding');
  return b;
}
function projectionBinding(p: CanonicalRecoveryProjection): RecoveryAgentBinding {
  return { version:p.bindingVersion,ownerId:p.ownerId,holderAccountId:p.holderAccountId,internalAgentId:p.internalAgentId,
    worldRequester:p.worldRequester,hederaExecutorAccountId:p.hederaExecutorAccountId,resourceUri:p.resourceUri };
}
async function intent(p: CanonicalRecoveryProjection, operation: RecoveryOperation | null, d: CanonicalWorldConsumerDependencies) {
  const facts = await d.resolveExecutionFacts(p, operation && Object.freeze({ ...operation }));
  requireValid(digest(facts), 'Full execution facts digest required');
  return hash(JSON.stringify({ domain:'yourturn:canonical-recovery:intent:v1',projection:canonicalProjectionDigest(p),executionFactsDigest:facts }));
}
export function canonicalWorldStatement(operationId: string, intentHash: string) {
  requireValid(/^[A-Za-z0-9._:-]{1,128}$/.test(operationId) && digest(intentHash), 'Invalid signed intent');
  return `YourTurn testnet recovery operation ${operationId}; intent sha256:${intentHash}`;
}
/** Read-only challenge preparation. No nonce, operation or payment reservation. */
export async function prepareCanonicalWorldRequest(selection: CanonicalRecoverySelection, d: CanonicalWorldConsumerDependencies) {
  const started = Date.now(), resourceUri = d.resourceUri, s = select(selection), authority = authorityFor(s,d);
  const p = await resolveCanonicalRecoveryProjection({ authority,operationId:s.operationId,resolveAgentBinding:d.resolveAgentBinding });
  requireValid(p.resourceUri === resourceUri, 'Canonical binding differs from configured endpoint');
  const intentHash = await intent(p,null,d);
  const final = await resolveCanonicalRecoveryProjection({ authority,operationId:s.operationId,resolveAgentBinding:d.resolveAgentBinding });
  requireValid(isDeepStrictEqual(p,final) && await intent(final,null,d) === intentHash && Date.now() >= started && Date.now()-started < 5000, 'Canonical facts changed during challenge');
  return Object.freeze({ projection:p,intentHash,statement:canonicalWorldStatement(s.operationId,intentHash),executionPermit:false as const });
}
type VerifiedWorldProof = { verification: WorldAgentVerification; issuedAtMs: number; signedExpiresAtMs: number; startedAtMs: number };
function freshWorld(proof: VerifiedWorldProof, b: RecoveryAgentBinding) {
  const v = proof.verification;
  const now = Date.now();
  requireValid(now >= proof.startedAtMs && now >= proof.issuedAtMs && now-proof.issuedAtMs < 60_000 && now < proof.signedExpiresAtMs && now >= Date.parse(v.verifiedAt) && evaluateWorldAgentGate(v,b.resourceUri,b.worldRequester,now).status === 'allowed', 'World verification expired or changed');
}
async function verifyHeader(header: string, b: RecoveryAgentBinding, operationId: string, intentHash: string, d: CanonicalWorldConsumerDependencies) {
  const startedAtMs = Date.now();
  requireValid(typeof header === 'string' && Buffer.byteLength(header,'utf8') <= 16384, 'Invalid World header');
  let payload;
  try { payload = parseAgentkitHeader(header); } catch { throw new Error('Invalid World header'); }
  requireValid(payload.statement === canonicalWorldStatement(operationId,intentHash), 'World signature is not bound to exact operation intent');
  const issuedAtMs = Date.parse(payload.issuedAt), signedExpiresAtMs = payload.expirationTime ? Date.parse(payload.expirationTime) : issuedAtMs+60_000;
  requireValid(Number.isSafeInteger(issuedAtMs) && Number.isSafeInteger(signedExpiresAtMs), 'Invalid signed World timestamps');
  const r = await verifyWorldAgentRequest({ agentkitHeader:header,expectedResourceUri:b.resourceUri,expectedAgentAddress:b.worldRequester,
    nonceStore:d.nonceStore,agentBook:d.agentBook,maxAgeMs:60_000 });
  requireValid(r.status === 'allowed', 'World requester verification denied');
  const proof = Object.freeze({verification:Object.freeze({...r.verification}),issuedAtMs,signedExpiresAtMs,startedAtMs});
  requireValid(Date.now()-startedAtMs < 5000, 'World verification window expired');
  freshWorld(proof,b);
  return proof;
}
const result = (r: RecoveryOperation, effectInvoked: boolean) => Object.freeze({ operationId:r.operationId,phase:r.phase,
  transactionId:r.transactionId,envelopeDigest:r.envelopeDigest,receiptDigest:r.receiptDigest,effectInvoked,executionPermit:false as const });
/** Actual World -> guarded Ledger claim -> owned recheck -> one downstream
 * economic adapter. Existing operations are STATUS ONLY. The downstream
 * adapter alone owns claimed -> effect-started and retained output. */
export async function confirmCanonicalWorldRecovery(input: CanonicalRecoverySelection & { intentHash: string; agentkitHeader: string }, d: CanonicalWorldConsumerDependencies) {
  requireValid(input && Object.keys(input).sort().join(',') === 'agentkitHeader,intentHash,mandateId,operationId,ownerId' && digest(input.intentHash), 'Invalid canonical request');
  const s = select({ownerId:input.ownerId,mandateId:input.mandateId,operationId:input.operationId});
  const resourceUri = d.resourceUri, intentHash = input.intentHash, header = input.agentkitHeader, authority = authorityFor(s,d), store = authority.authorityBoundaryStore;
  const existing = await readRecoveryOperation({store,operationId:s.operationId,ownerId:s.ownerId,intentHash});
  if (existing) {
    requireValid(existing.mandateId === s.mandateId, 'Operation mandate mismatch');
    const binding = validateBinding(await d.resolveAgentBinding(s.ownerId,existing.agentId),s.ownerId,existing.agentId);
    requireValid(binding.resourceUri === resourceUri, 'Status binding differs from configured endpoint');
    const v = await verifyHeader(header,binding,s.operationId,intentHash,d);
    const latestBinding = validateBinding(await d.resolveAgentBinding(s.ownerId,existing.agentId),s.ownerId,existing.agentId);
    requireValid(isDeepStrictEqual(binding,latestBinding), 'Requester binding changed'); freshWorld(v,latestBinding);
    const latest = await readRecoveryOperation({store,operationId:s.operationId,ownerId:s.ownerId,intentHash});
    requireValid(latest && latest.mandateId === s.mandateId, 'Operation disappeared');
    return result(latest,false);
  }
  const prepared = await prepareCanonicalWorldRequest(s,d), p = prepared.projection;
  requireValid(prepared.intentHash === intentHash && p.resourceUri === resourceUri, 'Current canonical intent or endpoint differs');
  const binding = projectionBinding(p), world = await verifyHeader(header,binding,s.operationId,intentHash,d);
  const claimed = await claimRecoveryOperation({ authority,operationId:s.operationId,intentHash,resolveIntent:async () => {
    freshWorld(world,binding);
    const current = await prepareCanonicalWorldRequest(s,d);
    requireValid(current.intentHash === intentHash && isDeepStrictEqual(current.projection,p), 'Canonical intent changed before claim');
    freshWorld(world,binding);
    return {intentHash,agentId:p.internalAgentId,action:'resale'};
  }});
  if (!claimed.claimed) return result(claimed.record,false);
  const revalidate = async (operation: RecoveryOperation) => {
    const startedAt = Date.now();
    requireValid(operation.operationId === claimed.record.operationId && operation.intentHash === intentHash && operation.ownerId === s.ownerId && operation.mandateId === s.mandateId,
      'Downstream operation identity changed');
    freshWorld(world,binding);
    const loaded = await loadRecoveryOperationAuthority({store,operation,revalidateMutableAuthority:authority.revalidateMutableAuthority});
    const m = loaded.mandate,r = loaded.record;
    requireValid(m.mandateId === p.mandateId && r.digest === p.mandateDigest && r.currentGeneration === p.mandateGeneration &&
      r.authorityStateVersion === p.bookingAuthorityVersion && m.ownerId === p.ownerId && m.agentId === p.internalAgentId &&
      m.bookingTokenId === p.bookingTokenId && m.bookingSerial.toString() === String(p.bookingSerial) &&
      m.minimumRecoveryAtomicUnits.toString() === p.minimumRecoveryAtomicUnits && m.expiresAt.toString() === p.expiresAtUnixSeconds,
      'Owned canonical projection changed');
    const currentBinding = validateBinding(await d.resolveAgentBinding(s.ownerId,p.internalAgentId),s.ownerId,p.internalAgentId);
    requireValid(isDeepStrictEqual(currentBinding,binding) && await intent(p,operation,d) === intentHash, 'Owned canonical execution facts changed');
    await loadRecoveryOperationAuthority({store,operation,revalidateMutableAuthority:authority.revalidateMutableAuthority});
    const finalBinding = validateBinding(await d.resolveAgentBinding(s.ownerId,p.internalAgentId),s.ownerId,p.internalAgentId);
    requireValid(isDeepStrictEqual(finalBinding,binding) && await intent(p,operation,d) === intentHash && Date.now() >= startedAt && Date.now()-startedAt < 5000, 'Owned requester or execution facts changed');
    freshWorld(world,binding);
  };
  await revalidate(claimed.record);
  // No World-owned begin call exists here. The downstream economic adapter must
  // atomically begin exactly once, revalidate at that boundary, and retain refs.
  const output = await d.performEffect({projection:p,operation:Object.freeze({...claimed.record}),intentHash,revalidate});
  requireValid(output && Object.keys(output).sort().join(',') === 'envelopeDigest,operation,transactionId' &&
    output.operation.phase === 'effect-started' && output.operation.operationId === claimed.record.operationId &&
    output.operation.ownerId === claimed.record.ownerId && output.operation.mandateId === claimed.record.mandateId &&
    output.operation.intentHash === claimed.record.intentHash && output.operation.fence === claimed.record.fence &&
    output.operation.ownedVersion === claimed.record.ownedVersion && output.operation.transactionId === output.transactionId &&
    output.operation.envelopeDigest === output.envelopeDigest && typeof output.transactionId === 'string' && output.transactionId.length > 0 &&
    digest(output.envelopeDigest), 'Invalid retained effect result');
  const latest = await readRecoveryOperation({store,operationId:s.operationId,ownerId:s.ownerId,intentHash});
  requireValid(latest !== null && isDeepStrictEqual(latest,output.operation), 'Retained effect result is not authoritative operation state');
  return result(latest,true);
}
