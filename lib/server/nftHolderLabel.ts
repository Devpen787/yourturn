import { tryResolveGuestActor } from "@/lib/hedera/client";
import { getNftBySerial } from "@/lib/hedera/mirror";
import { isNftHolderTreasury } from "@/lib/hedera/token";

/** Short Mirror-based label for Issuer / debugging (demo Guest A/B only). */
export async function describeOnChainHolder(
  tokenId: string,
  serial: number
): Promise<string> {
  const nft = await getNftBySerial(tokenId, serial);
  if (!nft || nft.deleted) return "not found or burned";
  const h = nft.account_id;
  if (!h) return "pending (Mirror has no holder yet)";
  if (await isNftHolderTreasury(tokenId, h)) {
    return "treasury — book as guest before freeze";
  }
  const actor = tryResolveGuestActor(h);
  if (actor === "guestA") return "Guest A";
  if (actor === "guestB") return "Guest B";
  return h;
}
