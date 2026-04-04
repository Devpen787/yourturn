import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import type { ImmutableSlotMetadata } from "@/lib/domain/metadata";
import { mintSlotNfts } from "@/lib/hedera/token";
import { getStoredTokenId } from "@/lib/store/ids";
import { loadSlots, saveSlots } from "@/lib/store/slots";
import type { SlotRecord } from "@/lib/types/slot";
import { fail, mintSlotsBodySchema } from "@/lib/validation/api";

export const runtime = "nodejs";

type DemoSeed = {
  slotId: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  issuerName: string;
  primaryPriceHbar: number;
  priceUsd?: number;
  resaleAllowed: boolean;
};

export async function POST(req: Request) {
  try {
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
    const raw = await readFile(
      path.join(process.cwd(), "public", "demo-slots.json"),
      "utf8"
    );
    const demo = JSON.parse(raw) as DemoSeed[];
    if (demo.length !== 3) {
      return NextResponse.json(
        fail("demo-slots.json must contain exactly 3 slots", "INTERNAL_ERROR"),
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
      ...(typeof d.priceUsd === "number" ? { priceUsd: d.priceUsd } : {}),
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
