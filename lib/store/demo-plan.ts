import { readFile } from "fs/promises";
import path from "path";
import type { DemoSlotSeed } from "@/lib/types/demo-slot";
import { getRedis, REDIS_KEYS } from "./redis";

async function loadDefaultPlan(): Promise<DemoSlotSeed[]> {
  const raw = await readFile(
    path.join(process.cwd(), "public", "demo-slots.json"),
    "utf8"
  );
  return JSON.parse(raw) as DemoSlotSeed[];
}

export async function loadDemoPlan(): Promise<DemoSlotSeed[]> {
  try {
    const redis = getRedis();
    const raw = await redis.get<string>(REDIS_KEYS.demoPlan);
    if (!raw) return await loadDefaultPlan();
    if (typeof raw === "string") {
      return JSON.parse(raw) as DemoSlotSeed[];
    }
    return raw as unknown as DemoSlotSeed[];
  } catch {
    return await loadDefaultPlan();
  }
}

export async function saveDemoPlan(plan: DemoSlotSeed[]): Promise<void> {
  const redis = getRedis();
  await redis.set(REDIS_KEYS.demoPlan, JSON.stringify(plan));
}
