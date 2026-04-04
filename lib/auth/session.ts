import { createHmac, timingSafeEqual } from "crypto";
import { inferAppRoleFromEmail, type AppRole } from "@/lib/auth/app-role";
import type { HederaPersona } from "@/lib/types/hedera-persona";

export const SESSION_COOKIE = "br_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

export type SessionPayload = {
  userId: string;
  email: string;
  exp: number;
  appRole?: AppRole;
  hederaPersona?: HederaPersona | null;
};

/**
 * Local dev fallback so `/login` works without editing `.env.local`.
 * **Production** (`NODE_ENV === "production"`) still requires `AUTH_SESSION_SECRET` (min 16 chars).
 */
const DEV_AUTH_SECRET_FALLBACK =
  "bookedrights-local-dev-auth-secret-do-not-use-in-production";

function getSecret(): string | null {
  const s = process.env.AUTH_SESSION_SECRET?.trim();
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV !== "production") {
    return DEV_AUTH_SECRET_FALLBACK;
  }
  return null;
}

export function hasAuthSecret(): boolean {
  return getSecret() !== null;
}

export function createSessionToken(
  userId: string,
  email: string,
  appRole: AppRole,
  hederaPersona: HederaPersona | null
): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload: SessionPayload = {
    userId,
    email,
    exp,
    appRole,
    hederaPersona,
  };
  const payloadJson = JSON.stringify(payload);
  const b64 = Buffer.from(payloadJson, "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(b64).digest("hex");
  return `${b64}.${sig}`;
}

export function verifySessionToken(
  token: string
): (Omit<SessionPayload, "appRole" | "hederaPersona"> & {
  appRole: AppRole;
  hederaPersona: HederaPersona | null;
}) | null {
  const secret = getSecret();
  if (!secret) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const b64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^[0-9a-f]+$/i.test(sig)) return null;
  const expected = createHmac("sha256", secret).update(b64).digest("hex");
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  let payload: SessionPayload;
  try {
    const json = Buffer.from(b64, "base64url").toString("utf8");
    payload = JSON.parse(json) as SessionPayload;
  } catch {
    return null;
  }
  if (
    typeof payload.userId !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  const appRole: AppRole =
    payload.appRole === "issuer" || payload.appRole === "user"
      ? payload.appRole
      : inferAppRoleFromEmail(payload.email);
  const hederaPersona: HederaPersona | null =
    payload.hederaPersona === "guestA" || payload.hederaPersona === "guestB"
      ? payload.hederaPersona
      : null;
  return { ...payload, appRole, hederaPersona };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}
