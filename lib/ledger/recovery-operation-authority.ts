import { isDeepStrictEqual } from "node:util";
import { getAddress } from "ethers";
import { hashRecoveryMandate, validateRecoveryMandate, type RecoveryMandate } from "./recovery-mandate.ts";
import { activeRecoveryMandateKey, type ActiveRecoveryMandateRecord, type RecoveryMandateActivationRevalidator } from "./recovery-mandate-state.ts";
import { readCurrentMandate, serializeCurrentMandate } from "./recovery-mandate-current.ts";
import { readRecoveryOperation, type RecoveryOperation } from "./recovery-mandate-operation.ts";
import { recoveryMandateAuthorityVersionKey, type RecoveryMandateAuthorityBoundaryStore } from "./recovery-mandate-authority-boundary.ts";

function requireValid(value: boolean, reason: string): asserts value { if (!value) throw new Error(reason); }
function parseActive(raw: unknown) {
  const value = typeof raw === "string" ? JSON.parse(raw) : structuredClone(raw);
  requireValid(!!value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).sort().join(",") === "activatedAt,authorityStateVersion,currentGeneration,digest,mandate,ownerId,recoveredSignerAddress,state", "Malformed owned active mandate");
  const r = value as ActiveRecoveryMandateRecord;
  requireValid(r.state === "active" && typeof r.activatedAt === "string" && Number.isFinite(Date.parse(r.activatedAt)) && Date.parse(r.activatedAt) >= 0 && Date.parse(r.activatedAt) <= Date.now() &&
    Number.isSafeInteger(r.authorityStateVersion) && r.authorityStateVersion >= 0 && r.authorityStateVersion % 2 === 0 &&
    Number.isSafeInteger(r.currentGeneration) && r.currentGeneration > 0, "Invalid owned active mandate state");
  requireValid(!!r.mandate && typeof r.mandate === "object" && Object.keys(r.mandate).sort().join(",") ===
    "agentId,allowedAction,bookingSerial,bookingTokenId,cancellationAllowed,expiresAt,issuedAt,ledgerSignerAddress,mandateId,minimumRecoveryAtomicUnits,nonce,ownerId,settlementAsset", "Malformed owned signed fields");
  for (const field of [r.mandate.bookingSerial,r.mandate.minimumRecoveryAtomicUnits,r.mandate.expiresAt,r.mandate.issuedAt]) {
    requireValid(typeof field === "string" && /^(0|[1-9][0-9]*)$/.test(field), "Noncanonical owned mandate integer");
  }
  const m = validateRecoveryMandate({ ...r.mandate, bookingSerial: BigInt(r.mandate.bookingSerial),
    minimumRecoveryAtomicUnits: BigInt(r.mandate.minimumRecoveryAtomicUnits), expiresAt: BigInt(r.mandate.expiresAt), issuedAt: BigInt(r.mandate.issuedAt) });
  requireValid(r.digest === hashRecoveryMandate(m) && getAddress(r.recoveredSignerAddress) === m.ledgerSignerAddress,
    "Owned mandate digest or enrolled signer changed");
  return { record: r, mandate: m };
}

/** Explicit read under an EXISTING operation's owned odd version. The ordinary
 * stable loader remains unchanged. This function never masks an odd version,
 * acquires/releases a lock, claims a lease or grants an effect permit. */
export async function loadRecoveryOperationAuthority(input: {
  store: RecoveryMandateAuthorityBoundaryStore;
  operation: RecoveryOperation;
  /** Trusted fresh holder/status/provider/enrollment check, never request JSON. */
  revalidateMutableAuthority: RecoveryMandateActivationRevalidator;
}) {
  requireValid(!!input && typeof input.revalidateMutableAuthority === "function" && !!input.store, "Owned authority dependencies required");
  const expected = structuredClone(input.operation), store = input.store;
  const revalidate = input.revalidateMutableAuthority;
  const startedAt = Date.now();
  requireValid(Number.isSafeInteger(startedAt) && startedAt >= 0, "Owned authority clock invalid");
  const time = () => {
    const value = Date.now();
    requireValid(Number.isSafeInteger(value) && value >= startedAt && value - startedAt < 5000, "Owned authority observation expired");
    return Math.floor(value / 1000);
  };
  const assertOwned = async () => {
    const current = await readRecoveryOperation({ store, operationId: expected.operationId, ownerId: expected.ownerId, intentHash: expected.intentHash });
    requireValid(current !== null && isDeepStrictEqual(current, expected), "Operation lease/fence/revision/intent changed");
    const seconds = time();
    requireValid((current.phase === "claimed" || current.phase === "effect-started") && seconds < current.leaseUntil && seconds < current.expiresAt,
      "Operation does not own current unexpired authority");
    const rawVersion = await store.get(recoveryMandateAuthorityVersionKey(BigInt(current.serial)));
    requireValid((typeof rawVersion === "number" && Number.isSafeInteger(rawVersion) || typeof rawVersion === "string" && /^(0|[1-9][0-9]*)$/.test(rawVersion)) &&
      String(rawVersion) === String(current.ownedVersion), "Operation no longer owns its odd authority version");
    const pointer = await readCurrentMandate(store, current.token, BigInt(current.serial));
    requireValid(pointer !== null && pointer.state === "active" && serializeCurrentMandate(pointer) === current.pointer, "Owned operation current mandate changed");
    requireValid(time() < current.leaseUntil && time() < current.expiresAt, "Owned operation expired during reads");
    return current;
  };
  await assertOwned();
  const first = parseActive(await store.get(activeRecoveryMandateKey(expected.mandateId)));
  const { record, mandate } = first;
  requireValid(record.ownerId === expected.ownerId && mandate.ownerId === expected.ownerId && mandate.mandateId === expected.mandateId &&
    mandate.bookingTokenId === expected.token && mandate.bookingSerial.toString() === expected.serial && mandate.agentId === expected.agentId &&
    mandate.allowedAction === expected.action && mandate.allowedAction === "resale" && mandate.cancellationAllowed === false &&
    mandate.settlementAsset === "0.0.429274" && mandate.minimumRecoveryAtomicUnits > BigInt(0) && mandate.minimumRecoveryAtomicUnits <= BigInt("9223372036854775807") &&
    mandate.bookingSerial <= BigInt(Number.MAX_SAFE_INTEGER) && mandate.expiresAt <= BigInt(Math.floor(Number.MAX_SAFE_INTEGER / 1000)) &&
    Number(mandate.expiresAt) === expected.expiresAt && mandate.issuedAt <= BigInt(time()) && mandate.expiresAt > BigInt(time()) &&
    record.authorityStateVersion === expected.stableVersion, "Operation and active mandate differ");
  const pointer = JSON.parse(expected.pointer);
  requireValid(record.digest === pointer.digest && record.currentGeneration === pointer.generation, "Owned mandate generation/digest changed");
  await assertOwned();
  await revalidate(Object.freeze({ ...mandate }));
  await assertOwned();
  const last = parseActive(await store.get(activeRecoveryMandateKey(expected.mandateId)));
  requireValid(isDeepStrictEqual(first, last), "Owned active mandate changed during revalidation");
  await assertOwned();
  // No await after the final time/expiry check. Caller must still use the
  // atomic begin-effect transition and recheck intent at its actual boundary.
  requireValid(mandate.expiresAt > BigInt(time()), "Owned mandate expired");
  return Object.freeze({ record: Object.freeze({ ...record, mandate: Object.freeze({ ...record.mandate }) }),
    mandate: Object.freeze({ ...mandate }), operation: Object.freeze({ ...expected }), executionPermit: false as const });
}
