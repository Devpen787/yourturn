import type { RecoveryMandateAuthorityBoundaryStore } from "./recovery-mandate-authority-boundary.ts";
import { recoveryMandateAuthorityVersionKey } from "./recovery-mandate-authority-boundary.ts";

export type CurrentMandate = {
  schemaVersion: 1;
  generation: number;
  state: "active" | "revoked";
  ownerId: string;
  mandateId: string;
  digest: string;
};
const MAX_GENERATION = Number.MAX_SAFE_INTEGER - 2;
export function currentMandateKey(token: string, serial: bigint): string {
  if (!/^\d+\.\d+\.\d+$/.test(token) || serial <= BigInt(0)) throw new Error("Invalid current mandate booking identity");
  return `bookedrights:ledger:mandate-current:${token}:${serial}`;
}
export function parseCurrentMandate(raw: unknown): CurrentMandate | null {
  if (raw === null) return null;
  const value = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).sort().join(",") !== "digest,generation,mandateId,ownerId,schemaVersion,state" ||
      value.schemaVersion !== 1 || !Number.isSafeInteger(value.generation) || value.generation < 1 || value.generation > MAX_GENERATION ||
      !["active", "revoked"].includes(value.state) ||
      ![value.ownerId, value.mandateId].every(v => typeof v === "string" && v.length > 0 && v.length <= 200) ||
      typeof value.digest !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value.digest)) throw new Error("Invalid current mandate pointer");
  return value as CurrentMandate;
}
export const serializeCurrentMandate = (pointer: CurrentMandate | null) => pointer === null ? "" : JSON.stringify({
  schemaVersion: pointer.schemaVersion, generation: pointer.generation, state: pointer.state,
  ownerId: pointer.ownerId, mandateId: pointer.mandateId, digest: pointer.digest,
});
export async function readCurrentMandate(store: Pick<RecoveryMandateAuthorityBoundaryStore, "get">, token: string, serial: bigint) {
  return parseCurrentMandate(await store.get(currentMandateKey(token, serial)));
}

// The current pointer intentionally has no TTL: expired authority must not
// resurrect a formerly prepared predecessor. The signed active record expires.
export const SWAP_CURRENT_MANDATE_SCRIPT = `
local expiry = tonumber(ARGV[3])
local now = tonumber(redis.call("TIME")[1])
if not expiry or expiry <= now then return -4 end
local version = tonumber(redis.call("GET", KEYS[1]) or "0")
if not version or version ~= tonumber(ARGV[1]) or version % 2 ~= 0 then return -1 end
local predecessor = redis.call("GET", KEYS[3]) or ""
if predecessor ~= ARGV[4] then return -3 end
if redis.call("EXISTS", KEYS[2]) ~= 0 then return 0 end
redis.call("SET", KEYS[2], ARGV[2], "EXAT", ARGV[3])
redis.call("SET", KEYS[3], ARGV[5])
return 1
`;
export async function swapCurrentMandate(input: {
  store: RecoveryMandateAuthorityBoundaryStore;
  token: string; serial: bigint; expectedVersion: number;
  predecessor: CurrentMandate | null; next: CurrentMandate;
  activeKey: string; activeValue: string; expiresAtUnixSeconds: number;
}) {
  parseCurrentMandate(input.next);
  if (input.predecessor !== null) parseCurrentMandate(input.predecessor);
  if (input.next.state !== "active" || input.next.generation !== (input.predecessor?.generation ?? 0) + 1 ||
      !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0 || input.expectedVersion > MAX_GENERATION || input.expectedVersion % 2 !== 0 ||
      !Number.isSafeInteger(input.expiresAtUnixSeconds) || input.expiresAtUnixSeconds <= 0) throw new Error("Invalid current mandate swap");
  const result = await input.store.eval(SWAP_CURRENT_MANDATE_SCRIPT,
    [recoveryMandateAuthorityVersionKey(input.serial), input.activeKey, currentMandateKey(input.token, input.serial)],
    [input.expectedVersion, input.activeValue, input.expiresAtUnixSeconds, serializeCurrentMandate(input.predecessor), serializeCurrentMandate(input.next)]);
  if (result === -4) throw new Error("Recovery mandate expired before atomic activation");
  if (result === -1) throw new Error("Booking authority state changed after final validation; active mandate was not created");
  if (result === 0) throw new Error("Recovery mandate activation state already exists or could not be stored");
  if (result !== 1) throw new Error("Current mandate changed or atomic replacement failed");
}

const REVOKE_CURRENT_SCRIPT = `
local current = redis.call("GET", KEYS[1]) or ""
if current == ARGV[2] then return 2 end
if current ~= ARGV[1] then return -1 end
redis.call("SET", KEYS[1], ARGV[2])
return 1
`;
/** Caller supplies its independently authenticated owner; no HTTP endpoint is
 * added by this primitive. Exact stale IDs cannot revoke a replacement. */
export async function revokeCurrentMandate(input: {
  store: RecoveryMandateAuthorityBoundaryStore; token: string; serial: bigint;
  ownerId: string; mandateId: string; digest: string;
}) {
  const current = await readCurrentMandate(input.store, input.token, input.serial);
  if (!current || current.ownerId !== input.ownerId || current.mandateId !== input.mandateId || current.digest !== input.digest) throw new Error("Current mandate revocation identity mismatch");
  if (current.state === "revoked") return current;
  const revoked: CurrentMandate = { ...current, state: "revoked" };
  const result = await input.store.eval(REVOKE_CURRENT_SCRIPT, [currentMandateKey(input.token, input.serial)],
    [serializeCurrentMandate(current), serializeCurrentMandate(revoked)]);
  if (result !== 1 && result !== 2) throw new Error("Current mandate changed before revocation");
  return revoked;
}
