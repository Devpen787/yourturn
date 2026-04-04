import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { AppRole } from "@/lib/auth/app-role";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { findUserById, normalizeEmail } from "@/lib/store/users";
import type { HederaPersona } from "@/lib/types/hedera-persona";
import { fail } from "@/lib/validation/api";

type SessionAppUser = {
  id: string;
  email: string;
  appRole: AppRole;
  hederaPersona: HederaPersona | null;
};

async function readSessionAppUser(
  role: AppRole,
  errorMessage: string
): Promise<SessionAppUser | NextResponse> {
  const cookieStore = cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) {
    return NextResponse.json(fail(errorMessage, "UNAUTHORIZED"), {
      status: 401,
    });
  }
  const payload = verifySessionToken(raw);
  if (!payload || payload.appRole !== role) {
    return NextResponse.json(fail(errorMessage, "UNAUTHORIZED"), {
      status: 401,
    });
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
      user.appRole === role
    ) {
      hederaPersona = user.hederaPersona;
    }
  } catch {
    // ignore KV errors; keep signed-cookie claims
  }
  return {
    id: payload.userId,
    email: signedEmail,
    appRole: role,
    hederaPersona,
  };
}

/**
 * Guest Hedera API routes require a signed-in **app** user (`appRole: user`).
 */
export async function requireGuestAppUser(): Promise<
  SessionAppUser | NextResponse
> {
  return readSessionAppUser("user", "Sign in as a guest user to use this action.");
}

export async function requireIssuerAppUser(): Promise<
  SessionAppUser | NextResponse
> {
  return readSessionAppUser(
    "issuer",
    "Sign in as the provider to use this action."
  );
}

/** Demo User A/B accounts cannot act as the other Hedera guest. */
export function enforceLockedGuestActor(
  user: SessionAppUser,
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
