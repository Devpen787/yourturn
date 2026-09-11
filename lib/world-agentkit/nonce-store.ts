import { createHash } from "node:crypto";

import { getRedis } from "../store/redis";

export type WorldAgentNonceKey = {
  nonce: string;
  resourceUri: string;
};

export type WorldAgentNonceStore = {
  /** Non-consuming freshness check used during AgentKit message validation. */
  isFresh(input: WorldAgentNonceKey): Promise<boolean>;
  /** Atomically consumes a verified nonce. Exactly one concurrent caller may win. */
  consume(input: WorldAgentNonceKey): Promise<boolean>;
};

export const WORLD_AGENT_NONCE_TTL_SECONDS = 10 * 60;

function nonceKey(input: WorldAgentNonceKey, prefix: string) {
  const digest = createHash("sha256")
    .update(input.resourceUri)
    .update("\0")
    .update(input.nonce)
    .digest("hex");
  return `${prefix}:${digest}`;
}

/**
 * Persistent replay protection for live AgentKit request verification.
 *
 * The raw nonce/resource are hashed before storage. `consume` uses Redis SET NX,
 * so concurrent replays cannot both cross the verified-request boundary.
 */
export function createRedisWorldAgentNonceStore(options?: {
  ttlSeconds?: number;
  prefix?: string;
}): WorldAgentNonceStore {
  const redis = getRedis();
  const ttlSeconds = options?.ttlSeconds ?? WORLD_AGENT_NONCE_TTL_SECONDS;
  const prefix = options?.prefix ?? "bookedrights:world-agentkit:nonce";

  return {
    async isFresh(input) {
      return (await redis.exists(nonceKey(input, prefix))) === 0;
    },
    async consume(input) {
      const result = await redis.set(nonceKey(input, prefix), "1", {
        nx: true,
        ex: ttlSeconds,
      });
      return result === "OK";
    },
  };
}
