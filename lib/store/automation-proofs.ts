import type { ConciergeAgentTrace, ScheduleAutomationProof } from "@/lib/types/automation";
import type { HederaAgentProof } from "@/lib/hedera-agent-kit/agent-proof";
import { getRedis, REDIS_KEYS } from "./redis";

export type AutomationProofRecord = {
  key: string;
  serial: number;
  actor: "guestA" | "guestB";
  scheduleProof: ScheduleAutomationProof;
  agentTrace: ConciergeAgentTrace;
  agentProof?: HederaAgentProof;
  createdAt: string;
};

function proofKey(serial: number, action: string): string {
  return `${serial}:${action}`;
}

function parseProofs(raw: unknown): AutomationProofRecord[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as AutomationProofRecord[];
    } catch {
      return [];
    }
  }
  return raw as AutomationProofRecord[];
}

export async function loadAutomationProofs(): Promise<AutomationProofRecord[]> {
  const redis = getRedis();
  return parseProofs(await redis.get(REDIS_KEYS.automationProofs));
}

export async function saveAutomationProofs(
  records: AutomationProofRecord[]
): Promise<void> {
  const redis = getRedis();
  await redis.set(REDIS_KEYS.automationProofs, JSON.stringify(records));
}

export async function upsertAutomationProof(
  record: Omit<AutomationProofRecord, "key">,
  action = "scheduled_payment"
): Promise<AutomationProofRecord> {
  const fullRecord = {
    ...record,
    key: proofKey(record.serial, action),
  };
  const records = await loadAutomationProofs();
  const next = records.filter((item) => item.key !== fullRecord.key);
  next.push(fullRecord);
  await saveAutomationProofs(next);
  return fullRecord;
}

export async function getLatestAutomationProofForSerial(
  serial: number
): Promise<AutomationProofRecord | null> {
  const records = await loadAutomationProofs();
  const matches = records.filter((item) => item.serial === serial);
  matches.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return matches[0] ?? null;
}

export async function clearAutomationProofs(): Promise<void> {
  await saveAutomationProofs([]);
}
