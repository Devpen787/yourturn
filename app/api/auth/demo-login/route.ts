import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSessionToken,
  hasAuthSecret,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { getSessionUser } from "@/lib/auth/get-session";
import {
  ensureDemoUser,
  isDemoLoginEnabled,
} from "@/lib/auth/demo-users";
import { demoLoginBodySchema } from "@/lib/validation/auth";
import { fail } from "@/lib/validation/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    if (!isDemoLoginEnabled()) {
      return NextResponse.json(
        fail("Demo login is disabled (ENABLE_DEMO_LOGIN=false).", "FORBIDDEN"),
        { status: 403 }
      );
    }
    const parsed = demoLoginBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        fail(parsed.error.message, "VALIDATION_ERROR"),
        { status: 400 }
      );
    }
    if (!hasAuthSecret()) {
      return NextResponse.json(
        fail(
          "AUTH_SESSION_SECRET is not set (min 16 chars).",
          "NOT_CONFIGURED"
        ),
        { status: 503 }
      );
    }
    const { role } = parsed.data;
    let user;
    try {
      user = await ensureDemoUser(role);
    } catch (e) {
      if (
        e instanceof Error &&
        e.message === "DEMO_ACCOUNT_PASSWORD_MISMATCH"
      ) {
        return NextResponse.json(
          fail(
            "Demo email exists with a different password. Reset Redis user row or match DEMO_*_PASSWORD in .env.",
            "CONFLICT"
          ),
          { status: 409 }
        );
      }
      throw e;
    }
    const existing = await getSessionUser();
    if (existing && existing.id !== user.id) {
      return NextResponse.json(
        fail(
          "Log out before signing in with a different account (including User A vs User B).",
          "CONFLICT"
        ),
        { status: 409 }
      );
    }
    const sessionToken = createSessionToken(
      user.id,
      user.email,
      user.appRole,
      user.hederaPersona
    );
    if (!sessionToken) {
      return NextResponse.json(
        fail("Session signing misconfigured.", "NOT_CONFIGURED"),
        { status: 503 }
      );
    }
    const cookieStore = cookies();
    cookieStore.set(SESSION_COOKIE, sessionToken, sessionCookieOptions());
    return NextResponse.json({
      ok: true as const,
      user: {
        id: user.id,
        email: user.email,
        appRole: user.appRole,
        hederaPersona: user.hederaPersona,
        role,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("KV_REST")) {
      return NextResponse.json(
        fail("Redis (KV) is not configured.", "NOT_CONFIGURED"),
        { status: 503 }
      );
    }
    return NextResponse.json(fail(msg, "INTERNAL_ERROR"), { status: 500 });
  }
}
