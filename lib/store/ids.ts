import { getRedis, REDIS_KEYS } from "./redis";

export async function getStoredTokenId(): Promise<string | null> {
  const redis = getRedis();
  const v = await redis.get<string>(REDIS_KEYS.tokenId);
  return v ?? process.env.BOOKED_RIGHTS_TOKEN_ID ?? null;
}

export async function setStoredTokenId(id: string): Promise<void> {
  const redis = getRedis();
  await redis.set(REDIS_KEYS.tokenId, id);
}

export async function getStoredTopicId(): Promise<string | null> {
  const redis = getRedis();
  const v = await redis.get<string>(REDIS_KEYS.topicId);
  return v ?? process.env.BOOKED_RIGHTS_TOPIC_ID ?? null;
}

export async function setStoredTopicId(id: string): Promise<void> {
  const redis = getRedis();
  await redis.set(REDIS_KEYS.topicId, id);
}
