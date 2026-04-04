import type { ResaleListing } from "@/lib/types/listing";
import { getRedis, REDIS_KEYS } from "./redis";

function parseListings(raw: unknown): ResaleListing[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as ResaleListing[];
    } catch {
      return [];
    }
  }
  return raw as ResaleListing[];
}

export async function loadListings(): Promise<ResaleListing[]> {
  const redis = getRedis();
  const raw = await redis.get(REDIS_KEYS.listings);
  return parseListings(raw);
}

export async function saveListings(listings: ResaleListing[]): Promise<void> {
  const redis = getRedis();
  await redis.set(REDIS_KEYS.listings, JSON.stringify(listings));
}

export async function getActiveListingForSerial(
  serial: number
): Promise<ResaleListing | undefined> {
  const listings = await loadListings();
  return listings.find((l) => l.serial === serial && l.active);
}

export async function getActiveListingForTokenSerial(
  tokenId: string,
  serial: number
): Promise<ResaleListing | undefined> {
  const listings = await loadListings();
  return listings.find(
    (l) => l.tokenId === tokenId && l.serial === serial && l.active
  );
}

export async function addListing(listing: ResaleListing): Promise<void> {
  const listings = await loadListings();
  const others = listings.filter(
    (l) => !(l.serial === listing.serial && l.active)
  );
  others.push(listing);
  await saveListings(others);
}

export async function deactivateListing(
  serial: number,
  tokenId?: string
): Promise<void> {
  const listings = await loadListings();
  for (const l of listings) {
    if (l.serial !== serial) continue;
    if (tokenId != null && l.tokenId !== tokenId) continue;
    l.active = false;
  }
  await saveListings(listings);
}

export async function clearAllListings(): Promise<void> {
  await saveListings([]);
}
