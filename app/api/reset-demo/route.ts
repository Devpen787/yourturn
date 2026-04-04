import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import type { ImmutableSlotMetadata } from "@/lib/domain/metadata";
import { accountsEqual, getActorCredentials, tryResolveGuestActor } from "@/lib/hedera/client";
import {
  getAccountTokenFreezeStatus,
  getNftBySerial,
} from "@/lib/hedera/mirror";
import {
  getTreasuryIdString,
  mintSlotNfts,
  transferNftFromHolderToTreasury,
  unfreezeHolder,
} from "@/lib/hedera/token";
import { getStoredTokenId } from "@/lib/store/ids";
import { clearAllListings } from "@/lib/store/listings";
import { loadSlots, saveSlots } from "@/lib/store/slots";
import type { SlotRecord } from "@/lib/types/slot";
import { fail } from "@/lib/validation/api";

export const runtime = "nodejs";

type DemoSeed = {
  slotId: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  issuerName: string;
  primaryPriceHbar: number;
  resaleAllowed: boolean;
};

/**
 * Clears listings, returns prior demo NFTs from Guest A/B to treasury when possible,
 * then mints **three new** NFT serials and **replaces** Redis slot rows for this token
 * so the app always shows three AVAILABLE (treasury-held, not burned) demo slots.
 */
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
    const treasury = getTreasuryIdString();
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

    const prev = await loadSlots();
    const bySerial = prev.filter((s) => s.tokenId === tokenId);
    const warnings: string[] = [];

    for (const s of bySerial.sort((a, b) => a.serial - b.serial)) {
      const nft = await getNftBySerial(tokenId, s.serial);
      if (nft?.deleted) continue;
      if (!nft?.account_id) continue;
      if (accountsEqual(nft.account_id, treasury)) continue;

      const guest = tryResolveGuestActor(nft.account_id);
      if (!guest) {
        warnings.push(
          `Old serial ${s.serial} is still held by ${nft.account_id} (not Guest A/B); minting new slots anyway.`
        );
        continue;
      }

      const frozen = await getAccountTokenFreezeStatus(nft.account_id, tokenId);
      if (frozen) {
        await unfreezeHolder({
          holderAccountId: nft.account_id,
          tokenIdStr: tokenId,
        });
      }
      const { privateKey } = getActorCredentials(guest);
      await transferNftFromHolderToTreasury({
        holderAccountId: nft.account_id,
        holderPrivateKey: privateKey,
        serial: s.serial,
        tokenIdStr: tokenId,
      });
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

    const others = prev.filter((s) => s.tokenId !== tokenId);
    await saveSlots([...others, ...newRecords]);

    return NextResponse.json({
      ok: true as const,
      slots: newRecords.length,
      serials: newRecords.map((r) => r.serial).sort((a, b) => a - b),
      ...(warnings.length ? { warnings } : {}),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(fail(msg, "INTERNAL_ERROR"), { status: 500 });
  }
}
