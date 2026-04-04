import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hashPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  hasAuthSecret,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { createUser } from "@/lib/store/users";
import { registerBodySchema } from "@/lib/validation/auth";
import { fail } from "@/lib/validation/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = registerBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        fail(parsed.error.message, "VALIDATION_ERROR"),
        { status: 400 }
      );
    }
    if (!hasAuthSecret()) {
      return NextResponse.json(
        fail(
          "AUTH_SESSION_SECRET is not set (min 16 chars). Add to .env.local — see .env.example.",
          "NOT_CONFIGURED"
        ),
        { status: 503 }
      );
    }
    const { email, password } = parsed.data;
    const passwordHash = await hashPassword(password);
    let user;
    try {
      user = await createUser(email, passwordHash, "user", null);
    } catch (e) {
      if (e instanceof Error && e.message === "EMAIL_IN_USE") {
        return NextResponse.json(
          fail("An account with this email already exists.", "CONFLICT"),
          { status: 409 }
        );
      }
      throw e;
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
