import { NextResponse } from "next/server";
import { submitLifecycleEvent } from "@/lib/hedera/consensus";
import { freezeHolder } from "@/lib/hedera/token";
import { getActorCredentials } from "@/lib/hedera/client";
import { getStoredTokenId, getStoredTopicId } from "@/lib/store/ids";
import { fail, freezeBodySchema } from "@/lib/validation/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = freezeBodySchema.safeParse(await req.json());
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
    const holder = getActorCredentials(parsed.data.holderActor);
    await freezeHolder({
      holderAccountId: holder.accountId.toString(),
      tokenIdStr: tokenId,
    });
    await submitLifecycleEvent(topicId, {
      eventType: "FROZEN",
      tokenId,
      serial: parsed.data.serial,
      to: holder.accountId.toString(),
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true as const });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(fail(msg, "HEDERA_TX_ERROR"), { status: 500 });
  }
}
