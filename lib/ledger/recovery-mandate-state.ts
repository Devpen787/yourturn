import type {
  RecoveryMandate,
  RecoveryMandateAuthorizationExpectation,
  RecoveryMandateReplayStore,
  VerifiedRecoveryMandate,
} from "./recovery-mandate.ts";
import {
  authorizeRecoveryMandateOnce,
  validateRecoveryMandate,
} from "./recovery-mandate.ts";

const BIGINT_ZERO = BigInt(0);
const MAX_SAFE_INTEGER_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

export type RecoveryMandateStateStore = {
  get<T = unknown>(key: string): Promise<T | null>;
  set(
    key: string,
    value: string,
    options?: { nx?: boolean; ex?: number }
  ): Promise<unknown>;
};

type SerializedRecoveryMandate = Omit<
  RecoveryMandate,
  "bookingSerial" | "minimumRecoveryAtomicUnits" | "expiresAt" | "issuedAt"
> & {
  bookingSerial: string;
  minimumRecoveryAtomicUnits: string;
  expiresAt: string;
  issuedAt: string;
};

export type PreparedRecoveryMandateRecord = {
  state: "prepared";
  ownerId: string;
  preparedAt: string;
  mandate: SerializedRecoveryMandate;
};

export type ActiveRecoveryMandateRecord = {
  state: "active";
  ownerId: string;
  activatedAt: string;
  mandate: SerializedRecoveryMandate;
  digest: string;
  recoveredSignerAddress: string;
};

export type RecoveryMandateActivationRevalidator = (
  mandate: RecoveryMandate
) => Promise<void>;

function assertSafeTtl(expiresAt: bigint, nowUnixSeconds: bigint): number {
  const ttl = expiresAt - nowUnixSeconds;
  if (ttl <= BIGINT_ZERO) {
    throw new Error("Recovery mandate must still be valid when stored");
  }
  if (ttl > MAX_SAFE_INTEGER_BIGINT) {
    throw new Error("Recovery mandate state TTL exceeds safe Redis range");
  }
  return Number(ttl);
}

function serializeMandate(mandate: RecoveryMandate): SerializedRecoveryMandate {
  const value = validateRecoveryMandate({ ...mandate });
  return {
    ...value,
    bookingSerial: value.bookingSerial.toString(),
    minimumRecoveryAtomicUnits: value.minimumRecoveryAtomicUnits.toString(),
    expiresAt: value.expiresAt.toString(),
    issuedAt: value.issuedAt.toString(),
  };
}

function deserializeMandate(mandate: SerializedRecoveryMandate): RecoveryMandate {
  return validateRecoveryMandate({
    ...mandate,
    bookingSerial: BigInt(mandate.bookingSerial),
    minimumRecoveryAtomicUnits: BigInt(mandate.minimumRecoveryAtomicUnits),
    expiresAt: BigInt(mandate.expiresAt),
    issuedAt: BigInt(mandate.issuedAt),
  });
}

function parseStoredRecord<T>(raw: T | string | null): T | null {
  if (raw == null) return null;
  if (typeof raw === "string") return JSON.parse(raw) as T;
  return raw as T;
}

function expectationFromPrepared(
  mandate: RecoveryMandate
): RecoveryMandateAuthorizationExpectation {
  return {
    mandateId: mandate.mandateId,
    ownerId: mandate.ownerId,
    agentId: mandate.agentId,
    bookingTokenId: mandate.bookingTokenId,
    bookingSerial: mandate.bookingSerial,
    allowedAction: mandate.allowedAction,
    minimumRecoveryAtomicUnits: mandate.minimumRecoveryAtomicUnits,
    settlementAsset: mandate.settlementAsset,
    expiresAt: mandate.expiresAt,
    nonce: mandate.nonce,
    cancellationAllowed: mandate.cancellationAllowed,
    issuedAt: mandate.issuedAt,
  };
}

export function preparedRecoveryMandateKey(mandateId: string): string {
  return `bookedrights:ledger:mandate-prepared:${mandateId}`;
}

export function activeRecoveryMandateKey(mandateId: string): string {
  return `bookedrights:ledger:mandate-active:${mandateId}`;
}

export async function storePreparedRecoveryMandate(input: {
  store: RecoveryMandateStateStore;
  mandate: RecoveryMandate;
  ownerId: string;
  nowUnixSeconds?: bigint;
}): Promise<void> {
  const nowUnixSeconds =
    input.nowUnixSeconds ?? BigInt(Math.floor(Date.now() / 1000));
  const mandate = validateRecoveryMandate({ ...input.mandate });
  if (mandate.ownerId !== input.ownerId) {
    throw new Error("Prepared recovery mandate owner does not match session owner");
  }
  const ttlSeconds = assertSafeTtl(mandate.expiresAt, nowUnixSeconds);
  const record: PreparedRecoveryMandateRecord = {
    state: "prepared",
    ownerId: input.ownerId,
    preparedAt: new Date(Number(nowUnixSeconds) * 1000).toISOString(),
    mandate: serializeMandate(mandate),
  };
  const stored = await input.store.set(
    preparedRecoveryMandateKey(mandate.mandateId),
    JSON.stringify(record),
    { nx: true, ex: ttlSeconds }
  );
  if (stored !== "OK") {
    throw new Error("Recovery mandate id already exists or could not be prepared");
  }
}

export async function loadPreparedRecoveryMandate(input: {
  store: RecoveryMandateStateStore;
  mandateId: string;
  ownerId: string;
}): Promise<{ record: PreparedRecoveryMandateRecord; mandate: RecoveryMandate }> {
  const raw = await input.store.get<PreparedRecoveryMandateRecord | string>(
    preparedRecoveryMandateKey(input.mandateId)
  );
  const record = parseStoredRecord<PreparedRecoveryMandateRecord>(raw);
  if (!record || record.state !== "prepared") {
    throw new Error("Prepared recovery mandate was not found or has expired");
  }
  if (record.ownerId !== input.ownerId) {
    throw new Error("Prepared recovery mandate does not belong to this session owner");
  }
  const mandate = deserializeMandate(record.mandate);
  if (mandate.ownerId !== input.ownerId || mandate.mandateId !== input.mandateId) {
    throw new Error("Prepared recovery mandate record failed owner/id integrity check");
  }
  return { record, mandate };
}

export async function activatePreparedRecoveryMandate(input: {
  store: RecoveryMandateStateStore;
  replayStore: RecoveryMandateReplayStore;
  mandateId: string;
  ownerId: string;
  signature: string;
  revalidateMutableAuthority: RecoveryMandateActivationRevalidator;
  nowUnixSeconds?: bigint;
}): Promise<{
  verified: VerifiedRecoveryMandate;
  active: ActiveRecoveryMandateRecord;
}> {
  const nowUnixSeconds =
    input.nowUnixSeconds ?? BigInt(Math.floor(Date.now() / 1000));
  const { mandate } = await loadPreparedRecoveryMandate({
    store: input.store,
    mandateId: input.mandateId,
    ownerId: input.ownerId,
  });

  if (typeof input.revalidateMutableAuthority !== "function") {
    throw new Error(
      "Recovery mandate activation requires live booking authority revalidation"
    );
  }

  // Do not burn a valid one-shot signature if the booking is already stale at
  // the start of activation. The caller must re-read holder/status/policy/listing
  // from authoritative product state here rather than trust prepared data.
  await input.revalidateMutableAuthority(mandate);

  const verified = await authorizeRecoveryMandateOnce({
    mandate,
    signature: input.signature,
    expectedSignerAddress: mandate.ledgerSignerAddress,
    expected: expectationFromPrepared(mandate),
    replayStore: input.replayStore,
    nowUnixSeconds,
  });

  // Replay is now consumed. Re-read the mutable predicates again immediately
  // before final authority creation so a state transition racing signature
  // verification cannot silently promote stale prepared authority. If this
  // second check fails, no active record is written and the consumed mandate
  // cannot be retried; the owner must prepare/sign a fresh mandate.
  await input.revalidateMutableAuthority(verified.mandate);

  const ttlSeconds = assertSafeTtl(mandate.expiresAt, nowUnixSeconds);
  const active: ActiveRecoveryMandateRecord = {
    state: "active",
    ownerId: input.ownerId,
    activatedAt: new Date(Number(nowUnixSeconds) * 1000).toISOString(),
    mandate: serializeMandate(mandate),
    digest: verified.digest,
    recoveredSignerAddress: verified.recoveredSignerAddress,
  };

  // Replay is consumed before the active record is written. If this write fails,
  // the request fails closed and the owner must prepare/sign a fresh mandate;
  // we never retry the already-consumed signature into an ambiguous authority state.
  const stored = await input.store.set(
    activeRecoveryMandateKey(mandate.mandateId),
    JSON.stringify(active),
    { nx: true, ex: ttlSeconds }
  );
  if (stored !== "OK") {
    throw new Error("Recovery mandate activation state already exists or could not be stored");
  }

  return { verified, active };
}

export async function loadActiveRecoveryMandate(input: {
  store: RecoveryMandateStateStore;
  mandateId: string;
  ownerId: string;
}): Promise<{ record: ActiveRecoveryMandateRecord; mandate: RecoveryMandate }> {
  const raw = await input.store.get<ActiveRecoveryMandateRecord | string>(
    activeRecoveryMandateKey(input.mandateId)
  );
  const record = parseStoredRecord<ActiveRecoveryMandateRecord>(raw);
  if (!record || record.state !== "active") {
    throw new Error("Active recovery mandate was not found or has expired");
  }
  if (record.ownerId !== input.ownerId) {
    throw new Error("Active recovery mandate does not belong to this session owner");
  }
  const mandate = deserializeMandate(record.mandate);
  if (mandate.ownerId !== input.ownerId || mandate.mandateId !== input.mandateId) {
    throw new Error("Active recovery mandate record failed owner/id integrity check");
  }
  return { record, mandate };
}
