import { NextResponse } from "next/server";
import { requireGuestAppUser } from "@/lib/auth/guest-api-auth";
import { getRedis, REDIS_KEYS } from "@/lib/store/redis";
import { createRecoveryMandateOwnerHandlers } from "./recovery-mandate-owner-http";

/** Cookie signature remains the app's existing authentication. Fresh raw user
 * validation adds a fail-closed boundary; no legacy role/persona inference. */
export const recoveryMandateOwnerHandlers = createRecoveryMandateOwnerHandlers({
  isTestnet: () => (process.env.HEDERA_NETWORK ?? "testnet") === "testnet",
  readSignedOwner: async () => {
    const user = await requireGuestAppUser();
    if (user instanceof NextResponse || user.appRole !== "user") return null;
    return { id: user.id, email: user.email, appRole: "user" };
  },
  readStoredOwner: async id => getRedis().get(REDIS_KEYS.userById(id)),
  store: () => getRedis(),
});
