import { createHash } from "node:crypto";
import type {
  RecoveryMandateReplayClaim,
  RecoveryMandateReplayStore,
} from "./recovery-mandate";

const BIGINT_ZERO = BigInt(0);
const MAX_SAFE_INTEGER_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

export type RecoveryMandateAtomicSetStore = {
  set(
    key: string,
    value: string,
    options: { nx: true; ex: number }
  ): Promise<unknown>;
};

export function recoveryMandateReplayKey(
  mandateId: string,
  nonce: string
): string {
  const digest = createHash("sha256")
    .update(mandateId, "utf8")
    .update("\0", "utf8")
    .update(nonce, "utf8")
    .digest("hex");
  return `bookedrights:ledger:mandate-consumed:${digest}`;
}

export function createRedisRecoveryMandateReplayStore(
  redis: RecoveryMandateAtomicSetStore
): RecoveryMandateReplayStore {
  return {
    async consumeOnce(input: RecoveryMandateReplayClaim): Promise<boolean> {
      const ttl = input.expiresAt - input.nowUnixSeconds;
      if (ttl <= BIGINT_ZERO) {
        return false;
      }
      if (ttl > MAX_SAFE_INTEGER_BIGINT) {
        throw new Error("Recovery mandate replay TTL exceeds safe Redis range");
      }

      const ttlSeconds = Number(ttl);
      const key = recoveryMandateReplayKey(input.mandateId, input.nonce);
      const value = JSON.stringify({
        mandateId: input.mandateId,
        nonce: input.nonce,
        digest: input.digest,
        consumedAt: input.nowUnixSeconds.toString(),
        expiresAt: input.expiresAt.toString(),
      });

      // SET NX is the authority-boundary compare-and-set: concurrent requests for
      // the same signed mandateId+nonce pair cannot both acquire authorization.
      // The marker lives until the mandate expires; after that signature
      // verification rejects the mandate independently.
      const result = await redis.set(key, value, {
        nx: true,
        ex: ttlSeconds,
      });
      return result === "OK";
    },
  };
}
