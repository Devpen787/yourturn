import { Redis } from "@upstash/redis";

export function getRedis(): Redis {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error("KV_REST_API_URL and KV_REST_API_TOKEN are required");
  }
  return new Redis({ url, token });
}

/** Spec: bookedrights:tokenId, bookedrights:topicId, bookedrights:slots, bookedrights:listings */
export const REDIS_KEYS = {
  tokenId: "bookedrights:tokenId",
  topicId: "bookedrights:topicId",
  init: "bookedrights:init",
  slots: "bookedrights:slots",
  listings: "bookedrights:listings",
} as const;
