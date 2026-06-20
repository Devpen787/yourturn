import { NextResponse } from "next/server";
import { getToken } from "@/lib/hedera/mirror";
import {
  assessBookingRightTokenRisk,
  buildBookingRightHip412Metadata,
  validateBookingRightHip412Metadata,
} from "@/lib/nft-studio/booking-rights";
import { getStoredTokenId } from "@/lib/store/ids";
import { loadSlots } from "@/lib/store/slots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function baseUrlFromRequest(req: Request): string {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(req: Request) {
  const tokenId = await getStoredTokenId();
  if (!tokenId) {
    return NextResponse.json(
      { ok: false, error: "BOOKED_RIGHTS_TOKEN_ID is not configured." },
      { status: 409 }
    );
  }
  const [slots, token] = await Promise.all([loadSlots(), getToken(tokenId)]);
  const baseUrl = baseUrlFromRequest(req);
  const metadata = slots.slice(0, 6).map((slot) => {
    const item = buildBookingRightHip412Metadata(
      {
        serial: slot.serial,
        tokenId,
        slotId: slot.slotId,
        title: slot.title,
        startTime: slot.startTime,
        location: slot.location,
        issuerName: "YourTurn Demo Provider",
        policyLabel: slot.policySnapshot?.label,
        resaleAllowed: slot.policySnapshot?.resaleAllowed ?? slot.resaleAllowed,
        releaseAllowed: slot.policySnapshot?.releaseAllowed,
      },
      baseUrl
    );
    return {
      serial: slot.serial,
      metadata: item,
      validation: validateBookingRightHip412Metadata(item),
    };
  });

  return NextResponse.json({
    ok: true,
    source: "Hedera NFT Studio metadata/risk proof",
    tokenId,
    risk: assessBookingRightTokenRisk(token),
    metadata,
  });
}
