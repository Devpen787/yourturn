import { NextResponse } from "next/server";
import { submitLifecycleEvent } from "@/lib/hedera/consensus";
import { getActorCredentials } from "@/lib/hedera/client";
import { getHashscanTxUrl } from "@/lib/hedera/hashscan";
import { isTokenAssociatedWithAccount } from "@/lib/hedera/mirror";
import {
  associateTokenToAccount,
  resaleTransfer,
} from "@/lib/hedera/token";
import { getStoredTokenId, getStoredTopicId } from "@/lib/store/ids";
import {
  deactivateListing,
  getActiveListingForTokenSerial,
} from "@/lib/store/listings";
import { updateSlotListingActive } from "@/lib/store/slots";
import { fail, resaleBuyBodySchema } from "@/lib/validation/api";

export const runtime = "nodejs";

function credentialsForSellerAccount(sellerAccountId: string): ReturnType<
  typeof getActorCredentials
> | null {
  const a = process.env.HEDERA_GUEST_A_ID;
  const b = process.env.HEDERA_GUEST_B_ID;
  if (sellerAccountId === a) return getActorCredentials("guestA");
  if (sellerAccountId === b) return getActorCredentials("guestB");
  return null;
}

export async function POST(req: Request) {
  try {
    const parsed = resaleBuyBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        fail(parsed.error.message, "VALIDATION_ERROR"),
        { status: 400 }
      );
    }
    const { actor, serial } = parsed.data;
    const tokenId = await getStoredTokenId();
    const topicId = await getStoredTopicId();
    if (!tokenId || !topicId) {
      return NextResponse.json(
        fail("Run /api/init first", "NOT_FOUND"),
        { status: 400 }
      );
    }
    const listing = await getActiveListingForTokenSerial(tokenId, serial);
    if (!listing || !listing.active) {
      return NextResponse.json(
        fail("No active listing for this serial", "NOT_FOUND"),
        { status: 404 }
      );
    }
    const buyer = getActorCredentials(actor);
    const buyerAcc = buyer.accountId.toString();
    if (buyerAcc === listing.sellerAccountId) {
      return NextResponse.json(
        fail("Buyer cannot be the seller", "CONFLICT"),
        { status: 409 }
      );
    }
    const sellerCreds = credentialsForSellerAccount(listing.sellerAccountId);
    if (!sellerCreds) {
      return NextResponse.json(
        fail("Seller is not a demo guest account", "INTERNAL_ERROR"),
        { status: 500 }
      );
    }
    if (!(await isTokenAssociatedWithAccount(buyerAcc, tokenId))) {
      await associateTokenToAccount(buyerAcc, buyer.privateKey, tokenId);
    }
    const txId = await resaleTransfer({
      sellerAccountId: listing.sellerAccountId,
      sellerPrivateKey: sellerCreds.privateKey,
      buyerAccountId: buyerAcc,
      buyerPrivateKey: buyer.privateKey,
      serial,
      askPriceHbar: listing.askPriceHbar,
      tokenIdStr: tokenId,
    });
    await deactivateListing(serial, tokenId);
    await updateSlotListingActive(serial, false, tokenId);
    await submitLifecycleEvent(topicId, {
      eventType: "RESOLD",
      tokenId,
      serial,
      from: listing.sellerAccountId,
      to: buyerAcc,
      priceHbar: listing.askPriceHbar,
      txId,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({
      ok: true as const,
      txId,
      hashscanUrl: getHashscanTxUrl(txId),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(fail(msg, "HEDERA_TX_ERROR"), { status: 500 });
  }
}
