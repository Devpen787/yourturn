import type { RecoveryProofDetails } from "@/lib/types/recovery-proof";
import { getRedis, REDIS_KEYS } from "./redis";

export type RecoveryReceiptRecord = RecoveryProofDetails & {
  key: string;
};

function receiptKey(serial: number, action: string): string {
  return `${serial}:${action}`;
}

function parseReceipts(raw: unknown): RecoveryReceiptRecord[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as RecoveryReceiptRecord[];
    } catch {
      return [];
    }
  }
  return raw as RecoveryReceiptRecord[];
}

export async function loadRecoveryReceipts(): Promise<RecoveryReceiptRecord[]> {
  const redis = getRedis();
  const raw = await redis.get(REDIS_KEYS.recoveryReceipts);
  return parseReceipts(raw);
}

export async function saveRecoveryReceipts(
  receipts: RecoveryReceiptRecord[]
): Promise<void> {
  const redis = getRedis();
  await redis.set(REDIS_KEYS.recoveryReceipts, JSON.stringify(receipts));
}

export async function upsertRecoveryReceipt(
  receipt: RecoveryProofDetails,
  action = receipt.actionLabel
): Promise<RecoveryReceiptRecord> {
  const record: RecoveryReceiptRecord = {
    ...receipt,
    key: receiptKey(receipt.serial, action),
  };
  const receipts = await loadRecoveryReceipts();
  const others = receipts.filter((item) => item.key !== record.key);
  others.push(record);
  await saveRecoveryReceipts(others);
  return record;
}

export async function getLatestRecoveryReceiptForSerial(
  serial: number
): Promise<RecoveryReceiptRecord | null> {
  const receipts = await loadRecoveryReceipts();
  const matches = receipts.filter((item) => item.serial === serial);
  matches.sort((a, b) => {
    const aTime = a.occurredAt ? Date.parse(a.occurredAt) : 0;
    const bTime = b.occurredAt ? Date.parse(b.occurredAt) : 0;
    return bTime - aTime;
  });
  return matches[0] ?? null;
}

export async function clearRecoveryReceipts(): Promise<void> {
  await saveRecoveryReceipts([]);
}
