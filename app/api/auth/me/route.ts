import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { findUserById } from "@/lib/store/users";

export const runtime = "nodejs";

export async function GET() {
  try {
    const cookieStore = cookies();
    const raw = cookieStore.get(SESSION_COOKIE)?.value;
    if (!raw) {
      return NextResponse.json({ ok: true as const, user: null });
    }
    const payload = verifySessionToken(raw);
    if (!payload) {
      return NextResponse.json({ ok: true as const, user: null });
    }
    const user = await findUserById(payload.userId);
    if (!user || user.email !== payload.email) {
      return NextResponse.json({
        ok: true as const,
        user: {
          id: payload.userId,
          email: payload.email,
          appRole: payload.appRole,
          hederaPersona: payload.hederaPersona,
        },
      });
    }
    return NextResponse.json({
      ok: true as const,
      user: {
        id: user.id,
        email: user.email,
        appRole: user.appRole,
        hederaPersona: user.hederaPersona,
      },
    });
  } catch {
    return NextResponse.json({ ok: true as const, user: null });
  }
}
