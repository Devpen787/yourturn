import { NextResponse } from "next/server";
import { requireIssuerAppUser } from "@/lib/auth/guest-api-auth";
import type { ImmutableSlotMetadata } from "@/lib/domain/metadata";
import { mintSlotNfts } from "@/lib/hedera/token";
import { loadDemoPlan } from "@/lib/store/demo-plan";
import { getStoredTokenId } from "@/lib/store/ids";
import { loadSlots, saveSlots } from "@/lib/store/slots";
import type { SlotRecord } from "@/lib/types/slot";
import { fail, mintSlotsBodySchema } from "@/lib/validation/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const issuer = await requireIssuerAppUser();
    if (issuer instanceof NextResponse) return issuer;
    const body = mintSlotsBodySchema.safeParse(await req.json().catch(() => ({})));
    if (!body.success) {
      return NextResponse.json(
        fail(body.error.message, "VALIDATION_ERROR"),
        { status: 400 }
      );
    }
    const reseed = body.data.reseed;
    const tokenId = await getStoredTokenId();
    if (!tokenId) {
      return NextResponse.json(
        fail("Initialize token first via /api/init", "NOT_FOUND"),
        { status: 400 }
      );
    }
    const existing = await loadSlots();
    const sameToken = existing.filter((s) => s.tokenId === tokenId);
    if (sameToken.length >= 3 && !reseed) {
      return NextResponse.json({
        ok: true as const,
        minted: false,
        serials: sameToken.map((s) => s.serial).sort((a, b) => a - b),
      });
    }
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
    const metas: ImmutableSlotMetadata[] = demo.map((d) => ({
      slotId: d.slotId,
      title: d.title,
      startTime: d.startTime,
      endTime: d.endTime,
      location: d.location,
      issuerName: d.issuerName,
    }));
    const serials = await mintSlotNfts(tokenId, metas);
    const mintedAt = new Date().toISOString();
    const newRecords: SlotRecord[] = demo.map((d, i) => ({
      tokenId,
      serial: serials[i]!,
      slotId: d.slotId,
      title: d.title,
      startTime: d.startTime,
      endTime: d.endTime,
      location: d.location,
      primaryPriceHbar: d.primaryPriceHbar,
      resaleAllowed: d.resaleAllowed,
      seeded: true,
      mintedAt,
      listingActive: false,
    }));
    if (reseed) {
      await saveSlots([...existing, ...newRecords]);
    } else {
      await saveSlots(newRecords);
    }
    return NextResponse.json({
      ok: true as const,
      minted: true,
      serials: newRecords.map((r) => r.serial).sort((a, b) => a - b),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(fail(msg, "HEDERA_TX_ERROR"), { status: 500 });
  }
}
