import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { loadActiveRecoveryMandate } from "./recovery-mandate-state.ts";

export type RecoveryAgentBinding = {
  version: string; ownerId: string; holderAccountId: string;
  internalAgentId: string; worldRequester: string; hederaExecutorAccountId: string;
  resourceUri: string;
};
export type CanonicalRecoveryProjection = {
  authority: "ledger-recovery-mandate"; mandateId: string; mandateDigest: string;
  mandateGeneration: number; bookingAuthorityVersion: number;
  ownerId: string; holderAccountId: string; bookingTokenId: string; bookingSerial: number;
  internalAgentId: string; worldRequester: string; hederaExecutorAccountId: string;
  bindingVersion: string; resourceUri: string; operationId: string;
  signedAction: "resale"; executionAction: "RECOVER";
  minimumRecoveryAtomicUnits: string; settlementTokenId: "0.0.429274"; settlementDecimals: 6;
  expiresAtUnixSeconds: string; expiresAtMs: number; cancellationAllowed: false;
};
const label = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9._:@-]{1,200}$/.test(v);
const account = (v: unknown): v is string => typeof v === "string" && /^0\.0\.[1-9]\d*$/.test(v);
function binding(value: unknown): RecoveryAgentBinding {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).sort().join(',') !== 'hederaExecutorAccountId,holderAccountId,internalAgentId,ownerId,resourceUri,version,worldRequester') throw new Error('Missing canonical server agent binding');
  const b = value as RecoveryAgentBinding;
  if (![b.version,b.ownerId,b.internalAgentId].every(label) || !account(b.holderAccountId) || !account(b.hederaExecutorAccountId) ||
      typeof b.worldRequester !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(b.worldRequester) || /^0x0{40}$/.test(b.worldRequester)) throw new Error('Invalid canonical server agent binding');
  const uri = new URL(b.resourceUri);
  const loopback = ['localhost','127.0.0.1','[::1]'].includes(uri.hostname);
  if (!(uri.protocol === 'https:' || uri.protocol === 'http:' && loopback) || uri.username || uri.password || uri.hash || uri.search || uri.pathname !== '/api/agent/confirm' || uri.href !== b.resourceUri) throw new Error('Invalid exact World resource URI');
  if (b.holderAccountId === b.hederaExecutorAccountId) throw new Error('Holder and delegated executor must remain separate');
  return {...b,worldRequester:b.worldRequester.toLowerCase()};
}
function project(loaded: Awaited<ReturnType<typeof loadActiveRecoveryMandate>>, b: RecoveryAgentBinding, operationId: string): CanonicalRecoveryProjection {
  const {mandate:m,record:r}=loaded;
  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(operationId) || b.ownerId !== m.ownerId || b.internalAgentId !== m.agentId || r.ownerId !== m.ownerId) throw new Error('Canonical owner/agent/operation mismatch');
  if (m.allowedAction !== 'resale' || m.cancellationAllowed !== false || m.settlementAsset !== '0.0.429274') throw new Error('Unsupported canonical action or settlement asset');
  if (m.minimumRecoveryAtomicUnits <= BigInt(0) || m.minimumRecoveryAtomicUnits > BigInt('9223372036854775807')) throw new Error('Canonical minimum must be a positive HTS atomic amount');
  const expiry = m.expiresAt * BigInt(1000);
  if (expiry <= BigInt(Date.now()) || expiry > BigInt(Number.MAX_SAFE_INTEGER) || m.bookingSerial <= BigInt(0) || m.bookingSerial > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Canonical time or booking serial is not safely representable');
  if (!/^0x[0-9a-fA-F]{64}$/.test(r.digest) || !Number.isSafeInteger(r.currentGeneration) || r.currentGeneration < 1) throw new Error('Invalid canonical mandate identity');
  return Object.freeze({authority:'ledger-recovery-mandate',mandateId:m.mandateId,mandateDigest:r.digest,mandateGeneration:r.currentGeneration,bookingAuthorityVersion:r.authorityStateVersion,
    ownerId:m.ownerId,holderAccountId:b.holderAccountId,bookingTokenId:m.bookingTokenId,bookingSerial:Number(m.bookingSerial),internalAgentId:m.agentId,
    worldRequester:b.worldRequester,hederaExecutorAccountId:b.hederaExecutorAccountId,bindingVersion:b.version,resourceUri:b.resourceUri,operationId,
    signedAction:'resale',executionAction:'RECOVER',minimumRecoveryAtomicUnits:m.minimumRecoveryAtomicUnits.toString(),settlementTokenId:'0.0.429274',settlementDecimals:6,
    expiresAtUnixSeconds:m.expiresAt.toString(),expiresAtMs:Number(expiry),cancellationAllowed:false});
}
/** Registry is a mandatory authoritative server dependency, never a request
 * body/ApprovalGrant. No default production account/address mapping is inferred.
 * The ordinary loader remains strict; this entry point is for pre-claim stable
 * state, never a bypass for the operation's owned odd version. */
export async function resolveCanonicalRecoveryProjection(input: {
  authority: Parameters<typeof loadActiveRecoveryMandate>[0]; operationId: string;
  resolveAgentBinding: (ownerId: string, internalAgentId: string) => Promise<RecoveryAgentBinding | null>;
}) {
  const first = await loadActiveRecoveryMandate(input.authority);
  const firstBinding = binding(await input.resolveAgentBinding(first.mandate.ownerId,first.mandate.agentId));
  const projection = project(first,firstBinding,input.operationId);
  // Close an async mapping lookup race without weakening the canonical guard.
  const second = await loadActiveRecoveryMandate(input.authority);
  const secondBinding = binding(await input.resolveAgentBinding(second.mandate.ownerId,second.mandate.agentId));
  if (!isDeepStrictEqual(projection,project(second,secondBinding,input.operationId))) throw new Error('Canonical authority or mapping changed during resolution');
  const final = await loadActiveRecoveryMandate(input.authority);
  if (!isDeepStrictEqual(projection,project(final,secondBinding,input.operationId))) throw new Error('Canonical authority changed during final mapping read');
  return projection;
}
/** Provider/quote/payment facts are added by their independent authoritative
 * resolvers to the operation's full intent. This digest alone is NOT permission. */
export function canonicalProjectionDigest(projection: CanonicalRecoveryProjection): string {
  const ordered = Object.fromEntries(Object.keys(projection).sort().map(key=>[key,projection[key as keyof CanonicalRecoveryProjection]]));
  return createHash('sha256').update(JSON.stringify(ordered)).digest('hex');
}
