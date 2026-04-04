import type { SlotRecord } from "@/lib/types/slot";
import { getRedis, REDIS_KEYS } from "./redis";

export async function loadSlots(): Promise<SlotRecord[]> {
  const redis = getRedis();
  const raw = await redis.get<string>(REDIS_KEYS.slots);
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as SlotRecord[];
    } catch {
      return [];
    }
  }
  return raw as unknown as SlotRecord[];
}

export async function saveSlots(slots: SlotRecord[]): Promise<void> {
  const redis = getRedis();
  await redis.set(REDIS_KEYS.slots, JSON.stringify(slots));
}

/** Prefer this when you know the app token — avoids matching the wrong row if Redis ever has multiple tokens. */
export async function getSlotByTokenSerial(
  tokenId: string,
  serial: number
): Promise<SlotRecord | undefined> {
  const slots = await loadSlots();
  return slots.find((s) => s.tokenId === tokenId && s.serial === serial);
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
  listingActive: boolean,
  tokenId?: string
): Promise<void> {
  const slots = await loadSlots();
  const s = tokenId
    ? slots.find((x) => x.tokenId === tokenId && x.serial === serial)
    : slots.find((x) => x.serial === serial);
  if (s) {
    s.listingActive = listingActive;
    await saveSlots(slots);
  }
}
