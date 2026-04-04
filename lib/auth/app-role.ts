/**
 * App portal role (separate from Hedera demo actors on each page).
 * Issuer console vs guest areas (browse slots, bookings, resale).
 */
export type AppRole = "issuer" | "user";

const DEFAULT_ISSUER_DEMO_EMAIL = "demo-issuer@bookedrights.local";
/** Legacy single guest demo (maps to Guest A wallet lock). */
const DEFAULT_GUEST_DEMO_EMAIL = "demo-guest@bookedrights.local";
const DEFAULT_USER_A_DEMO_EMAIL = "demo-user-a@bookedrights.local";
const DEFAULT_USER_B_DEMO_EMAIL = "demo-user-b@bookedrights.local";

function envOrLower(key: string, fallback: string): string {
  const v = process.env[key]?.trim().toLowerCase();
  return v && v.length > 0 ? v : fallback;
}

/** Normalized demo issuer email (must match `getDemoCredentials("issuer")`). */
export function issuerDemoEmailNormalized(): string {
  return envOrLower("DEMO_ISSUER_EMAIL", DEFAULT_ISSUER_DEMO_EMAIL);
}

/** Legacy demo guest email (treated as User A / guestA). */
export function guestDemoEmailNormalized(): string {
  return envOrLower("DEMO_GUEST_EMAIL", DEFAULT_GUEST_DEMO_EMAIL);
}

export function userADemoEmailNormalized(): string {
  return envOrLower("DEMO_USER_A_EMAIL", DEFAULT_USER_A_DEMO_EMAIL);
}

export function userBDemoEmailNormalized(): string {
  return envOrLower("DEMO_USER_B_EMAIL", DEFAULT_USER_B_DEMO_EMAIL);
}

/**
 * Maps legacy rows / tokens without explicit `appRole`.
 * Guest demo address is always **user** first so a mis-set `DEMO_ISSUER_EMAIL`
 * cannot classify the guest account as issuer.
 */
export function inferAppRoleFromEmail(email: string): AppRole {
  const e = email.trim().toLowerCase();
  if (e === guestDemoEmailNormalized()) return "user";
  if (e === userADemoEmailNormalized()) return "user";
  if (e === userBDemoEmailNormalized()) return "user";
  if (e === issuerDemoEmailNormalized()) return "issuer";
  return "user";
}
