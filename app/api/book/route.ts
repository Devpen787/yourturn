import { NextResponse } from "next/server";
import { canBook } from "@/lib/domain/guards";
import { submitLifecycleEvent } from "@/lib/hedera/consensus";
import { getHashscanTxUrl } from "@/lib/hedera/hashscan";
import { isTokenAssociatedWithAccount } from "@/lib/hedera/mirror";
import { getActorCredentials } from "@/lib/hedera/client";
import {
  associateTokenToAccount,
  getTreasuryIdString,
  primaryBookTransfer,
} from "@/lib/hedera/token";
import { readSlotChainState } from "@/lib/server/slotChain";
import { getStoredTokenId, getStoredTopicId } from "@/lib/store/ids";
import { getSlotBySerial } from "@/lib/store/slots";
import { bookBodySchema, fail } from "@/lib/validation/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = bookBodySchema.safeParse(await req.json());
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
    const treasury = getTreasuryIdString();
    const chain = await readSlotChainState({
      tokenId,
      serial,
      treasuryAccountId: treasury,
    });
    if (!canBook(chain.status)) {
      return NextResponse.json(
        fail("Slot is not available for booking", "CONFLICT"),
        { status: 409 }
      );
    }
    const slot = await getSlotBySerial(serial);
    if (!slot) {
      return NextResponse.json(fail("Unknown serial", "NOT_FOUND"), {
        status: 404,
      });
    }
    const buyer = getActorCredentials(actor);
    const acc = buyer.accountId.toString();
    if (!(await isTokenAssociatedWithAccount(acc, tokenId))) {
      await associateTokenToAccount(acc, buyer.privateKey.toString(), tokenId);
    }
    const txId = await primaryBookTransfer({
      buyerAccountId: acc,
      buyerPrivateKey: buyer.privateKey.toString(),
      serial,
      priceHbar: slot.primaryPriceHbar,
      tokenIdStr: tokenId,
    });
    await submitLifecycleEvent(topicId, {
      eventType: "BOOKED",
      tokenId,
      serial,
      from: treasury,
      to: acc,
      priceHbar: slot.primaryPriceHbar,
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
