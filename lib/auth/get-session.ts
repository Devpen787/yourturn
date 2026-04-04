import { cookies } from "next/headers";
import type { AppRole } from "@/lib/auth/app-role";
import { SESSION_COOKIE, verifySessionToken } from "./session";
import type { HederaPersona } from "@/lib/types/hedera-persona";

export type SessionUser = {
  id: string;
  email: string;
  appRole: AppRole;
  hederaPersona: HederaPersona | null;
};

/**
 * Server-only: shell/header session from signed cookie.
 * Does **not** call Redis so a slow or stuck KV cannot block every page render.
 * `GET /api/auth/me` still re-validates against Redis when needed.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const raw = cookieStore.get(SESSION_COOKIE)?.value;
    if (!raw) return null;
    const payload = verifySessionToken(raw);
    if (!payload) return null;
    return {
      id: payload.userId,
      email: payload.email,
      appRole: payload.appRole,
      hederaPersona: payload.hederaPersona,
    };
  } catch {
    return null;
  }
}
