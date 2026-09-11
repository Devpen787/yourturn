export type RecoveryMandateAuthorityBoundaryStore = {
  get<T = unknown>(key: string): Promise<T | null>;
  eval<T = unknown>(
    script: string,
    keys: string[],
    args: Array<string | number>
  ): Promise<T>;
};

export class RecoveryMandateAuthorityBoundaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecoveryMandateAuthorityBoundaryError";
  }
}

const MAX_SAFE_VERSION = Number.MAX_SAFE_INTEGER - 2;

const BEGIN_MUTATION_SCRIPT = `
local raw = redis.call("GET", KEYS[1])
local current = tonumber(raw or "0")
if not current then
  return -2
end
if (current % 2) ~= 0 then
  return -1
end
local next = current + 1
redis.call("SET", KEYS[1], tostring(next))
return next
`;

const END_MUTATION_SCRIPT = `
local raw = redis.call("GET", KEYS[1])
local current = tonumber(raw or "0")
local expected = tonumber(ARGV[1])
if not current or not expected or current ~= expected or (current % 2) == 0 then
  return -1
end
local next = current + 1
redis.call("SET", KEYS[1], tostring(next))
return next
`;

const STORE_ACTIVE_IF_VERSION_UNCHANGED_SCRIPT = `
local raw = redis.call("GET", KEYS[1])
local current = tonumber(raw or "0")
local expected = tonumber(ARGV[1])
if not current or not expected or current ~= expected or (current % 2) ~= 0 then
  return -1
end
local stored = redis.call("SET", KEYS[2], ARGV[2], "NX", "EX", ARGV[3])
if not stored then
  return 0
end
return 1
`;

function normalizeSerial(serial: number | bigint): string {
  const value = typeof serial === "bigint" ? serial : BigInt(serial);
  if (value <= BigInt(0)) {
    throw new RecoveryMandateAuthorityBoundaryError(
      "Recovery mandate authority boundary requires a positive booking serial"
    );
  }
  return value.toString();
}

function parseVersion(raw: unknown): number {
  if (raw == null) return 0;
  const value =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number(raw)
        : Number(String(raw));
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_SAFE_VERSION) {
    throw new RecoveryMandateAuthorityBoundaryError(
      "Recovery mandate authority state version is invalid"
    );
  }
  return value;
}

function parseEvalInteger(raw: unknown, label: string): number {
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isSafeInteger(value)) {
    throw new RecoveryMandateAuthorityBoundaryError(
      `Recovery mandate authority ${label} returned an invalid Redis result`
    );
  }
  return value;
}

export function recoveryMandateAuthorityVersionKey(
  bookingSerial: number | bigint
): string {
  return `bookedrights:ledger:authority-version:${normalizeSerial(bookingSerial)}`;
}

/**
 * Even versions are stable. Odd versions mean a product mutation that can
 * invalidate Recovery Mandate authority is currently in flight. Missing state
 * is the initial stable version 0.
 */
export async function readStableRecoveryMandateAuthorityVersion(input: {
  store: RecoveryMandateAuthorityBoundaryStore;
  bookingSerial: number | bigint;
}): Promise<number> {
  const version = parseVersion(
    await input.store.get(recoveryMandateAuthorityVersionKey(input.bookingSerial))
  );
  if (version % 2 !== 0) {
    throw new RecoveryMandateAuthorityBoundaryError(
      "Booking authority state is changing; prepare or activate a fresh mandate after the mutation finishes"
    );
  }
  return version;
}

export async function beginRecoveryMandateAuthorityMutation(input: {
  store: RecoveryMandateAuthorityBoundaryStore;
  bookingSerial: number | bigint;
}): Promise<number> {
  const result = parseEvalInteger(
    await input.store.eval(
      BEGIN_MUTATION_SCRIPT,
      [recoveryMandateAuthorityVersionKey(input.bookingSerial)],
      []
    ),
    "mutation begin"
  );
  if (result === -1) {
    throw new RecoveryMandateAuthorityBoundaryError(
      "Another booking authority mutation is already in progress"
    );
  }
  if (result < 0 || result > MAX_SAFE_VERSION || result % 2 === 0) {
    throw new RecoveryMandateAuthorityBoundaryError(
      "Booking authority mutation could not enter a serialized state"
    );
  }
  return result;
}

export async function endRecoveryMandateAuthorityMutation(input: {
  store: RecoveryMandateAuthorityBoundaryStore;
  bookingSerial: number | bigint;
  mutationVersion: number;
}): Promise<number> {
  const result = parseEvalInteger(
    await input.store.eval(
      END_MUTATION_SCRIPT,
      [recoveryMandateAuthorityVersionKey(input.bookingSerial)],
      [input.mutationVersion]
    ),
    "mutation end"
  );
  if (result < 0 || result > MAX_SAFE_VERSION || result % 2 !== 0) {
    throw new RecoveryMandateAuthorityBoundaryError(
      "Booking authority mutation did not leave a stable serialized state"
    );
  }
  return result;
}

/**
 * Serialize product mutations that can change holder/status/provider-policy or
 * listing predicates. The version flips odd before side effects and returns to
 * a new even value afterward. A crash fails closed by leaving an odd version;
 * it never silently re-opens stale mandate activation.
 */
export async function withRecoveryMandateAuthorityMutation<T>(input: {
  store: RecoveryMandateAuthorityBoundaryStore;
  bookingSerial: number | bigint;
  mutate: () => Promise<T>;
}): Promise<T> {
  const mutationVersion = await beginRecoveryMandateAuthorityMutation(input);
  let result: T;
  let mutationError: unknown;
  try {
    result = await input.mutate();
  } catch (error) {
    mutationError = error;
  }

  try {
    await endRecoveryMandateAuthorityMutation({
      store: input.store,
      bookingSerial: input.bookingSerial,
      mutationVersion,
    });
  } catch (boundaryError) {
    // If cleanup cannot prove the same mutation still owns the odd version,
    // fail closed. An odd/stale version blocks mandate activation until a
    // deliberate operator repair rather than guessing that state is stable.
    throw boundaryError;
  }

  if (mutationError) throw mutationError;
  return result!;
}

/**
 * Atomically compare the exact stable product-state version observed around
 * final live validation and create the active authority record. A relevant
 * mutation that begins after validation flips the version odd (or advances it)
 * before this script can run, so the active SET NX cannot succeed on stale
 * state.
 */
export async function storeActiveRecoveryMandateIfAuthorityVersionUnchanged(input: {
  store: RecoveryMandateAuthorityBoundaryStore;
  bookingSerial: number | bigint;
  expectedStableVersion: number;
  activeKey: string;
  activeValue: string;
  ttlSeconds: number;
}): Promise<void> {
  if (
    !Number.isSafeInteger(input.expectedStableVersion) ||
    input.expectedStableVersion < 0 ||
    input.expectedStableVersion % 2 !== 0
  ) {
    throw new RecoveryMandateAuthorityBoundaryError(
      "Recovery mandate final authority write requires a stable state version"
    );
  }
  const result = parseEvalInteger(
    await input.store.eval(
      STORE_ACTIVE_IF_VERSION_UNCHANGED_SCRIPT,
      [
        recoveryMandateAuthorityVersionKey(input.bookingSerial),
        input.activeKey,
      ],
      [input.expectedStableVersion, input.activeValue, input.ttlSeconds]
    ),
    "conditional authority write"
  );
  if (result === -1) {
    throw new RecoveryMandateAuthorityBoundaryError(
      "Booking authority state changed after final validation; active mandate was not created"
    );
  }
  if (result === 0) {
    throw new RecoveryMandateAuthorityBoundaryError(
      "Recovery mandate activation state already exists or could not be stored"
    );
  }
  if (result !== 1) {
    throw new RecoveryMandateAuthorityBoundaryError(
      "Recovery mandate conditional authority write returned an unexpected result"
    );
  }
}
