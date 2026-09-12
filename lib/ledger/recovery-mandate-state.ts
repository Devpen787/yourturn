import { readCurrentMandate, parseCurrentMandate, serializeCurrentMandate, swapCurrentMandate, type CurrentMandate } from "./recovery-mandate-current.ts";
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
import {
  readStableRecoveryMandateAuthorityVersion,
  type RecoveryMandateAuthorityBoundaryStore,
} from "./recovery-mandate-authority-boundary.ts";

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
  expectedCurrentMandate: CurrentMandate | null;
  mandate: SerializedRecoveryMandate;
};

export type ActiveRecoveryMandateRecord = {
  state: "active";
  ownerId: string;
  activatedAt: string;
  mandate: SerializedRecoveryMandate;
  digest: string;
  recoveredSignerAddress: string;
  authorityStateVersion: number;
  currentGeneration: number;
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

function assertRecordedAuthorityStateVersion(version: number): void {
  if (!Number.isSafeInteger(version) || version < 0 || version % 2 !== 0) {
    throw new Error(
      "Active recovery mandate has an invalid captured authority state version"
    );
  }
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
    expectedCurrentMandate: await readCurrentMandate(input.store, mandate.bookingTokenId, mandate.bookingSerial),
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
  if (!("expectedCurrentMandate" in record)) throw new Error("Prepared mandate lacks current-predecessor metadata; prepare a fresh mandate");
  parseCurrentMandate(record.expectedCurrentMandate);
  return { record, mandate };
}

export async function activatePreparedRecoveryMandate(input: {
  store: RecoveryMandateStateStore;
  authorityBoundaryStore: RecoveryMandateAuthorityBoundaryStore;
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
  const { mandate, record: prepared } = await loadPreparedRecoveryMandate({
    store: input.store,
    mandateId: input.mandateId,
    ownerId: input.ownerId,
  });

  if (typeof input.revalidateMutableAuthority !== "function") {
    throw new Error(
      "Recovery mandate activation requires live booking authority revalidation"
    );
  }

  const current = await readCurrentMandate(input.store, mandate.bookingTokenId, mandate.bookingSerial);
  if (current?.mandateId !== mandate.mandateId && serializeCurrentMandate(current) !== serializeCurrentMandate(prepared.expectedCurrentMandate)) throw new Error("Current mandate changed since preparation");

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

  // Capture a stable serialization version before the final live read. Every
  // relevant booking/listing mutation flips this version odd before side
  // effects and advances it to a new even version afterward. If a mutation is
  // already in flight, activation fails closed here.
  const authorityStateVersion =
    await readStableRecoveryMandateAuthorityVersion({
      store: input.authorityBoundaryStore,
      bookingSerial: verified.mandate.bookingSerial,
    });

  // Replay is now consumed. Re-read the mutable predicates while tied to the
  // captured stable version. The final active write below is an atomic
  // compare-version + SET NX, so a mutation beginning after this read cannot
  // leave an active authority record based on the stale state.
  await input.revalidateMutableAuthority(verified.mandate);

  assertSafeTtl(mandate.expiresAt, input.nowUnixSeconds ?? BigInt(Math.floor(Date.now() / 1000)));
  const active: ActiveRecoveryMandateRecord = {
    state: "active",
    ownerId: input.ownerId,
    activatedAt: new Date(Number(nowUnixSeconds) * 1000).toISOString(),
    mandate: serializeMandate(mandate),
    digest: verified.digest,
    recoveredSignerAddress: verified.recoveredSignerAddress,
    authorityStateVersion,
    currentGeneration: (prepared.expectedCurrentMandate?.generation ?? 0) + 1,
  };

  // This Lua-backed compare-and-set is the final SEC-LEDGER-005 boundary. It
  // checks the exact stable version observed around final validation and writes
  // active authority in the same Redis atomic operation. Any relevant mutation
  // that starts after validation changes the version before this SET NX can run.
  await swapCurrentMandate({
    store: input.authorityBoundaryStore,
    token: mandate.bookingTokenId, serial: mandate.bookingSerial,
    expectedVersion: authorityStateVersion,
    predecessor: prepared.expectedCurrentMandate,
    next: { schemaVersion: 1, generation: active.currentGeneration, state: "active", ownerId: input.ownerId, mandateId: mandate.mandateId, digest: verified.digest },
    activeKey: activeRecoveryMandateKey(mandate.mandateId),
    activeValue: JSON.stringify(active),
    expiresAtUnixSeconds: Number(mandate.expiresAt),
  });

  return { verified, active };
}

/**
 * Load an active mandate only when the mutable product authority that justified
 * activation is still current. The captured version is checked on both sides
 * of a fresh holder/status/provider-policy/listing read. A serialized mutation
 * that completed after activation, or that races this validation, therefore
 * makes the active record unusable instead of silently reviving stale authority.
 *
 * Downstream recovery code must use this guarded loader at the authority-
 * consuming boundary; reading `mandate-active:*` directly is not authorization.
 */
export async function loadActiveRecoveryMandate(input: {
  store: RecoveryMandateStateStore;
  authorityBoundaryStore: RecoveryMandateAuthorityBoundaryStore;
  mandateId: string;
  ownerId: string;
  revalidateMutableAuthority: RecoveryMandateActivationRevalidator;
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
  if (!input.authorityBoundaryStore) {
    throw new Error(
      "Active recovery mandate loading requires the authoritative booking state boundary"
    );
  }
  if (typeof input.revalidateMutableAuthority !== "function") {
    throw new Error(
      "Active recovery mandate loading requires live booking authority revalidation"
    );
  }

  const assertCurrent = async () => {
    const current = await readCurrentMandate(input.store, mandate.bookingTokenId, mandate.bookingSerial);
    if (!current || current.state !== "active" || current.ownerId !== input.ownerId || current.mandateId !== mandate.mandateId || current.digest !== record.digest || current.generation !== record.currentGeneration) throw new Error("Mandate is not the unique current authority");
    if (mandate.minimumRecoveryAtomicUnits <= BIGINT_ZERO || mandate.expiresAt <= BigInt(Math.floor(Date.now() / 1000))) throw new Error("Current mandate is expired or has no positive minimum");
  };
  await assertCurrent();
  assertRecordedAuthorityStateVersion(record.authorityStateVersion);

  const authorityStateVersionBefore =
    await readStableRecoveryMandateAuthorityVersion({
      store: input.authorityBoundaryStore,
      bookingSerial: mandate.bookingSerial,
    });
  if (authorityStateVersionBefore !== record.authorityStateVersion) {
    throw new Error(
      "Active recovery mandate is stale because booking authority state changed after activation"
    );
  }

  await input.revalidateMutableAuthority(mandate);

  const authorityStateVersionAfter =
    await readStableRecoveryMandateAuthorityVersion({
      store: input.authorityBoundaryStore,
      bookingSerial: mandate.bookingSerial,
    });
  if (
    authorityStateVersionAfter !== record.authorityStateVersion ||
    authorityStateVersionAfter !== authorityStateVersionBefore
  ) {
    throw new Error(
      "Booking authority state changed while validating the active recovery mandate"
    );
  }

  await assertCurrent();
  return { record, mandate };
}
