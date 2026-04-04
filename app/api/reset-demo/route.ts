import { NextResponse } from "next/server";
import { getNftBySerial } from "@/lib/hedera/mirror";
import { loadDemoPlan } from "@/lib/store/demo-plan";
import { getStoredTokenId } from "@/lib/store/ids";
import { clearAllListings } from "@/lib/store/listings";
import { loadSlots, saveSlots } from "@/lib/store/slots";
import type { SlotRecord } from "@/lib/types/slot";
import { fail } from "@/lib/validation/api";

export const runtime = "nodejs";

export async function POST() {
  try {
    const tokenId = await getStoredTokenId();
    if (!tokenId) {
      return NextResponse.json(
        fail("Token not initialized", "NOT_FOUND"),
        { status: 400 }
      );
    }
    await clearAllListings();
    const demo = await loadDemoPlan();
    const prev = await loadSlots();
    const bySerial = prev.filter((s) => s.tokenId === tokenId);
    const rebuilt: SlotRecord[] = [];
    for (const s of bySerial.sort((a, b) => a.serial - b.serial)) {
      const idx = rebuilt.length;
      const seed = demo[idx];
      if (!seed) break;
      await getNftBySerial(tokenId, s.serial);
      rebuilt.push({
        tokenId,
        serial: s.serial,
        slotId: seed.slotId,
        title: seed.title,
        startTime: seed.startTime,
        endTime: seed.endTime,
        location: seed.location,
        primaryPriceHbar: seed.primaryPriceHbar,
        resaleAllowed: seed.resaleAllowed,
        seeded: true,
        mintedAt: s.mintedAt,
        listingActive: false,
      });
    }
    const others = prev.filter((s) => s.tokenId !== tokenId);
    await saveSlots([...others, ...rebuilt]);
    return NextResponse.json({ ok: true as const, slots: rebuilt.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(fail(msg, "INTERNAL_ERROR"), { status: 500 });
  }
}
