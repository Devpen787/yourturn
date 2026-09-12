import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { getRedis } from "../store/redis.ts";

export type ProviderScope = { providerId: string; tokenId: string; serial: number };
export type ProviderEnrollment = ProviderScope & { issuerId: string; version: string };
export type ProviderPolicy = {
  state: "ALLOW" | "BLOCK" | "REVIEW";
  minimumRecoveryAtomicUnits: string | null;
  royalty: { numerator: string; denominator: string; collectorAccountId: string | null };
  transferCutoffMs: number;
  validUntilMs: number;
};
export type PublishedProviderPolicy = ProviderScope & ProviderPolicy & {
  schemaVersion: 1; version: number; issuerId: string;
  enrollmentVersion: string; enrollmentFingerprint: string; publishedAtMs: number;
};
type PolicyStore = { get: (key: string) => Promise<unknown>; eval: (script: string, keys: string[], args: (string | number)[]) => Promise<unknown> };
type Dependencies = {
  /** Trusted server enrollment resolver, never request-body ownership claims. */
  resolveEnrollment: (scope: ProviderScope) => Promise<ProviderEnrollment | null>;
  /** Tests only. The runtime default uses the existing production Redis client. */
  store?: PolicyStore;
  now?: () => number;
};
const MAX_VERSION = Number.MAX_SAFE_INTEGER - 1;
const MAX_DATE = 8640000000000000;
const MAX_VALIDITY_MS = 366 * 24 * 60 * 60 * 1000;
const INT64_MAX = BigInt("9223372036854775807");
export class ProviderPolicyDenied extends Error {
  constructor(public readonly code: string) { super(code); this.name = "ProviderPolicyDenied"; }
}
function fail(code: string): never { throw new ProviderPolicyDenied(code); }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail("INVALID_POLICY_SHAPE");
  return value as Record<string, unknown>;
}
function keys(value: object, expected: string[]) {
  if (Object.keys(value).sort().join(",") !== expected.sort().join(",")) fail("INVALID_POLICY_SHAPE");
}
function label(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^[A-Za-z0-9._:@-]{1,128}$/.test(value)) fail("INVALID_IDENTITY");
}
function account(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^0\.0\.[1-9][0-9]{0,18}$/.test(value) || BigInt(value.slice(4)) > INT64_MAX) fail("INVALID_ACCOUNT_OR_TOKEN");
}
function atomic(value: unknown, positive = false): asserts value is string {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value) || BigInt(value) > INT64_MAX || (positive && value === "0")) fail("INVALID_ATOMIC_AMOUNT");
}
function time(value: unknown): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0 || (value as number) > MAX_DATE) fail("INVALID_POLICY_TIME");
}
function scope(value: ProviderScope) {
  keys(object(value), ["providerId", "tokenId", "serial"]);
  label(value.providerId); account(value.tokenId);
  if (!Number.isSafeInteger(value.serial) || value.serial < 1) fail("INVALID_BOOKING_SERIAL");
  return { ...value };
}
function enrollment(value: unknown, expected: ProviderScope): ProviderEnrollment {
  const v = object(value);
  keys(v, ["providerId", "tokenId", "serial", "issuerId", "version"]);
  label(v.issuerId); label(v.version);
  if (!isDeepStrictEqual(scope({ providerId: v.providerId as string, tokenId: v.tokenId as string, serial: v.serial as number }), expected)) fail("ENROLLMENT_SCOPE_MISMATCH");
  return { ...expected, issuerId: v.issuerId, version: v.version };
}
function fingerprint(e: ProviderEnrollment) {
  return createHash("sha256").update(JSON.stringify([e.providerId, e.tokenId, e.serial, e.issuerId, e.version])).digest("hex");
}
function policy(value: ProviderPolicy) {
  keys(object(value), ["state", "minimumRecoveryAtomicUnits", "royalty", "transferCutoffMs", "validUntilMs"]);
  if (!["ALLOW", "BLOCK", "REVIEW"].includes(value.state)) fail("INVALID_POLICY_STATE");
  if (value.minimumRecoveryAtomicUnits !== null) atomic(value.minimumRecoveryAtomicUnits);
  const r = object(value.royalty); keys(r, ["numerator", "denominator", "collectorAccountId"]);
  atomic(r.numerator); atomic(r.denominator, true);
  const n = BigInt(r.numerator), d = BigInt(r.denominator);
  if (n > d) fail("INVALID_ROYALTY_FRACTION");
  if (n === BigInt(0) && r.collectorAccountId !== null) fail("ZERO_ROYALTY_COLLECTOR_MUST_BE_NULL");
  if (n > BigInt(0)) account(r.collectorAccountId);
  time(value.transferCutoffMs); time(value.validUntilMs);
  if (value.transferCutoffMs > value.validUntilMs) fail("INVALID_POLICY_TIME");
  return structuredClone(value);
}
const recordKeys = ["schemaVersion", "version", "providerId", "tokenId", "serial", "issuerId", "enrollmentVersion", "enrollmentFingerprint", "publishedAtMs", "state", "minimumRecoveryAtomicUnits", "royalty", "transferCutoffMs", "validUntilMs"];
function parse(raw: unknown): PublishedProviderPolicy {
  try {
    const r = object(typeof raw === "string" ? JSON.parse(raw) : raw);
    keys(r, recordKeys);
    const record = r as unknown as PublishedProviderPolicy;
    if (record.schemaVersion !== 1 || !Number.isSafeInteger(record.version) || record.version < 1 || record.version > MAX_VERSION) fail("INVALID_POLICY_VERSION");
    const s = scope({ providerId: record.providerId, tokenId: record.tokenId, serial: record.serial });
    label(record.issuerId); label(record.enrollmentVersion); time(record.publishedAtMs);
    const e = { ...s, issuerId: record.issuerId, version: record.enrollmentVersion };
    if (record.enrollmentFingerprint !== fingerprint(e)) fail("POLICY_ENROLLMENT_CORRUPT");
    policy({ state: record.state, minimumRecoveryAtomicUnits: record.minimumRecoveryAtomicUnits, royalty: record.royalty, transferCutoffMs: record.transferCutoffMs, validUntilMs: record.validUntilMs });
    if (record.publishedAtMs >= record.transferCutoffMs || record.validUntilMs - record.publishedAtMs > MAX_VALIDITY_MS) fail("INVALID_POLICY_TIME");
    return structuredClone(record);
  } catch (error) {
    if (error instanceof ProviderPolicyDenied) throw error;
    return fail("PUBLISHED_POLICY_CORRUPT");
  }
}
export function publishedProviderPolicyKey(input: ProviderScope) {
  const s = scope(input);
  return `bookedrights:provider:published:v1:${s.providerId}:${s.tokenId}:${s.serial}`;
}
const sameEnrollment = (a: ProviderEnrollment, b: ProviderEnrollment) => {
  if (!isDeepStrictEqual(a, b)) fail("PROVIDER_ENROLLMENT_CHANGED");
};
function checkBinding(record: PublishedProviderPolicy, e: ProviderEnrollment) {
  if (record.enrollmentFingerprint !== fingerprint(e) || record.issuerId !== e.issuerId || record.enrollmentVersion !== e.version ||
    record.providerId !== e.providerId || record.tokenId !== e.tokenId || record.serial !== e.serial) fail("PUBLISHED_POLICY_ENROLLMENT_MISMATCH");
}
function currentTime(now: () => number) { const n = now(); time(n); return n; }
function checkCurrent(record: PublishedProviderPolicy, n: number) {
  if (record.publishedAtMs > n || n >= record.validUntilMs || n >= record.transferCutoffMs) fail("PUBLISHED_POLICY_EXPIRED_OR_FUTURE");
}

/** Exact predecessor comparison includes every field; no record TTL ever erases
 * the version. Redis TIME guards expiry before SET. Enrollment is an external
 * trusted callback, not atomically locked by this script. */
const PUBLISH_SCRIPT = `
local current = redis.call('GET', KEYS[1])
local function equal(a,b)
  if type(a) ~= type(b) then return false end
  if type(a) ~= 'table' then return a == b end
  for k,v in pairs(a) do if not equal(v,b[k]) then return false end end
  for k,_ in pairs(b) do if a[k] == nil then return false end end
  return true
end
local expectedVersion = tonumber(ARGV[1])
if current then
  local ok, previous = pcall(cjson.decode,current)
  local expectedOk, expected = pcall(cjson.decode,ARGV[2])
  if not ok or not expectedOk or not equal(previous,expected) or previous.version ~= expectedVersion then return -1 end
elseif expectedVersion ~= 0 or ARGV[2] ~= '' then return -1 end
local ok, next = pcall(cjson.decode,ARGV[3])
if not ok or next.version ~= expectedVersion+1 then return -2 end
local clock = redis.call('TIME')
local now = tonumber(clock[1])*1000 + math.floor(tonumber(clock[2])/1000)
if next.transferCutoffMs <= now or next.validUntilMs <= now or next.validUntilMs-now > tonumber(ARGV[4]) then return -3 end
next.publishedAtMs = now
-- Preserve caller's canonical integer strings and safe integer fields: Redis
-- cjson.encode defaults to 14 significant digits, insufficient for safe JS IDs.
local encoded = string.gsub(ARGV[3], '"publishedAtMs":%d+', '"publishedAtMs":' .. string.format('%.0f',now), 1)
redis.call('SET',KEYS[1],encoded)
return encoded
`;

export async function publishProviderPolicy(input: Dependencies & {
  issuerId: string; scope: ProviderScope; expectedVersion: number; policy: ProviderPolicy;
}): Promise<PublishedProviderPolicy> {
  label(input.issuerId);
  const issuerId = input.issuerId, s = scope(structuredClone(input.scope)), draft = policy(structuredClone(input.policy));
  if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0 || input.expectedVersion >= MAX_VERSION) fail("INVALID_EXPECTED_VERSION");
  const expectedVersion = input.expectedVersion, resolve = input.resolveEnrollment;
  if (typeof resolve !== "function") fail("TRUSTED_ENROLLMENT_REQUIRED");
  const now = input.now ?? Date.now, store = input.store ?? getRedis();
  const readEnrollment = async () => enrollment(await resolve({ ...s }), s);
  const first = await readEnrollment();
  if (first.issuerId !== issuerId) fail("ISSUER_NOT_ENROLLED_OWNER");
  const raw = await store.get(publishedProviderPolicyKey(s));
  sameEnrollment(first, await readEnrollment());
  const previous = raw === null ? null : parse(raw);
  if (previous) checkBinding(previous, first);
  if ((previous?.version ?? 0) !== expectedVersion) fail("PUBLISHED_POLICY_VERSION_CONFLICT");
  const next: PublishedProviderPolicy = { schemaVersion: 1, version: expectedVersion + 1, ...s, issuerId,
    enrollmentVersion: first.version, enrollmentFingerprint: fingerprint(first), publishedAtMs: currentTime(now), ...draft };
  parse(next); checkCurrent(next, currentTime(now));
  sameEnrollment(first, await readEnrollment());
  // A timeout after EVAL dispatch can mean committed. Never retry blindly or
  // restore a predecessor; reload the durable version before another publish.
  let result: unknown;
  try { result = await store.eval(PUBLISH_SCRIPT, [publishedProviderPolicyKey(s)], [expectedVersion, previous ? JSON.stringify(previous) : "", JSON.stringify(next), MAX_VALIDITY_MS]); }
  catch { return fail("PUBLISH_OUTCOME_UNKNOWN_RELOAD_REQUIRED"); }
  if (result === -1) fail("PUBLISHED_POLICY_VERSION_CONFLICT");
  if (result === -2) fail("PUBLISH_INVALID");
  if (result === -3) fail("POLICY_EXPIRED_AT_COMMIT");
  let committed: PublishedProviderPolicy;
  try {
    committed = parse(result); checkBinding(committed, first);
    if (!isDeepStrictEqual({ ...committed, publishedAtMs: next.publishedAtMs }, next)) fail("PUBLISH_RESULT_MISMATCH");
    sameEnrollment(first, await readEnrollment());
    checkCurrent(committed, currentTime(now));
  } catch { return fail("PUBLISH_OUTCOME_UNKNOWN_RELOAD_REQUIRED"); }
  return committed;
}

export async function loadPublishedProviderPolicy(input: Dependencies & { scope: ProviderScope }): Promise<PublishedProviderPolicy> {
  const s = scope(structuredClone(input.scope)), resolve = input.resolveEnrollment;
  if (typeof resolve !== "function") fail("TRUSTED_ENROLLMENT_REQUIRED");
  const store = input.store ?? getRedis(), now = input.now ?? Date.now;
  const readEnrollment = async () => enrollment(await resolve({ ...s }), s);
  const first = await readEnrollment();
  const raw = await store.get(publishedProviderPolicyKey(s));
  sameEnrollment(first, await readEnrollment());
  if (raw === null) fail("PUBLISHED_POLICY_MISSING");
  const record = parse(raw); checkBinding(record, first); checkCurrent(record, currentTime(now));
  const fresh = await store.get(publishedProviderPolicyKey(s));
  if (!isDeepStrictEqual(record, parse(fresh))) fail("PUBLISHED_POLICY_CHANGED_DURING_READ");
  sameEnrollment(first, await readEnrollment());
  checkCurrent(record, currentTime(now));
  return record;
}
