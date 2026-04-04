import { NextResponse } from "next/server";
import {
  enforceLockedGuestActor,
  requireGuestAppUser,
} from "@/lib/auth/guest-api-auth";
import { isTokenAssociatedWithAccount } from "@/lib/hedera/mirror";
import { associateTokenToAccount } from "@/lib/hedera/token";
import { getActorCredentials } from "@/lib/hedera/client";
import { getStoredTokenId } from "@/lib/store/ids";
import { associateBodySchema, fail } from "@/lib/validation/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const appUser = await requireGuestAppUser();
    if (appUser instanceof NextResponse) return appUser;
    const parsed = associateBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        fail(parsed.error.message, "VALIDATION_ERROR"),
        { status: 400 }
      );
    }
    const denied = enforceLockedGuestActor(appUser, parsed.data.actor);
    if (denied) return denied;
    const tokenId = await getStoredTokenId();
    if (!tokenId) {
      return NextResponse.json(
        fail("Token not initialized", "NOT_FOUND"),
        { status: 400 }
      );
    }
    const { accountId, privateKey } = getActorCredentials(parsed.data.actor);
    const acc = accountId.toString();
    if (await isTokenAssociatedWithAccount(acc, tokenId)) {
      return NextResponse.json({ ok: true as const, associated: false });
    }
    await associateTokenToAccount(acc, privateKey.toString(), tokenId);
    return NextResponse.json({ ok: true as const, associated: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("TOKEN_ALREADY_ASSOCIATED") ||
      msg.includes("already associated")
    ) {
      return NextResponse.json({ ok: true as const, associated: false });
    }
    return NextResponse.json(fail(msg, "HEDERA_TX_ERROR"), { status: 500 });
  }
}
