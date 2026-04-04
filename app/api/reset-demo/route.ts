import { NextResponse } from "next/server";
import { requireIssuerAppUser } from "@/lib/auth/guest-api-auth";
import type { ImmutableSlotMetadata } from "@/lib/domain/metadata";
import { mintSlotNfts } from "@/lib/hedera/token";
import { loadDemoPlan } from "@/lib/store/demo-plan";
import { getStoredTokenId } from "@/lib/store/ids";
import { clearAllListings } from "@/lib/store/listings";
import { loadSlots, saveSlots } from "@/lib/store/slots";
import type { SlotRecord } from "@/lib/types/slot";
import { fail } from "@/lib/validation/api";

export const runtime = "nodejs";

export async function POST() {
  try {
    const issuer = await requireIssuerAppUser();
    if (issuer instanceof NextResponse) return issuer;
    const tokenId = await getStoredTokenId();
    if (!tokenId) {
      return NextResponse.json(
        fail("Token not initialized", "NOT_FOUND"),
        { status: 400 }
      );
    }
    await clearAllListings();
    const demo = await loadDemoPlan();
    if (demo.length !== 3) {
      return NextResponse.json(
        fail(
          "The saved session plan must contain exactly 3 sessions",
          "INTERNAL_ERROR"
        ),
        { status: 500 }
      );
    }
    const metas: ImmutableSlotMetadata[] = demo.map((slot) => ({
      slotId: slot.slotId,
      title: slot.title,
      startTime: slot.startTime,
      endTime: slot.endTime,
      location: slot.location,
      issuerName: slot.issuerName,
    }));
    const serials = await mintSlotNfts(tokenId, metas);
    const mintedAt = new Date().toISOString();
    const rebuilt: SlotRecord[] = demo.map((seed, index) => ({
      tokenId,
      serial: serials[index]!,
      slotId: seed.slotId,
      title: seed.title,
      startTime: seed.startTime,
      endTime: seed.endTime,
      location: seed.location,
      primaryPriceHbar: seed.primaryPriceHbar,
      resaleAllowed: seed.resaleAllowed,
      seeded: true,
      mintedAt,
      listingActive: false,
    }));
    const prev = await loadSlots();
    const others = prev.filter((s) => s.tokenId !== tokenId);
    await saveSlots([...others, ...rebuilt]);
    return NextResponse.json({
      ok: true as const,
      slots: rebuilt.length,
      serials: rebuilt.map((slot) => slot.serial),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(fail(msg, "INTERNAL_ERROR"), { status: 500 });
  }
}
