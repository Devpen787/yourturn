import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  guestDemoEmailNormalized,
  issuerDemoEmailNormalized,
  userADemoEmailNormalized,
  userBDemoEmailNormalized,
  type AppRole,
} from "@/lib/auth/app-role";
import type { HederaPersona } from "@/lib/types/hedera-persona";
import {
  createUser,
  findUserByEmail,
  normalizeEmail,
  saveUserRecord,
  withAppRole,
} from "@/lib/store/users";
import type { UserRecord } from "@/lib/types/user";

export type DemoRole = "issuer" | "guestA" | "guestB";

function envOr(key: string, fallback: string): string {
  const v = process.env[key]?.trim();
  return v && v.length > 0 ? v : fallback;
}

function isDemoRedisEmail(normalized: string): boolean {
  return (
    normalized === guestDemoEmailNormalized() ||
    normalized === issuerDemoEmailNormalized() ||
    normalized === userADemoEmailNormalized() ||
    normalized === userBDemoEmailNormalized()
  );
}

/** Fixed demo accounts (override via env). Not Hedera keys — app session only. */
export function getDemoCredentials(role: DemoRole): {
  email: string;
  password: string;
} {
  if (role === "issuer") {
    return {
      email: envOr("DEMO_ISSUER_EMAIL", "demo-issuer@bookedrights.local"),
      password: envOr(
        "DEMO_ISSUER_PASSWORD",
        "BookedRights-Demo-Issuer-2026!"
      ),
    };
  }
  if (role === "guestA") {
    return {
      email: envOr("DEMO_USER_A_EMAIL", "demo-user-a@bookedrights.local"),
      password: envOr(
        "DEMO_USER_A_PASSWORD",
        "BookedRights-Demo-UserA-2026!"
      ),
    };
  }
  return {
    email: envOr("DEMO_USER_B_EMAIL", "demo-user-b@bookedrights.local"),
    password: envOr(
      "DEMO_USER_B_PASSWORD",
      "BookedRights-Demo-UserB-2026!"
    ),
  };
}

export function isDemoLoginEnabled(): boolean {
  return process.env.ENABLE_DEMO_LOGIN !== "false";
}

/**
 * Create demo Redis user if missing; if present, verify password and role/persona.
 * User A and User B are **separate app accounts**, each locked to one Hedera guest wallet.
 */
export async function ensureDemoUser(role: DemoRole): Promise<UserRecord> {
  const { email, password } = getDemoCredentials(role);
  const normalized = normalizeEmail(email);
  const targetAppRole: AppRole = role === "issuer" ? "issuer" : "user";
  const targetPersona: HederaPersona | null =
    role === "guestA" ? "guestA" : role === "guestB" ? "guestB" : null;

  const existing = await findUserByEmail(normalized);
  if (existing) {
    const ok = await verifyPassword(password, existing.passwordHash);
    if (!ok) throw new Error("DEMO_ACCOUNT_PASSWORD_MISMATCH");
    let u = withAppRole(existing);
    if (
      u.appRole !== targetAppRole ||
      u.hederaPersona !== targetPersona
    ) {
      u = {
        ...u,
        appRole: targetAppRole,
        hederaPersona: targetPersona,
      };
      await saveUserRecord(u);
      return u;
    }
    if (isDemoRedisEmail(normalized)) {
      await saveUserRecord(u);
    }
    return u;
  }
  const hash = await hashPassword(password);
  return createUser(email, hash, targetAppRole, targetPersona);
}
