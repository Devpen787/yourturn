import { redirect } from "next/navigation";
import type { AppRole } from "@/lib/auth/app-role";
import { getSessionUser } from "@/lib/auth/get-session";
import { findUserById, normalizeEmail } from "@/lib/store/users";

export async function requireSessionRole(role: AppRole) {
  const session = await getSessionUser();
  if (!session) {
    redirect(role === "issuer" ? "/login?need=issuer" : "/login?need=user");
  }

  let effectiveRole: AppRole = session.appRole;
  try {
    const user = await findUserById(session.id);
    if (user && normalizeEmail(user.email) === normalizeEmail(session.email)) {
      effectiveRole = user.appRole;
    }
  } catch {
    /* KV unavailable — rely on signed cookie only */
  }

  if (effectiveRole !== role) {
    redirect(role === "issuer" ? "/login?need=issuer" : "/login?need=user");
  }
  return session;
}
