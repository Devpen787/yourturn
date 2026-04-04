import { NextResponse } from "next/server";
import { requireIssuerAppUser } from "@/lib/auth/guest-api-auth";
import { createBookedRightsToken } from "@/lib/hedera/token";
import { createTopic } from "@/lib/hedera/consensus";
import {
  getStoredTokenId,
  getStoredTopicId,
  setStoredTokenId,
  setStoredTopicId,
} from "@/lib/store/ids";
import { fail } from "@/lib/validation/api";

export const runtime = "nodejs";

export async function POST() {
  try {
    const issuer = await requireIssuerAppUser();
    if (issuer instanceof NextResponse) return issuer;
    let tokenId = await getStoredTokenId();
    let topicId = await getStoredTopicId();
    let createdToken = false;
    let createdTopic = false;
    if (!tokenId) {
      tokenId = await createBookedRightsToken();
      await setStoredTokenId(tokenId);
      createdToken = true;
    }
    if (!topicId) {
      topicId = await createTopic();
      await setStoredTopicId(topicId);
      createdTopic = true;
    }
    return NextResponse.json({
      ok: true as const,
      tokenId,
      topicId,
      createdToken,
      createdTopic,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      fail(msg, "HEDERA_TX_ERROR"),
      { status: 500 }
    );
  }
}
