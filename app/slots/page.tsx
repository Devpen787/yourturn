import { getSessionUser } from "@/lib/auth/get-session";
import { readSlotLiveState } from "@/lib/server/slotChain";
import { getStoredTokenId, getStoredTopicId } from "@/lib/store/ids";
import { loadSlots } from "@/lib/store/slots";
import { getActiveListingForSerial } from "@/lib/store/listings";
import { getTreasuryIdString } from "@/lib/hedera/token";
import { SlotsClient, type SlotRow } from "./SlotsClient";

export const dynamic = "force-dynamic";

export default async function SlotsPage() {
  const session = await getSessionUser();
  const lockTo =
    session?.hederaPersona === "guestA" || session?.hederaPersona === "guestB"
      ? session.hederaPersona
      : undefined;
  let rows: SlotRow[] = [];
  try {
    const tokenId = await getStoredTokenId();
    const topicId = await getStoredTopicId();
    const slots = await loadSlots();
    if (tokenId) {
      const treasury = getTreasuryIdString();
      for (const s of slots.filter((slot) => slot.tokenId === tokenId)) {
        const chain = await readSlotLiveState({
          tokenId,
          serial: s.serial,
          treasuryAccountId: treasury,
          topicId,
        });
        rows.push({
          serial: s.serial,
          title: s.title,
          startTime: s.startTime,
          endTime: s.endTime,
          primaryPriceHbar: s.primaryPriceHbar,
          status: chain.status,
          listingActive: !!(await getActiveListingForSerial(s.serial)),
        });
      }
    }
  } catch {
    rows = [];
  }
  return <SlotsClient rows={rows} lockTo={lockTo} />;
}
