import { createHash } from "node:crypto";
import type { ProviderEnrollment, ProviderScope } from "./published-provider-policy.ts";

export type PublicProviderEnrollmentRecord = ProviderEnrollment & {
  kind: "provider"; expiresAtMs: number; revokedAtMs: number | null;
};
export type PublicAgentEnrollmentRecord = {
  kind: "agent"; ownerId: string; internalAgentId: string; version: string;
  holderAccountId: string; worldRequester: string; hederaExecutorAccountId: string;
  resourceUri: string; expiresAtMs: number; revokedAtMs: number | null;
};
export type PublicEnrollmentManifest = {
  schemaVersion: 1; version: string; issuedAtMs: number;
  expiresAtMs: number; revokedAtMs: number | null;
  records: (PublicProviderEnrollmentRecord | PublicAgentEnrollmentRecord)[];
};
export class PublicEnrollmentDenied extends Error {
  constructor(public readonly code: string) { super(code); this.name = "PublicEnrollmentDenied"; }
}
const fail = (code: string): never => { throw new PublicEnrollmentDenied(code); };
const MAX_INT64 = BigInt("9223372036854775807");
const MAX_DATE = 8640000000000000;
function obj(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail("INVALID_MANIFEST_SHAPE");
  return raw as Record<string, unknown>;
}
function keys(raw: object, fields: string[]) {
  if (Object.keys(raw).sort().join(",") !== fields.sort().join(",")) fail("INVALID_MANIFEST_SHAPE");
}
function identity(raw: unknown): string {
  if (typeof raw !== "string" || !/^[A-Za-z0-9._:@-]{1,128}$/.test(raw)) return fail("INVALID_PUBLIC_IDENTITY");
  return raw;
}
function version(raw: unknown): string {
  if (typeof raw !== "string" || !/^[1-9][0-9]{0,18}$/.test(raw) || BigInt(raw) > MAX_INT64) return fail("INVALID_ENROLLMENT_VERSION");
  return raw;
}
function account(raw: unknown): string {
  if (typeof raw !== "string" || !/^0\.0\.[1-9][0-9]{0,18}$/.test(raw) || BigInt(raw.slice(4)) > MAX_INT64) return fail("INVALID_HEDERA_ENTITY");
  return raw;
}
function serial(raw: unknown): number {
  if (!Number.isSafeInteger(raw) || (raw as number) < 1) return fail("INVALID_BOOKING_SERIAL");
  return raw as number;
}
function time(raw: unknown): number {
  if (!Number.isSafeInteger(raw) || (raw as number) <= 0 || (raw as number) > MAX_DATE) return fail("INVALID_ENROLLMENT_TIME");
  return raw as number;
}
function revoked(raw: unknown, now: number): number | null {
  if (raw === null) return null;
  const t = time(raw);
  if (t > now) return fail("FUTURE_REVOCATION_UNSUPPORTED");
  return t;
}
function resource(raw: unknown): string {
  if (typeof raw !== "string" || raw.length > 2048) return fail("INVALID_AGENT_RESOURCE");
  try {
    const url = new URL(raw), local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (!((url.protocol === "https:") || (url.protocol === "http:" && local)) ||
      url.username || url.password || url.search || url.hash ||
      url.pathname !== "/api/agent/confirm" || url.href !== raw) return fail("INVALID_AGENT_RESOURCE");
    return raw;
  } catch { return fail("INVALID_AGENT_RESOURCE"); }
}
function evm(raw: unknown): string {
  if (typeof raw !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(raw) || /^0x0{40}$/.test(raw)) return fail("INVALID_WORLD_REQUESTER");
  return raw.toLowerCase();
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
const providerKey = (s: ProviderScope) => JSON.stringify(["provider", s.providerId, s.tokenId, s.serial]);
const agentKey = (ownerId: string, internalAgentId: string) => JSON.stringify(["agent", ownerId, internalAgentId]);
const scope = (raw: ProviderScope): ProviderScope => {
  keys(obj(raw), ["providerId", "tokenId", "serial"]);
  return { providerId: identity(raw.providerId), tokenId: account(raw.tokenId), serial: serial(raw.serial) };
};

/** Server-owned immutable configuration input only. There is deliberately no
 * request-body manifest, environment loader, provisioning route, defaults or
 * live-update API here. Construct a new instance only from owner-reviewed
 * server configuration. Registered identity facts do not grant execution.
 * This in-process view cannot detect deployment rollback or authenticate who
 * supplied a manifest; those remain the provisioning boundary's obligations.
 */
export function createPublicEnrollmentRegistry(trustedManifest: PublicEnrollmentManifest, options: { now?: () => number } = {}) {
  const now = options.now ?? Date.now;
  if (typeof now !== "function") fail("INVALID_CLOCK");
  const initialNow = time(now());
  let lastObservedNow = initialNow;
  let raw: PublicEnrollmentManifest;
  try { raw = structuredClone(trustedManifest); } catch { return fail("INVALID_MANIFEST_SHAPE"); }
  keys(obj(raw), ["schemaVersion", "version", "issuedAtMs", "expiresAtMs", "revokedAtMs", "records"]);
  if (raw.schemaVersion !== 1 || !Array.isArray(raw.records) || raw.records.length > 256) fail("INVALID_MANIFEST_SHAPE");
  const manifestVersion = version(raw.version), issuedAtMs = time(raw.issuedAtMs), expiresAtMs = time(raw.expiresAtMs);
  if (issuedAtMs > initialNow || expiresAtMs <= issuedAtMs) fail("INVALID_MANIFEST_VALIDITY");
  const manifestRevokedAtMs = revoked(raw.revokedAtMs, initialNow);
  const providers = new Map<string, Readonly<PublicProviderEnrollmentRecord>>();
  const agents = new Map<string, Readonly<PublicAgentEnrollmentRecord>>();
  const bookingOwners = new Set<string>();
  const normalized: (PublicProviderEnrollmentRecord | PublicAgentEnrollmentRecord)[] = [];
  for (const item of raw.records) {
    const value = obj(item), recordVersion = version(value.version), expiry = time(value.expiresAtMs);
    const revokedAtMs = revoked(value.revokedAtMs, initialNow);
    if (expiry > expiresAtMs) fail("RECORD_OUTLIVES_MANIFEST");
    if (value.kind === "provider") {
      keys(value, ["kind", "providerId", "tokenId", "serial", "issuerId", "version", "expiresAtMs", "revokedAtMs"]);
      const s = scope({ providerId: value.providerId as string, tokenId: value.tokenId as string, serial: value.serial as number });
      const r: PublicProviderEnrollmentRecord = { kind: "provider", ...s, issuerId: identity(value.issuerId), version: recordVersion, expiresAtMs: expiry, revokedAtMs };
      const key = providerKey(s), bookingKey = JSON.stringify([s.tokenId, s.serial]);
      // Even revoked/expired duplicate entries cannot become an order-dependent
      // fallback. One manifest assigns each booking to at most one provider.
      if (providers.has(key) || bookingOwners.has(bookingKey)) fail("DUPLICATE_OR_CONFLICTING_PROVIDER_ENROLLMENT");
      bookingOwners.add(bookingKey); providers.set(key, freeze(r)); normalized.push(r);
    } else if (value.kind === "agent") {
      keys(value, ["kind", "ownerId", "internalAgentId", "version", "holderAccountId", "worldRequester", "hederaExecutorAccountId", "resourceUri", "expiresAtMs", "revokedAtMs"]);
      const r: PublicAgentEnrollmentRecord = { kind: "agent", ownerId: identity(value.ownerId), internalAgentId: identity(value.internalAgentId), version: recordVersion,
        holderAccountId: account(value.holderAccountId), worldRequester: evm(value.worldRequester), hederaExecutorAccountId: account(value.hederaExecutorAccountId),
        resourceUri: resource(value.resourceUri), expiresAtMs: expiry, revokedAtMs };
      if (r.holderAccountId === r.hederaExecutorAccountId) fail("HOLDER_EXECUTOR_MUST_DIFFER");
      const key = agentKey(r.ownerId, r.internalAgentId);
      if (agents.has(key)) fail("DUPLICATE_OR_CONFLICTING_AGENT_ENROLLMENT");
      agents.set(key, freeze(r)); normalized.push(r);
    } else fail("UNKNOWN_ENROLLMENT_KIND");
  }
  const snapshot = freeze({ schemaVersion: 1, version: manifestVersion, issuedAtMs, expiresAtMs, revokedAtMs: manifestRevokedAtMs, records: normalized });
  const provenance = freeze({ source: "SERVER_PROVISIONED_PUBLIC_MANIFEST" as const, manifestVersion,
    manifestDigest: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex"), executionAuthority: false as const });
  function live(record: { expiresAtMs: number; revokedAtMs: number | null } | undefined) {
    const current = time(now());
    // Once this instance observes expiry, wall-clock rollback cannot reactivate
    // it. This is local monotonic observation, not durable deployment fencing.
    if (current < lastObservedNow) fail("ENROLLMENT_CLOCK_REGRESSED");
    lastObservedNow = current;
    return manifestRevokedAtMs === null && current < expiresAtMs && record !== undefined && record.revokedAtMs === null && current < record.expiresAtMs;
  }
  return Object.freeze({
    provenance,
    async resolveProvider(input: ProviderScope): Promise<Readonly<ProviderEnrollment> | null> {
      const s = scope(input), record = providers.get(providerKey(s));
      if (!live(record)) return null;
      return freeze({ ...s, issuerId: record!.issuerId, version: record!.version });
    },
    async resolveAgent(input: { ownerId: string; internalAgentId: string }) {
      keys(obj(input), ["ownerId", "internalAgentId"]);
      const key = agentKey(identity(input.ownerId), identity(input.internalAgentId)), record = agents.get(key);
      if (!live(record)) return null;
      return freeze({ ...record!, provenance });
    },
  });
}
