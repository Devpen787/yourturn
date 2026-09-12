import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { parseAgentkitHeader } from "@worldcoin/agentkit";
import { resolveCanonicalRecoveryProjection, canonicalProjectionDigest, type CanonicalRecoveryProjection, type RecoveryAgentBinding } from "../ledger/canonical-recovery-projection.ts";
import { loadActiveRecoveryMandate } from "../ledger/recovery-mandate-state.ts";
import { loadRecoveryOperationAuthority } from "../ledger/recovery-operation-authority.ts";
import { readRecoveryOperation, claimRecoveryOperation, beginRecoveryOperationEffect, recordRecoveryOperationEnvelope, type RecoveryOperation } from "../ledger/recovery-mandate-operation.ts";
import { verifyWorldAgentRequest, type WorldAgentBookLookup } from "../world-agentkit/server-verifier.ts";
import { evaluateWorldAgentGate, type WorldAgentVerification } from "../world-agentkit/trust-boundary.ts";
import type { WorldAgentNonceStore } from "../world-agentkit/nonce-store.ts";

type Authority = Parameters<typeof loadActiveRecoveryMandate>[0];
export type CanonicalRecoverySelection = { ownerId: string; mandateId: string; operationId: string };
export type CanonicalWorldConsumerDependencies = {
  /** Owner is supplied by verified server authentication, not request JSON. */
  authority(selection: CanonicalRecoverySelection): Authority;
  resolveAgentBinding(ownerId: string, internalAgentId: string): Promise<RecoveryAgentBinding | null>;
  /** Current provider/quote/payment/chain/registry facts. No request authority.
   * After claim this resolver MUST use the given owned operation if it reads
   * Ledger authority; the ordinary stable loader correctly denies odd state. */
  resolveExecutionFacts(projection: CanonicalRecoveryProjection, operation: RecoveryOperation | null): Promise<string>;
  nonceStore: WorldAgentNonceStore;
  agentBook: WorldAgentBookLookup;
  /** Server-only effect adapter. It must revalidate at its own reservation /
   * signing boundary and durably retain exact output BEFORE returning refs.
   * Never retry unknown output or clear payment replay tombstones. */
  performEffect(input: { projection: CanonicalRecoveryProjection; operation: RecoveryOperation; intentHash: string; revalidate(): Promise<void> }): Promise<{ transactionId: string; envelopeDigest: string }>;
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
  const started = Date.now(), s = select(selection), authority = authorityFor(s,d);
  const p = await resolveCanonicalRecoveryProjection({ authority,operationId:s.operationId,resolveAgentBinding:d.resolveAgentBinding });
  const intentHash = await intent(p,null,d);
  const final = await resolveCanonicalRecoveryProjection({ authority,operationId:s.operationId,resolveAgentBinding:d.resolveAgentBinding });
  requireValid(isDeepStrictEqual(p,final) && await intent(final,null,d) === intentHash && Date.now() >= started && Date.now()-started < 5000, 'Canonical facts changed during challenge');
  return Object.freeze({ projection:p,intentHash,statement:canonicalWorldStatement(s.operationId,intentHash),executionPermit:false as const });
}
function freshWorld(v: WorldAgentVerification, b: RecoveryAgentBinding) {
  const now = Date.now();
  requireValid(now >= Date.parse(v.verifiedAt) && evaluateWorldAgentGate(v,b.resourceUri,b.worldRequester,now).status === 'allowed', 'World verification expired or changed');
}
async function verifyHeader(header: string, b: RecoveryAgentBinding, operationId: string, intentHash: string, d: CanonicalWorldConsumerDependencies) {
  requireValid(typeof header === 'string' && Buffer.byteLength(header,'utf8') <= 16384, 'Invalid World header');
  let payload;
  try { payload = parseAgentkitHeader(header); } catch { throw new Error('Invalid World header'); }
  requireValid(payload.statement === canonicalWorldStatement(operationId,intentHash), 'World signature is not bound to exact operation intent');
  const r = await verifyWorldAgentRequest({ agentkitHeader:header,expectedResourceUri:b.resourceUri,expectedAgentAddress:b.worldRequester,
    nonceStore:d.nonceStore,agentBook:d.agentBook,maxAgeMs:60_000 });
  // Do not return raw verifier details or anonymous human identifiers.
  requireValid(r.status === 'allowed', 'World requester verification denied');
  freshWorld(r.verification,b);
  return r.verification;
}
const result = (r: RecoveryOperation, effectInvoked: boolean) => Object.freeze({ operationId:r.operationId,phase:r.phase,
  transactionId:r.transactionId,envelopeDigest:r.envelopeDigest,receiptDigest:r.receiptDigest,effectInvoked,executionPermit:false as const });
/** Actual World -> guarded Ledger claim -> owned recheck -> one effect call.
 * Existing operations are STATUS ONLY, even if claimed, expired or revoked.
 * Fresh World nonce can read the same intent; it never regenerates an effect. */
export async function confirmCanonicalWorldRecovery(input: CanonicalRecoverySelection & { intentHash: string; agentkitHeader: string }, d: CanonicalWorldConsumerDependencies) {
  requireValid(input && Object.keys(input).sort().join(',') === 'agentkitHeader,intentHash,mandateId,operationId,ownerId' && digest(input.intentHash), 'Invalid canonical request');
  const s = select({ownerId:input.ownerId,mandateId:input.mandateId,operationId:input.operationId});
  const intentHash = input.intentHash, header = input.agentkitHeader, authority = authorityFor(s,d), store = authority.authorityBoundaryStore;
  const existing = await readRecoveryOperation({store,operationId:s.operationId,ownerId:s.ownerId,intentHash});
  if (existing) {
    requireValid(existing.mandateId === s.mandateId, 'Operation mandate mismatch');
    const binding = validateBinding(await d.resolveAgentBinding(s.ownerId,existing.agentId),s.ownerId,existing.agentId);
    const v = await verifyHeader(header,binding,s.operationId,intentHash,d);
    const latestBinding = validateBinding(await d.resolveAgentBinding(s.ownerId,existing.agentId),s.ownerId,existing.agentId);
    requireValid(isDeepStrictEqual(binding,latestBinding), 'Requester binding changed'); freshWorld(v,latestBinding);
    const latest = await readRecoveryOperation({store,operationId:s.operationId,ownerId:s.ownerId,intentHash});
    requireValid(latest && latest.mandateId === s.mandateId, 'Operation disappeared');
    return result(latest,false);
  }
  const prepared = await prepareCanonicalWorldRequest(s,d), p = prepared.projection;
  requireValid(prepared.intentHash === intentHash, 'Current canonical intent differs');
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
  const started = await beginRecoveryOperationEffect(store,claimed.record,async op => { await revalidate(op); return intentHash; });
  await revalidate(started);
  // This invocation cannot be replayed. Unknown output leaves effect-started.
  const output = await d.performEffect({projection:p,operation:Object.freeze({...started}),intentHash,revalidate:()=>revalidate(started)});
  requireValid(output && Object.keys(output).sort().join(',') === 'envelopeDigest,transactionId', 'Invalid retained effect references');
  const retained = await recordRecoveryOperationEnvelope(store,started,output.transactionId,output.envelopeDigest);
  return result(retained,true);
}
