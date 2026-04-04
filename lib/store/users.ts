import { randomUUID } from "crypto";
import {
  guestDemoEmailNormalized,
  inferAppRoleFromEmail,
  issuerDemoEmailNormalized,
  userADemoEmailNormalized,
  userBDemoEmailNormalized,
  type AppRole,
} from "@/lib/auth/app-role";
import type { HederaPersona } from "@/lib/types/hedera-persona";
import type { UserRecord } from "@/lib/types/user";
import { getRedis, REDIS_KEYS } from "./redis";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

type StoredUser = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  appRole?: AppRole;
  hederaPersona?: HederaPersona | null;
};

function inferHederaPersonaFromDemoEmail(email: string): HederaPersona | null {
  const e = email.trim().toLowerCase();
  if (e === userADemoEmailNormalized() || e === guestDemoEmailNormalized()) {
    return "guestA";
  }
  if (e === userBDemoEmailNormalized()) return "guestB";
  return null;
}

/** Normalize Redis JSON that may predate `appRole` / `hederaPersona`. */
export function withAppRole(record: StoredUser): UserRecord {
  const e = record.email.trim().toLowerCase();
  let appRole: AppRole =
    record.appRole === "issuer" || record.appRole === "user"
      ? record.appRole
      : inferAppRoleFromEmail(record.email);
  if (e === guestDemoEmailNormalized()) {
    appRole = "user";
  } else if (e === userADemoEmailNormalized() || e === userBDemoEmailNormalized()) {
    appRole = "user";
  } else if (e === issuerDemoEmailNormalized()) {
    appRole = "issuer";
  }

  let hederaPersona: HederaPersona | null =
    record.hederaPersona === "guestA" || record.hederaPersona === "guestB"
      ? record.hederaPersona
      : null;
  const forced = inferHederaPersonaFromDemoEmail(record.email);
  if (forced) {
    hederaPersona = forced;
  }

  return {
    id: record.id,
    email: record.email,
    passwordHash: record.passwordHash,
    createdAt: record.createdAt,
    appRole,
    hederaPersona,
  };
}

export async function findUserIdByEmail(
  email: string
): Promise<string | null> {
  const redis = getRedis();
  const id = await redis.get<string>(REDIS_KEYS.userByEmail(email));
  return id ?? null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const redis = getRedis();
  const raw = await redis.get<string>(REDIS_KEYS.userById(id));
  if (!raw || typeof raw !== "string") return null;
  try {
    return withAppRole(JSON.parse(raw) as StoredUser);
  } catch {
    return null;
  }
}

export async function findUserByEmail(
  email: string
): Promise<UserRecord | null> {
  const redis = getRedis();
  const normalized = normalizeEmail(email);
  const id = await findUserIdByEmail(normalized);
  if (!id) return null;
  const user = await findUserById(id);
  if (!user) {
    await redis.del(REDIS_KEYS.userByEmail(normalized));
    await redis.del(REDIS_KEYS.userById(id));
    return null;
  }
  return user;
}

export async function saveUserRecord(record: UserRecord): Promise<void> {
  const redis = getRedis();
  await redis.set(REDIS_KEYS.userById(record.id), JSON.stringify(record));
}

export async function createUser(
  email: string,
  passwordHash: string,
  appRole: AppRole = "user",
  hederaPersona: HederaPersona | null = null
): Promise<UserRecord> {
  const redis = getRedis();
  const normalized = normalizeEmail(email);
  const existing = await findUserIdByEmail(normalized);
  if (existing) {
    throw new Error("EMAIL_IN_USE");
  }
  const id = randomUUID();
  const persona =
    inferHederaPersonaFromDemoEmail(normalized) ?? hederaPersona;
  const record: UserRecord = {
    id,
    email: normalized,
    passwordHash,
    createdAt: new Date().toISOString(),
    appRole,
    hederaPersona: persona,
  };
  await redis.set(REDIS_KEYS.userById(id), JSON.stringify(record));
  await redis.set(REDIS_KEYS.userByEmail(normalized), id);
  return record;
}
