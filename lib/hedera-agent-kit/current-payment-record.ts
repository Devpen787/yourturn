import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { getRedis } from "../store/redis.ts";
import { paymentCommitmentSchema } from "./exact-payment-authorization.ts";
import type { CurrentRecoveryPaymentRecord } from "./canonical-recovery-state.ts";

const INT64 = BigInt("9223372036854775807");
const label = z.string().regex(/^[A-Za-z0-9._:@-]{1,128}$/);
const operationId = z.string().regex(/^[A-Za-z0-9._:-]{1,128}$/);
const version = z.string().regex(/^[1-9][0-9]{0,18}$/).refine(v => BigInt(v) <= INT64);
const time = z.number().int().positive().max(8640000000000000);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
// Exact resolver record fields. v2, lifecycle and structural bindings below are
// stricter store conditions, never a relaxation of the reviewed resolver schema.
const recordSchema = z.object({
  schemaVersion: z.literal(1), version, ownerId: label, operationId, providerId: operationId,
  quote: z.object({ id: operationId, hash, expiresAtMs: time }).strict(),
  commitment: paymentCommitmentSchema, revokedAtMs: time.nullable(),
}).strict();
const publisherSchema = z.object({ publisherId: label, ownerId: label }).strict();
const validationSchema = z.object({ authorityFingerprint: hash, validUntilMs: time }).strict();
const persistedSchema = z.object({ schemaVersion: z.literal(1), publisher: publisherSchema, validation: validationSchema, record: recordSchema }).strict();
type Persisted = z.infer<typeof persistedSchema>;
type Store = { get(key: string): Promise<unknown>; eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown> };
export type AuthenticatedPaymentPublisher = z.infer<typeof publisherSchema>;
export type CurrentPaymentCandidateValidation = z.infer<typeof validationSchema>;
export type CurrentPaymentRecordDependencies = { store?: Store; now?: () => number };
export class CurrentPaymentRecordDenied extends Error {
  constructor(public readonly code: string) { super(code); this.name = "CurrentPaymentRecordDenied"; }
}
function requireRecord(ok: unknown, code: string): asserts ok { if (!ok) throw new CurrentPaymentRecordDenied(code); }
function freeze<T>(v: T): T { if (v && typeof v === "object") { for (const x of Object.values(v)) freeze(x); Object.freeze(v); } return v; }
function parseRecord(value: unknown): CurrentRecoveryPaymentRecord {
  const r = recordSchema.parse(value), c = r.commitment;
  requireRecord(c.domain === "yourturn:hedera:testnet:exact-payment:v2", "V2_PAYMENT_REQUIRED");
  requireRecord((r.version === "1" && r.revokedAtMs === null) || (r.version === "2" && r.revokedAtMs !== null), "INVALID_PAYMENT_LIFECYCLE");
  requireRecord(r.operationId === c.operationId && r.providerId === c.providerPolicyId && r.quote.id === c.quoteId && r.quote.hash === c.quoteHash, "PAYMENT_RECORD_SCOPE_MISMATCH");
  requireRecord(c.settlementSourceAccountId === c.receiverAccountId && c.settlementRecipientAccountId === c.holderAccountId && c.transactionFeePayerAccountId === c.delegatedAgentAccountId && new Set([c.holderAccountId,c.receiverAccountId,c.delegatedAgentAccountId]).size === 3, "PAYMENT_ROLE_MISMATCH");
  const seconds = c.transactionId.split("@")[1].split(".")[0], start = Number(seconds) * 1000;
  requireRecord(String(Number(seconds)) === seconds && Number.isSafeInteger(start) && start > 0 && c.transactionId.split("@")[0] === c.transactionFeePayerAccountId && start + c.transactionValidDurationSeconds * 1000 === c.expiresAtMs && c.expiresAtMs <= r.quote.expiresAtMs, "PAYMENT_VALIDITY_MISMATCH");
  return r;
}
function parse(value: unknown): Persisted {
  try {
    const p = persistedSchema.parse(typeof value === "string" ? JSON.parse(value) : structuredClone(value));
    p.record = parseRecord(p.record);
    requireRecord(p.publisher.ownerId === p.record.ownerId && p.record.commitment.expiresAtMs <= p.validation.validUntilMs, "PAYMENT_PROVENANCE_MISMATCH");
    return p;
  } catch (error) { if (error instanceof CurrentPaymentRecordDenied) throw error; throw new CurrentPaymentRecordDenied("PAYMENT_RECORD_CORRUPT"); }
}
const encode = (p: Persisted) => JSON.stringify(p);
export function currentPaymentRecordKey(id: string) { return `bookedrights:recovery:payment:v1:${operationId.parse(id)}`; }
export function currentPaymentCandidateDigest(candidate: CurrentRecoveryPaymentRecord) {
  const r = parseRecord(structuredClone(candidate));
  requireRecord(r.version === "1" && r.revokedAtMs === null, "INITIAL_PAYMENT_REQUIRED");
  return createHash("sha256").update(JSON.stringify(r)).digest("hex");
}
const CREATE = `
if redis.call("EXISTS",KEYS[1]) ~= 0 then return 0 end
local t = redis.call("TIME")
local now = tonumber(t[1])*1000 + math.floor(tonumber(t[2])/1000)
if tonumber(ARGV[2]) <= now then return -1 end
redis.call("SET",KEYS[1],ARGV[1])
return 1
`;
const REVOKE = `
if (redis.call("GET",KEYS[1]) or "") ~= ARGV[1] then return nil end
local t = redis.call("TIME")
local now = tonumber(t[1])*1000 + math.floor(tonumber(t[2])/1000)
local body, count = string.gsub(ARGV[2], '"revokedAtMs":0', '"revokedAtMs":' .. string.format('%.0f', now))
if count ~= 1 then return nil end
redis.call("SET",KEYS[1],body)
return body
`;
async function bounded<T>(dependencies: CurrentPaymentRecordDependencies, action: (store: Store, clock: () => number) => Promise<T>) {
  const now = dependencies.now ?? Date.now, store = dependencies.store ?? getRedis(), started = now();
  requireRecord(time.safeParse(started).success, "INVALID_CLOCK");
  let ended = false, lastObserved = started;
  const clock = () => { const n = now(); requireRecord(!ended && time.safeParse(n).success && n >= lastObserved && n - started < 5000, "PAYMENT_READ_WINDOW_EXPIRED"); lastObserved = n; return n; };
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { ended = true; reject(new CurrentPaymentRecordDenied("PAYMENT_STORAGE_TIMEOUT")); }, 5000); });
  try { return await Promise.race([action(store, clock), timeout]); } finally { ended = true; clearTimeout(timer!); }
}
function requireCurrent(p: Persisted, now: number) {
  requireRecord(p.record.revokedAtMs === null && p.record.version === "1", "PAYMENT_REVOKED");
  requireRecord(now < Math.min(p.record.commitment.expiresAtMs,p.record.quote.expiresAtMs,p.validation.validUntilMs), "PAYMENT_EXPIRED");
  const start = Number(p.record.commitment.transactionId.split("@")[1].split(".")[0]) * 1000;
  requireRecord(start <= now, "PAYMENT_NOT_YET_VALID");
}
async function readTwice(store: Store, id: string, ownerId: string, clock: () => number) {
  const key = currentPaymentRecordKey(id); label.parse(ownerId);
  const raw = await store.get(key); clock();
  requireRecord(raw !== null, "PAYMENT_RECORD_MISSING");
  const p = parse(raw);
  requireRecord(p.record.operationId === id && p.record.ownerId === ownerId, "PAYMENT_OWNER_OR_OPERATION_MISMATCH");
  const fresh = parse(await store.get(key));
  requireRecord(isDeepStrictEqual(p,fresh), "PAYMENT_RECORD_CHANGED");
  requireRecord(p.record.revokedAtMs === null || p.record.revokedAtMs <= clock(), "FUTURE_PAYMENT_REVOCATION");
  clock(); return p;
}
/** Read-only current source for the canonical resolver. This does not validate
 * Ledger, provider policy, eligibility or signature and cannot authorize execution. */
export async function loadCurrentPaymentRecord(input: CurrentPaymentRecordDependencies & { operationId: string; authenticatedOwnerId: string }) {
  const id = operationId.parse(input.operationId), owner = label.parse(input.authenticatedOwnerId);
  return bounded(input,async(store,clock)=>{const p=await readTwice(store,id,owner,clock);requireCurrent(p,clock());return freeze(p.record);});
}
/** Revoked/expired facts remain available only for authenticated reconciliation.
 * Consumers must never use this entry point as current payment authority. */
export async function readPaymentRecordForReconciliation(input: CurrentPaymentRecordDependencies & { operationId: string; authenticatedOwnerId: string }) {
  const id=operationId.parse(input.operationId),owner=label.parse(input.authenticatedOwnerId);
  return bounded(input,async(store,clock)=>freeze({record:(await readTwice(store,id,owner,clock)).record,currentAuthority:false as const}));
}
/** Authenticated server context only, never deserialize publisher identity from
 * request JSON. Validator MUST independently check current authority and exact
 * candidate economics/roles/quote; it cannot rely on this yet-unpublished record.
 * It receives a frozen candidate and digest, and must throw when not authorized.
 */
export async function publishCurrentPaymentRecord(input: CurrentPaymentRecordDependencies & {
  publisher: AuthenticatedPaymentPublisher; expectedVersion: "0"; candidate: CurrentRecoveryPaymentRecord;
  validateCurrentCandidate: (input: { publisher: Readonly<AuthenticatedPaymentPublisher>; candidate: Readonly<CurrentRecoveryPaymentRecord>; candidateDigest: string }) => Promise<CurrentPaymentCandidateValidation>;
}) {
  const publisher=freeze(publisherSchema.parse(structuredClone(input.publisher))), candidate=freeze(parseRecord(structuredClone(input.candidate)));
  requireRecord(input.expectedVersion === "0" && candidate.version === "1" && candidate.revokedAtMs === null, "INITIAL_PAYMENT_REQUIRED");
  requireRecord(candidate.ownerId === publisher.ownerId, "PUBLISHER_OWNER_MISMATCH");
  const validate=input.validateCurrentCandidate;
  requireRecord(typeof validate === "function", "CURRENT_CANDIDATE_VALIDATOR_REQUIRED");
  const candidateDigest=currentPaymentCandidateDigest(candidate);
  let dispatched=false;
  try { return await bounded(input,async(store,clock)=>{
    const check = async () => { const v=validationSchema.parse(structuredClone(await validate(freeze({publisher,candidate,candidateDigest}))));
      requireRecord(candidate.commitment.expiresAtMs <= v.validUntilMs && clock() < v.validUntilMs,"CANDIDATE_VALIDATION_EXPIRED");return v; };
    const first=await check(), key=currentPaymentRecordKey(candidate.operationId), raw=await store.get(key);
    clock(); if(raw!==null){parse(raw);throw new CurrentPaymentRecordDenied("PAYMENT_OPERATION_ALREADY_EXISTS");}
    const second=await check();requireRecord(isDeepStrictEqual(first,second),"CANDIDATE_AUTHORITY_CHANGED");
    const persisted=parse({schemaVersion:1,publisher,validation:first,record:candidate});requireCurrent(persisted,clock());
    dispatched=true;
    const result=await store.eval(CREATE,[key],[encode(persisted),Math.min(candidate.commitment.expiresAtMs,first.validUntilMs)]);
    if(result===0){dispatched=false;throw new CurrentPaymentRecordDenied("PAYMENT_OPERATION_ALREADY_EXISTS");}
    if(result===-1){dispatched=false;throw new CurrentPaymentRecordDenied("PAYMENT_EXPIRED_AT_COMMIT");}
    requireRecord(result===1,"UNEXPECTED_PAYMENT_STORAGE_RESULT");
    const third=await check();requireRecord(isDeepStrictEqual(first,third),"CANDIDATE_AUTHORITY_CHANGED");
    const read=await readTwice(store,candidate.operationId,publisher.ownerId,clock);
    requireRecord(isDeepStrictEqual(read,persisted),"PUBLISHED_PAYMENT_CHANGED");requireCurrent(read,clock());
    return freeze(read.record);
  }); } catch(error){if(dispatched)throw new CurrentPaymentRecordDenied("PUBLISH_OUTCOME_UNKNOWN_RELOAD_REQUIRED");throw error;}
}
/** Irreversible owner-bound CAS. Revocation remains available after payment or
 * Ledger expiry. It cannot alter signed intent or recreate an absent operation. */
export async function revokeCurrentPaymentRecord(input: CurrentPaymentRecordDependencies & { operationId: string; authenticatedOwnerId: string; expectedVersion: string }) {
  const id=operationId.parse(input.operationId),owner=label.parse(input.authenticatedOwnerId),expected=version.parse(input.expectedVersion);
  let dispatched=false;
  try { return await bounded(input,async(store,clock)=>{
    const p=await readTwice(store,id,owner,clock);
    requireRecord(p.record.version===expected,"PAYMENT_VERSION_CONFLICT");
    requireRecord(p.record.revokedAtMs===null && p.record.version==="1","PAYMENT_ALREADY_REVOKED");
    const next={...p,record:{...p.record,version:"2",revokedAtMs:0}},key=currentPaymentRecordKey(id);
    dispatched=true;const result=await store.eval(REVOKE,[key],[encode(p),JSON.stringify(next)]);
    if(result===null){dispatched=false;throw new CurrentPaymentRecordDenied("PAYMENT_VERSION_CONFLICT");}
    const revoked=parse(result);
    requireRecord(revoked.record.revokedAtMs!==null && isDeepStrictEqual({...revoked,record:{...revoked.record,version:"1",revokedAtMs:null}},p),"REVOKED_PAYMENT_CHANGED");
    const read=await readTwice(store,id,owner,clock);requireRecord(isDeepStrictEqual(read,revoked),"REVOKED_PAYMENT_CHANGED");
    return freeze(read.record);
  }); }catch(error){if(dispatched)throw new CurrentPaymentRecordDenied("REVOKE_OUTCOME_UNKNOWN_RELOAD_REQUIRED");throw error;}
}
