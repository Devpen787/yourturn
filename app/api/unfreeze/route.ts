import { NextResponse } from "next/server";
import { submitLifecycleEvent } from "@/lib/hedera/consensus";
import {
  accountsEqual,
  getActorCredentials,
  tryResolveGuestActor,
} from "@/lib/hedera/client";
import { getHashscanTxUrl } from "@/lib/hedera/hashscan";
import { isNftHolderTreasury, unfreezeHolder } from "@/lib/hedera/token";
import { getNftBySerial } from "@/lib/hedera/mirror";
import { getStoredTokenId, getStoredTopicId } from "@/lib/store/ids";
import { fail, unfreezeBodySchema } from "@/lib/validation/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = unfreezeBodySchema.safeParse(await req.json());
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
    const { serial, holderActor } = parsed.data;
    const nft = await getNftBySerial(tokenId, serial);
    if (!nft || nft.deleted) {
      return NextResponse.json(
        fail("Serial not found or already burned", "NOT_FOUND"),
        { status: 404 }
      );
    }
    const mirrorHolder = nft.account_id;
    if (!mirrorHolder) {
      return NextResponse.json(
        fail(
          "Cannot unfreeze: Mirror has no account_id for this NFT yet. Wait a few seconds and retry.",
          "CONFLICT"
        ),
        { status: 409 }
      );
    }
    if (await isNftHolderTreasury(tokenId, mirrorHolder)) {
      return NextResponse.json(
        fail(
          `Cannot unfreeze: serial ${serial} is still with the token treasury (${mirrorHolder}) — nothing to unfreeze until a guest holds the NFT.`,
          "CONFLICT"
        ),
        { status: 409 }
      );
    }
    const fromMirror = tryResolveGuestActor(mirrorHolder);
    if (holderActor !== undefined) {
      const selected = getActorCredentials(holderActor).accountId.toString();
      if (!accountsEqual(mirrorHolder, selected)) {
        return NextResponse.json(
          fail(
            `holderActor (${holderActor}) does not match Mirror holder for serial ${serial}. Mirror holder: ${mirrorHolder}.`,
            "CONFLICT"
          ),
          { status: 409 }
        );
      }
    } else if (!fromMirror) {
      return NextResponse.json(
        fail(
          `Cannot auto-unfreeze: Mirror holder ${mirrorHolder} is not Guest A or B in env. Pick the matching guest or fix env ids.`,
          "CONFLICT"
        ),
        { status: 409 }
      );
    }
    const unfreezeTxId = await unfreezeHolder({
      holderAccountId: mirrorHolder,
      tokenIdStr: tokenId,
    });
    const lifecycleTxId = await submitLifecycleEvent(topicId, {
      eventType: "UNFROZEN",
      tokenId,
      serial,
      to: mirrorHolder,
      timestamp: new Date().toISOString(),
    });
    const holderActorUsed = holderActor ?? fromMirror!;
    return NextResponse.json({
      ok: true as const,
      holderActorUsed,
      unfreezeTxId,
      unfreezeHashscanUrl: getHashscanTxUrl(unfreezeTxId),
      lifecycleTxId,
      lifecycleHashscanUrl: getHashscanTxUrl(lifecycleTxId),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(fail(msg, "HEDERA_TX_ERROR"), { status: 500 });
  }
}
