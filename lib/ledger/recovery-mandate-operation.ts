import { randomUUID } from "node:crypto";
import { loadActiveRecoveryMandate } from "./recovery-mandate-state.ts";
import { currentMandateKey, parseCurrentMandate, serializeCurrentMandate, type CurrentMandate } from "./recovery-mandate-current.ts";
import { recoveryMandateAuthorityVersionKey, type RecoveryMandateAuthorityBoundaryStore as Store } from "./recovery-mandate-authority-boundary.ts";

// Server-only primitive. Callers must independently authenticate owner/requester
// and resolve the intent hash from current provider, quote, funding and mapping
// facts. This module neither accepts World proof nor creates holder authority.
export type RecoveryOperation = {
  schemaVersion: 1; operationId: string; intentHash: string;
  ownerId: string; mandateId: string; token: string; serial: string;
  agentId: string; action: "resale"; pointer: string;
  stableVersion: number; ownedVersion: number; expiresAt: number;
  revision: number; fence: string; leaseUntil: number;
  phase: "claimed" | "effect-started" | "completed" | "no-effect";
  transactionId: string | null; envelopeDigest: string | null; receiptDigest: string | null;
};
const MAX = Number.MAX_SAFE_INTEGER - 4;
const digest = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const id = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9._:@-]{1,200}$/.test(v);
const integer = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0 && (v as number) <= MAX;
const fields = "action,agentId,envelopeDigest,expiresAt,fence,intentHash,leaseUntil,mandateId,operationId,ownedVersion,ownerId,phase,pointer,receiptDigest,revision,schemaVersion,serial,stableVersion,token,transactionId";
function parse(raw: unknown): RecoveryOperation {
  const r = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!r || typeof r !== "object" || Array.isArray(r) || Object.keys(r).sort().join(",") !== fields ||
      r.schemaVersion !== 1 || ![r.operationId,r.ownerId,r.mandateId,r.agentId,r.fence].every(id) || !digest(r.intentHash) ||
      !/^\d+\.\d+\.\d+$/.test(r.token) || !/^[1-9]\d*$/.test(r.serial) || r.action !== "resale" ||
      ![r.stableVersion,r.ownedVersion,r.expiresAt,r.revision,r.leaseUntil].every(integer) ||
      r.stableVersion % 2 !== 0 || r.ownedVersion !== r.stableVersion + 1 || typeof r.pointer !== "string" ||
      !["claimed","effect-started","completed","no-effect"].includes(r.phase) ||
      !(r.transactionId === null || id(r.transactionId)) || !(r.envelopeDigest === null || digest(r.envelopeDigest)) ||
      !(r.receiptDigest === null || digest(r.receiptDigest))) throw new Error("Malformed recovery operation");
  const p = parseCurrentMandate(r.pointer);
  if (!p) throw new Error("Missing operation authority pointer");
  if (serializeCurrentMandate(p) !== r.pointer || p.state !== "active" || p.ownerId !== r.ownerId || p.mandateId !== r.mandateId) throw new Error("Operation authority identity mismatch");
  if ((r.transactionId === null) !== (r.envelopeDigest === null) ||
      (r.phase === "claimed" || r.phase === "no-effect") && (r.transactionId !== null || r.receiptDigest !== null) ||
      (r.phase === "completed") !== (r.receiptDigest !== null) || r.phase === "completed" && r.transactionId === null) throw new Error("Malformed operation evidence");
  return r;
}
// Fixed key ordering also handles an adapter returning a decoded JSON object.
function encode(r: RecoveryOperation) { return JSON.stringify(Object.fromEntries(fields.split(",").map(k => [k,r[k as keyof RecoveryOperation]]))); }
export function recoveryOperationKey(operationId: string) {
  if (!id(operationId)) throw new Error("Invalid operation ID");
  return `bookedrights:ledger:operation:${operationId}`;
}
const keys = (r: RecoveryOperation) => [recoveryMandateAuthorityVersionKey(BigInt(r.serial)), recoveryOperationKey(r.operationId), currentMandateKey(r.token,BigInt(r.serial))];
const now = () => Math.floor(Date.now()/1000);
const lease = () => now()+30;
const CLAIM = `
local now = tonumber(redis.call("TIME")[1])
if redis.call("EXISTS",KEYS[2]) ~= 0 then return 0 end
if tonumber(ARGV[3]) <= now or tonumber(ARGV[4]) <= now or tonumber(ARGV[4]) > now + 30 then return -1 end
if (redis.call("GET",KEYS[1]) or "0") ~= ARGV[1] or (redis.call("GET",KEYS[3]) or "") ~= ARGV[2] then return -1 end
redis.call("SET",KEYS[2],ARGV[5])
redis.call("SET",KEYS[1],ARGV[6])
return 1
`;
const TRANSITION = `
local now = tonumber(redis.call("TIME")[1])
if (redis.call("GET",KEYS[2]) or "") ~= ARGV[1] or (redis.call("GET",KEYS[1]) or "") ~= ARGV[2] then return -1 end
if ARGV[3] == "takeover" then
  if tonumber(ARGV[4]) > now or tonumber(ARGV[5]) <= now or tonumber(ARGV[5]) > now + 30 then return -1 end
elseif ARGV[3] ~= "abandon" then
  if tonumber(ARGV[4]) <= now then return -1 end
end
if ARGV[6] == "authority" then
  if tonumber(ARGV[7]) <= now or (redis.call("GET",KEYS[3]) or "") ~= ARGV[8] then return -1 end
end
redis.call("SET",KEYS[2],ARGV[9])
if ARGV[10] ~= "" then redis.call("SET",KEYS[1],ARGV[10]) end
return 1
`;
export async function readRecoveryOperation(input: {store: Store; operationId: string; ownerId: string; intentHash: string}) {
  if (!id(input.ownerId) || !digest(input.intentHash)) throw new Error("Invalid operation request identity");
  const raw = await input.store.get(recoveryOperationKey(input.operationId));
  if (raw === null) return null;
  const r = parse(raw);
  if (r.operationId !== input.operationId || r.ownerId !== input.ownerId || r.intentHash !== input.intentHash) throw new Error("Operation request identity mismatch");
  // Read-only, even after revoke/expiry. Never a new-effect permission.
  return r;
}
export async function claimRecoveryOperation(input: {
  authority: Parameters<typeof loadActiveRecoveryMandate>[0];
  operationId: string; intentHash: string;
  resolveIntent: (authority: Awaited<ReturnType<typeof loadActiveRecoveryMandate>>) => Promise<{intentHash: string; agentId: string; action: "resale"}>;
}) {
  const store = input.authority.authorityBoundaryStore;
  const request = {store,operationId:input.operationId,ownerId:input.authority.ownerId,intentHash:input.intentHash};
  const existing = await readRecoveryOperation(request);
  if (existing) {
    if (existing.mandateId !== input.authority.mandateId) throw new Error("Operation mandate mismatch");
    return {claimed:false,record:existing};
  }
  const authority = await loadActiveRecoveryMandate(input.authority);
  const m = authority.mandate, a = authority.record, resolved = await input.resolveIntent(authority);
  if (resolved.intentHash !== input.intentHash || resolved.agentId !== m.agentId || resolved.action !== m.allowedAction || resolved.action !== "resale") throw new Error("Resolved operation intent differs from mandate");
  const pointer: CurrentMandate = {schemaVersion:1,generation:a.currentGeneration,state:"active",ownerId:a.ownerId,mandateId:m.mandateId,digest:a.digest};
  const r: RecoveryOperation = {schemaVersion:1,operationId:input.operationId,intentHash:input.intentHash,ownerId:a.ownerId,mandateId:m.mandateId,
    token:m.bookingTokenId,serial:m.bookingSerial.toString(),agentId:m.agentId,action:"resale",pointer:serializeCurrentMandate(pointer),
    stableVersion:a.authorityStateVersion,ownedVersion:a.authorityStateVersion+1,expiresAt:Number(m.expiresAt),revision:0,fence:randomUUID(),leaseUntil:lease(),phase:"claimed",transactionId:null,envelopeDigest:null,receiptDigest:null};
  parse(r);
  const result = await store.eval(CLAIM,keys(r),[r.stableVersion,r.pointer,r.expiresAt,r.leaseUntil,encode(r),r.ownedVersion]);
  if (result === 0) { const concurrent = await readRecoveryOperation(request); if (concurrent && concurrent.mandateId === r.mandateId) return {claimed:false,record:concurrent}; }
  if (result !== 1) throw new Error("Operation claim lost current authority or expired");
  return {claimed:true,record:r};
}
async function transition(store: Store, current: RecoveryOperation, next: RecoveryOperation, options: {takeover?: boolean; authority?: boolean; release?: boolean; abandon?: boolean} = {}) {
  parse(current);parse(next);
  if (next.revision !== current.revision+1) throw new Error("Invalid operation revision");
  const result = await store.eval(TRANSITION,keys(current),[encode(current),current.ownedVersion,options.takeover?"takeover":options.abandon?"abandon":"owned",current.leaseUntil,next.leaseUntil,
    options.authority?"authority":"receipt-only",current.expiresAt,current.pointer,encode(next),options.release?current.ownedVersion+1:""]);
  if (result !== 1) throw new Error("Operation transition lost fence, lease or authority");
  return next;
}
/** An expired worker can be replaced, but receipt-only recovery of an already
 * started effect never resets phase or grants permission to prepare it again. */
export async function takeOverRecoveryOperation(store: Store, current: RecoveryOperation) {
  if (!["claimed","effect-started"].includes(current.phase)) throw new Error("Terminal operation cannot be taken over");
  return transition(store,current,{...current,revision:current.revision+1,fence:randomUUID(),leaseUntil:lease()},{takeover:true,authority:current.phase==="claimed"});
}
/** One atomic permit, recorded BEFORE any irreversible helper/reservation call.
 * If the process loses Hedera's output after reservation, keep effect-started;
 * never call that helper again or erase its replay tombstones. */
export async function beginRecoveryOperationEffect(store: Store, current: RecoveryOperation, revalidate: (record: RecoveryOperation) => Promise<string>) {
  if (current.phase !== "claimed") throw new Error("Operation effect already started or finished");
  if (await revalidate(current) !== current.intentHash) throw new Error("Current operation intent changed");
  return transition(store,current,{...current,revision:current.revision+1,phase:"effect-started"},{authority:true});
}
/** Store immutable references to durably retained output, not credentials or raw
 * signatures. The consumer must retain the exact envelope under this digest. */
export async function recordRecoveryOperationEnvelope(store: Store, current: RecoveryOperation, transactionId: string, envelopeDigest: string) {
  if (current.phase !== "effect-started" || current.transactionId !== null || !id(transactionId) || !digest(envelopeDigest)) throw new Error("Operation envelope cannot be replaced");
  return transition(store,current,{...current,revision:current.revision+1,transactionId,envelopeDigest});
}
/** Receipt verifier is a trusted authoritative resolver, not client testimony.
 * Completion remains possible after revoke/expiry, but cannot produce bytes. */
export async function completeRecoveryOperation(store: Store, current: RecoveryOperation, verifyReceipt: (record: RecoveryOperation) => Promise<{transactionId: string; receiptDigest: string}>) {
  if (current.phase !== "effect-started" || current.transactionId === null) throw new Error("No retained transaction to reconcile");
  const proof = await verifyReceipt(current);
  if (proof.transactionId !== current.transactionId || !digest(proof.receiptDigest)) throw new Error("Receipt is not bound to this operation transaction");
  return transition(store,current,{...current,revision:current.revision+1,phase:"completed",receiptDigest:proof.receiptDigest},{release:true});
}
/** Only a never-started operation can prove no effect by construction. Unknown
 * started effects retain the owned odd version until evidenced reconciliation. */
export async function abandonUnstartedRecoveryOperation(store: Store, current: RecoveryOperation) {
  if (current.phase !== "claimed") throw new Error("Started operation requires reconciliation");
  return transition(store,current,{...current,revision:current.revision+1,phase:"no-effect"},{release:true,abandon:true});
}
