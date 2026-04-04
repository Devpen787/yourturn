import { NextResponse } from "next/server";
import { canResell } from "@/lib/domain/guards";
import { submitLifecycleEvent } from "@/lib/hedera/consensus";
import { getActorCredentials } from "@/lib/hedera/client";
import { readSlotChainState } from "@/lib/server/slotChain";
import { getStoredTokenId, getStoredTopicId } from "@/lib/store/ids";
import {
  addListing,
  getActiveListingForTokenSerial,
} from "@/lib/store/listings";
import { getSlotByTokenSerial, updateSlotListingActive } from "@/lib/store/slots";
import { getTreasuryIdString } from "@/lib/hedera/token";
import { fail, resaleListBodySchema } from "@/lib/validation/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = resaleListBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        fail(parsed.error.message, "VALIDATION_ERROR"),
        { status: 400 }
      );
    }
    const { actor, serial, askPriceHbar } = parsed.data;
    const tokenId = await getStoredTokenId();
    const topicId = await getStoredTopicId();
    if (!tokenId || !topicId) {
      return NextResponse.json(
        fail("Run /api/init first", "NOT_FOUND"),
        { status: 400 }
      );
    }
    const cred = getActorCredentials(actor);
    const acc = cred.accountId.toString();
    const treasury = getTreasuryIdString();
    const chain = await readSlotChainState({
      tokenId,
      serial,
      treasuryAccountId: treasury,
    });
    const slot = await getSlotByTokenSerial(tokenId, serial);
    if (!slot) {
      return NextResponse.json(fail("Unknown serial", "NOT_FOUND"), {
        status: 404,
      });
    }
    if (chain.holderAccountId !== acc) {
      return NextResponse.json(
        fail("Only the current holder can list", "CONFLICT"),
        { status: 409 }
      );
    }
    if (!canResell({ status: chain.status, resaleAllowed: slot.resaleAllowed })) {
      return NextResponse.json(
        fail("Slot cannot be listed for resale", "CONFLICT"),
        { status: 409 }
      );
    }
    const existing = await getActiveListingForTokenSerial(tokenId, serial);
    if (existing) {
      return NextResponse.json(
        fail("An active listing already exists for this serial", "CONFLICT"),
        { status: 409 }
      );
    }
    const listing = {
      tokenId,
      serial,
      sellerAccountId: acc,
      askPriceHbar,
      active: true,
      createdAt: new Date().toISOString(),
    };
    await addListing(listing);
    await updateSlotListingActive(serial, true, tokenId);
    await submitLifecycleEvent(topicId, {
      eventType: "LISTED",
      tokenId,
      serial,
      from: acc,
      priceHbar: askPriceHbar,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({
      ok: true as const,
      listing: {
        serial: listing.serial,
        sellerAccountId: listing.sellerAccountId,
        askPriceHbar: listing.askPriceHbar,
        active: listing.active,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(fail(msg, "HEDERA_TX_ERROR"), { status: 500 });
  }
}
