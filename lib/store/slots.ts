import { captureOwnerPolicySnapshot, normalizeOwnerPolicy } from "@/lib/policy/policy";
import type { SlotRecord } from "@/lib/types/slot";
import { getRedis, REDIS_KEYS } from "./redis";

function normalizeSlotRecord(slot: SlotRecord): SlotRecord {
  const policy = normalizeOwnerPolicy({
    ...slot.policy,
    resaleAllowed: slot.policy?.resaleAllowed ?? slot.resaleAllowed,
  });
  return {
    ...slot,
    resaleAllowed: policy.resaleAllowed,
    policy,
    policySnapshot:
      slot.policySnapshot ??
      captureOwnerPolicySnapshot({
        ...policy,
        label: `${policy.label} legacy snapshot`,
      }),
  };
}

export async function loadSlots(): Promise<SlotRecord[]> {
  const redis = getRedis();
  const raw = await redis.get<string>(REDIS_KEYS.slots);
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      return (JSON.parse(raw) as SlotRecord[]).map(normalizeSlotRecord);
    } catch {
      return [];
    }
  }
  return (raw as unknown as SlotRecord[]).map(normalizeSlotRecord);
}

export async function saveSlots(slots: SlotRecord[]): Promise<void> {
  const redis = getRedis();
  await redis.set(REDIS_KEYS.slots, JSON.stringify(slots));
}

export async function getSlotBySerial(
  serial: number
): Promise<SlotRecord | undefined> {
  const slots = await loadSlots();
  return slots.find((s) => s.serial === serial);
}

export async function upsertSlot(record: SlotRecord): Promise<void> {
  const slots = await loadSlots();
  const i = slots.findIndex((s) => s.serial === record.serial);
  if (i >= 0) slots[i] = record;
  else slots.push(record);
  slots.sort((a, b) => a.serial - b.serial);
  await saveSlots(slots);
}

export async function updateSlotListingActive(
  serial: number,
  listingActive: boolean
): Promise<void> {
  const slots = await loadSlots();
  const s = slots.find((x) => x.serial === serial);
  if (s) {
    s.listingActive = listingActive;
    await saveSlots(slots);
  }
}
