import { createHash } from "node:crypto";

export type OwnerPolicy = {
  resaleAllowed: boolean;
  ownerRoyaltyPercent: number;
  releaseAllowed: boolean;
  waitlistEnabled: boolean;
  scheduleAutomationEnabled: boolean;
  version: number;
  label: string;
};

export type OwnerPolicySnapshot = OwnerPolicy & {
  snapshotId: string;
  capturedAt: string;
  source: "owner_policy";
};

export const DEFAULT_OWNER_POLICY: OwnerPolicy = {
  resaleAllowed: true,
  ownerRoyaltyPercent: 10,
  releaseAllowed: true,
  waitlistEnabled: true,
  scheduleAutomationEnabled: true,
  version: 1,
  label: "Provider recovery policy v1",
};

export function normalizeOwnerPolicy(
  input?: Partial<OwnerPolicy> | null
): OwnerPolicy {
  const royalty =
    typeof input?.ownerRoyaltyPercent === "number" &&
    Number.isFinite(input.ownerRoyaltyPercent)
      ? Math.min(50, Math.max(0, input.ownerRoyaltyPercent))
      : DEFAULT_OWNER_POLICY.ownerRoyaltyPercent;
  return {
    resaleAllowed: input?.resaleAllowed ?? DEFAULT_OWNER_POLICY.resaleAllowed,
    ownerRoyaltyPercent: royalty,
    releaseAllowed: input?.releaseAllowed ?? DEFAULT_OWNER_POLICY.releaseAllowed,
    waitlistEnabled:
      input?.waitlistEnabled ?? DEFAULT_OWNER_POLICY.waitlistEnabled,
    scheduleAutomationEnabled:
      input?.scheduleAutomationEnabled ??
      DEFAULT_OWNER_POLICY.scheduleAutomationEnabled,
    version:
      typeof input?.version === "number" && Number.isFinite(input.version)
        ? Math.max(1, Math.trunc(input.version))
        : DEFAULT_OWNER_POLICY.version,
    label: input?.label?.trim() || DEFAULT_OWNER_POLICY.label,
  };
}

export function captureOwnerPolicySnapshot(input?: Partial<OwnerPolicy> | null): OwnerPolicySnapshot {
  const policy = normalizeOwnerPolicy(input);
  const capturedAt = new Date().toISOString();
  const hash = createHash("sha256")
    .update(JSON.stringify({ ...policy, capturedAt: capturedAt.slice(0, 10) }))
    .digest("hex")
    .slice(0, 12);
  return {
    ...policy,
    capturedAt,
    snapshotId: `policy_v${policy.version}_${hash}`,
    source: "owner_policy",
  };
}

export function policySnapshotLabel(
  snapshot?: OwnerPolicySnapshot | null
): string {
  if (!snapshot) return "No booked-time policy snapshot";
  return `${snapshot.label} (${snapshot.snapshotId})`;
}
