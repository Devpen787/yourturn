import type { AppRole } from "@/lib/auth/app-role";
import type { HederaPersona } from "@/lib/types/hedera-persona";

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  appRole: AppRole;
  /**
   * When set, this user may only act as that Hedera guest (demo User A / B).
   * `null` = email-registered users who may switch A/B in the UI.
   */
  hederaPersona: HederaPersona | null;
};
