import { NextResponse } from "next/server";
import { submitLifecycleEvent } from "@/lib/hedera/consensus";
import {
  getActorCredentials,
  tryResolveGuestActor,
} from "@/lib/hedera/client";
import {
  burnUsedSlot,
  getTreasuryIdString,
  transferNftFromHolderToTreasury,
} from "@/lib/hedera/token";
import { getHashscanTxUrl } from "@/lib/hedera/hashscan";
import { readSlotChainState } from "@/lib/server/slotChain";
import { deactivateListing } from "@/lib/store/listings";
import { getStoredTokenId, getStoredTopicId } from "@/lib/store/ids";
import { fail, markUsedBodySchema } from "@/lib/validation/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = markUsedBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        fail(parsed.error.message, "VALIDATION_ERROR"),
        { status: 400 }
      );
    }
    const tokenId = await getStoredTokenId();
    const topicId = await getStoredTopicId();
    if (!tokenId || !topicId) {
      return NextResponse.json(
        fail("Run /api/init first", "NOT_FOUND"),
        { status: 400 }
      );
    }
    const serial = parsed.data.serial;
    const treasury = getTreasuryIdString();
    const chain = await readSlotChainState({
      tokenId,
      serial,
      treasuryAccountId: treasury,
    });
    if (chain.status === "USED") {
      return NextResponse.json(
        fail("Serial is already burned (USED)", "CONFLICT"),
        { status: 409 }
      );
    }
    if (chain.status === "FROZEN") {
      return NextResponse.json(
        fail(
          "Cannot mark used while holder is frozen: unfreeze first so the NFT can move to treasury for burn.",
          "CONFLICT"
        ),
        { status: 409 }
      );
    }
    let returnToTreasuryTxId: string | undefined;
    if (chain.status === "HELD") {
      const holder = chain.holderAccountId;
      if (!holder) {
        return NextResponse.json(fail("Mirror missing holder", "INTERNAL_ERROR"), {
          status: 500,
        });
      }
      const guest = tryResolveGuestActor(holder);
      if (!guest) {
        return NextResponse.json(
          fail(
            "Holder is not Guest A or B; this MVP cannot server-sign return-to-treasury for that account.",
            "CONFLICT"
          ),
          { status: 409 }
        );
      }
      const { privateKey } = getActorCredentials(guest);
      returnToTreasuryTxId = await transferNftFromHolderToTreasury({
        holderAccountId: holder,
        holderPrivateKey: privateKey,
        serial,
        tokenIdStr: tokenId,
      });
    }
    const burnTxId = await burnUsedSlot({ serial, tokenIdStr: tokenId });
    try {
      await deactivateListing(serial, tokenId);
    } catch {
      /* Redis optional for burn; listing row may remain if KV unset */
    }
    const lifecycleTxId = await submitLifecycleEvent(topicId, {
      eventType: "USED",
      tokenId,
      serial,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({
      ok: true as const,
      returnToTreasuryTxId: returnToTreasuryTxId ?? null,
      returnToTreasuryHashscanUrl: returnToTreasuryTxId
        ? getHashscanTxUrl(returnToTreasuryTxId)
        : null,
      burnTxId,
      burnHashscanUrl: getHashscanTxUrl(burnTxId),
      lifecycleTxId,
      lifecycleHashscanUrl: getHashscanTxUrl(lifecycleTxId),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(fail(msg, "HEDERA_TX_ERROR"), { status: 500 });
  }
}
