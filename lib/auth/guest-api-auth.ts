import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { findUserById, normalizeEmail } from "@/lib/store/users";
import type { HederaPersona } from "@/lib/types/hedera-persona";
import { fail } from "@/lib/validation/api";

export type GuestSessionUser = {
  id: string;
  email: string;
  appRole: "user";
  hederaPersona: HederaPersona | null;
};

/**
 * Guest Hedera API routes require a signed-in **app** user (`appRole: user`).
 */
export async function requireGuestAppUser(): Promise<
  GuestSessionUser | NextResponse
> {
  const cookieStore = cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) {
    return NextResponse.json(
      fail("Sign in as a guest user to use this action.", "UNAUTHORIZED"),
      { status: 401 }
    );
  }
  const payload = verifySessionToken(raw);
  if (!payload || payload.appRole !== "user") {
    return NextResponse.json(
      fail("Sign in as a guest user to use this action.", "UNAUTHORIZED"),
      { status: 401 }
    );
  }
  const signedEmail = normalizeEmail(payload.email);
  let hederaPersona: HederaPersona | null = payload.hederaPersona;

  /**
   * Best-effort enrich from Redis if available; do not fail closed on KV hiccups.
   * The cookie is signed and already used for page/session auth.
   */
  try {
    const user = await findUserById(payload.userId);
    if (
      user &&
      normalizeEmail(user.email) === signedEmail &&
      user.appRole === "user"
    ) {
      hederaPersona = user.hederaPersona;
    }
  } catch {
    // ignore KV errors; keep signed-cookie claims
  }
  return {
    id: payload.userId,
    email: signedEmail,
    appRole: "user",
    hederaPersona,
  };
}

/** Demo User A/B accounts cannot act as the other Hedera guest. */
export function enforceLockedGuestActor(
  user: GuestSessionUser,
  actor: HederaPersona
): NextResponse | null {
  if (user.hederaPersona != null && user.hederaPersona !== actor) {
    return NextResponse.json(
      fail(
        "This sign-in is locked to a different guest wallet (User A vs User B). Log out and sign in with the matching demo user.",
        "FORBIDDEN"
      ),
      { status: 403 }
    );
  }
  return null;
}
