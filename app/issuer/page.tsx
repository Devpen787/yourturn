import { getToken } from "@/lib/hedera/mirror";
import { getTreasuryIdString } from "@/lib/hedera/token";
import { describeOnChainHolder } from "@/lib/server/nftHolderLabel";
import { readSlotChainState } from "@/lib/server/slotChain";
import { getStoredTokenId, getStoredTopicId } from "@/lib/store/ids";
import { loadListings } from "@/lib/store/listings";
import { loadSlots } from "@/lib/store/slots";
import { IssuerPanel } from "./IssuerPanel";

export const dynamic = "force-dynamic";

export default async function IssuerPage() {
  let tokenId: string | null = null;
  let topicId: string | null = null;
  let slots: Awaited<ReturnType<typeof loadSlots>> = [];
  try {
    tokenId = await getStoredTokenId();
    topicId = await getStoredTopicId();
    slots = await loadSlots();
  } catch {
    /* Redis / env not configured */
  }
  const tokenMirror = tokenId ? await getToken(tokenId) : null;
  const slotsForToken = tokenId
    ? slots.filter((s) => s.tokenId === tokenId)
    : [];
  const slotOverview =
    tokenId && slotsForToken.length > 0
      ? await (async () => {
          const treasury = getTreasuryIdString();
          const listings = await loadListings();
          const activeListingBySerial = new Map(
            listings
              .filter((l) => l.tokenId === tokenId && l.active)
              .map((l) => [l.serial, l] as const)
          );
          const rows = await Promise.all(
            slotsForToken.map(async (s) => {
              const chain = await readSlotChainState({
                tokenId,
                serial: s.serial,
                treasuryAccountId: treasury,
              });
              const holderLabel = await describeOnChainHolder(tokenId, s.serial);
              const listing = activeListingBySerial.get(s.serial);
              return {
                serial: s.serial,
                title: s.title,
                status: chain.status,
                holderLabel,
                resaleActive: !!listing,
                resaleAskHbar: listing?.askPriceHbar ?? null,
                resaleAskUsd:
                  typeof listing?.askUsd === "number" ? listing.askUsd : null,
              };
            })
          );
          return rows.sort((a, b) => a.serial - b.serial);
        })()
      : [];
  const holderHints = slotOverview.map((s) => ({
    serial: s.serial,
    label: s.holderLabel,
  }));
  return (
    <IssuerPanel
      tokenId={tokenId}
      topicId={topicId}
      tokenExists={!!tokenMirror}
      slotsCount={slotsForToken.length}
      holderHints={holderHints}
      slotOverview={slotOverview}
    />
  );
}
