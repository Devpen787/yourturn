import { createHash, randomUUID } from "node:crypto";

import { getRedis } from "./redis";

export type RecoveryOperationAction = "create_listing" | "cancel_release";
export type RecoveryOperationStatus =
  | "pending"
  | "running"
  | "reconciling"
  | "completed";
export type RecoveryOperationStepState =
  | "pending"
  | "running"
  | "succeeded"
  | "reconciled";

export type RecoveryOperationEvidence = {
  kind: "transaction_receipt" | "hcs_event" | "mirror_state" | "local_state";
  value: string;
};

export type RecoveryOperationStep = {
  state: RecoveryOperationStepState;
  startedAt?: string;
  completedAt?: string;
  receipt?: string | null;
  evidence?: RecoveryOperationEvidence;
};

export type RecoveryOperationRecord = {
  version: 1;
  revision: number;
  operationId: string;
  identityHash: string;
  parametersHash: string;
  action: RecoveryOperationAction;
  actorAccountId: string;
  tokenId: string;
  serial: number;
  delegatedAgentAddress: string;
  /**
   * Evidence of the first server-authorized grant that opened this operation.
   * This is intentionally NOT part of operation identity: a fresh exact-scoped
   * authorization may resume the same durable intent after the AgentKit nonce
   * has already been consumed. Final integration replaces this scaffolding with
   * the canonical activated Ledger Recovery Mandate projection/id.
   */
  initialAuthorizationGrantId: string;
  parameters: Record<string, string | number | boolean | null>;
  status: RecoveryOperationStatus;
  steps: Record<string, RecoveryOperationStep>;
  result?: unknown;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

export type RecoveryOperationIdentityInput = {
  action: RecoveryOperationAction;
  actorAccountId: string;
  tokenId: string;
  serial: number;
  delegatedAgentAddress: string;
  parameters: Record<string, string | number | boolean | null>;
};

export type RecoveryOperationFenceReason =
  | "missing_lease_context"
  | "lease_lost"
  | "record_missing"
  | "revision_mismatch";

export class RecoveryOperationFenceError extends Error {
  readonly reason: RecoveryOperationFenceReason;

  constructor(reason: RecoveryOperationFenceReason) {
    super(`Recovery operation durable write rejected: ${reason}`);
    this.name = "RecoveryOperationFenceError";
    this.reason = reason;
  }
}

export const RECOVERY_OPERATION_LEASE_SECONDS = 10 * 60;
const RECOVERY_OPERATION_PREFIX = "bookedrights:world-recovery:operation";
const RECOVERY_OPERATION_LEASE_PREFIX = "bookedrights:world-recovery:lease";
const recoveryOperationLeaseTokens = new WeakMap<RecoveryOperationRecord, string>();

const FENCED_SAVE_SCRIPT = `
local activeLease = redis.call('get', KEYS[2])
if activeLease ~= ARGV[1] then
  return -1
end
local current = redis.call('get', KEYS[1])
if not current then
  return -2
end
local decoded = cjson.decode(current)
local currentRevision = tonumber(decoded.revision or 0)
if currentRevision ~= tonumber(ARGV[2]) then
  return -3
end
redis.call('set', KEYS[1], ARGV[3])
return 1
`;

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stableValue(item)])
    );
  }
  return value;
}

function stableJson(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

function digest(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function operationKey(operationId: string): string {
  return `${RECOVERY_OPERATION_PREFIX}:${operationId}`;
}

function leaseKey(operationId: string): string {
  return `${RECOVERY_OPERATION_LEASE_PREFIX}:${operationId}`;
}

function parseRecord(raw: unknown): RecoveryOperationRecord | null {
  if (!raw) return null;
  const parsed =
    typeof raw === "string"
      ? (JSON.parse(raw) as RecoveryOperationRecord)
      : (raw as RecoveryOperationRecord);
  if (!Number.isSafeInteger(parsed.revision) || parsed.revision < 0) {
    parsed.revision = 0;
  }
  return parsed;
}

export function createRecoveryOperationIdentity(
  input: RecoveryOperationIdentityInput
): {
  operationId: string;
  identityHash: string;
  parametersHash: string;
} {
  const normalized = {
    action: input.action,
    actorAccountId: input.actorAccountId.trim(),
    tokenId: input.tokenId.trim(),
    serial: input.serial,
    delegatedAgentAddress: input.delegatedAgentAddress.trim().toLowerCase(),
    parameters: input.parameters,
  };
  const identityHash = digest(normalized);
  return {
    operationId: `wr_${identityHash}`,
    identityHash,
    parametersHash: digest(input.parameters),
  };
}

export async function loadRecoveryOperation(
  operationId: string
): Promise<RecoveryOperationRecord | null> {
  const raw = await getRedis().get(operationKey(operationId));
  return parseRecord(raw);
}

export async function createRecoveryOperationIfAbsent(input: {
  identity: RecoveryOperationIdentityInput;
  initialAuthorizationGrantId: string;
  stepNames: string[];
}): Promise<{ record: RecoveryOperationRecord; created: boolean }> {
  const identity = createRecoveryOperationIdentity(input.identity);
  const now = new Date().toISOString();
  const record: RecoveryOperationRecord = {
    version: 1,
    revision: 0,
    operationId: identity.operationId,
    identityHash: identity.identityHash,
    parametersHash: identity.parametersHash,
    action: input.identity.action,
    actorAccountId: input.identity.actorAccountId.trim(),
    tokenId: input.identity.tokenId.trim(),
    serial: input.identity.serial,
    delegatedAgentAddress: input.identity.delegatedAgentAddress.trim().toLowerCase(),
    initialAuthorizationGrantId: input.initialAuthorizationGrantId,
    parameters: input.identity.parameters,
    status: "pending",
    steps: Object.fromEntries(
      input.stepNames.map((name) => [name, { state: "pending" as const }])
    ),
    createdAt: now,
    updatedAt: now,
  };

  const redis = getRedis();
  const created = await redis.set(operationKey(record.operationId), JSON.stringify(record), {
    nx: true,
  });
  if (created === "OK") return { record, created: true };

  const existing = await loadRecoveryOperation(record.operationId);
  if (!existing) {
    throw new Error("Recovery operation creation raced but no durable record exists");
  }
  if (existing.identityHash !== record.identityHash) {
    throw new Error("Recovery operation identity collision");
  }
  return { record: existing, created: false };
}

export async function saveRecoveryOperation(
  record: RecoveryOperationRecord
): Promise<void> {
  const leaseToken = recoveryOperationLeaseTokens.get(record);
  if (!leaseToken) {
    throw new RecoveryOperationFenceError("missing_lease_context");
  }

  const expectedRevision = record.revision;
  const nextRevision = expectedRevision + 1;
  const updatedAt = new Date().toISOString();
  const nextRecord: RecoveryOperationRecord = {
    ...record,
    revision: nextRevision,
    updatedAt,
  };

  const result = await getRedis().eval(
    FENCED_SAVE_SCRIPT,
    [operationKey(record.operationId), leaseKey(record.operationId)],
    [leaseToken, String(expectedRevision), JSON.stringify(nextRecord)]
  );
  const code = Number(result);
  if (code !== 1) {
    if (code === -1) throw new RecoveryOperationFenceError("lease_lost");
    if (code === -2) throw new RecoveryOperationFenceError("record_missing");
    throw new RecoveryOperationFenceError("revision_mismatch");
  }

  record.revision = nextRevision;
  record.updatedAt = updatedAt;
}

export async function acquireRecoveryOperationLease(
  operation: RecoveryOperationRecord
): Promise<string | null> {
  const token = randomUUID();
  const result = await getRedis().set(leaseKey(operation.operationId), token, {
    nx: true,
    ex: RECOVERY_OPERATION_LEASE_SECONDS,
  });
  if (result !== "OK") return null;
  recoveryOperationLeaseTokens.set(operation, token);
  return token;
}

export async function assertRecoveryOperationLease(
  operationId: string,
  token: string
): Promise<void> {
  const current = await getRedis().get<string>(leaseKey(operationId));
  if (current !== token) {
    throw new RecoveryOperationFenceError("lease_lost");
  }
}

export async function releaseRecoveryOperationLease(
  operationId: string,
  token: string
): Promise<void> {
  const key = leaseKey(operationId);
  await getRedis().eval(
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
    [key],
    [token]
  );
}
