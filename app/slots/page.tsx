import { readSlotChainState } from "@/lib/server/slotChain";
import { getStoredTokenId } from "@/lib/store/ids";
import { loadSlots } from "@/lib/store/slots";
import { getTreasuryIdString } from "@/lib/hedera/token";
import { SlotsClient, type SlotRow } from "./SlotsClient";

export const dynamic = "force-dynamic";

export default async function SlotsPage() {
  let rows: SlotRow[] = [];
  try {
    const tokenId = await getStoredTokenId();
    const slots = await loadSlots();
    if (tokenId) {
      const treasury = getTreasuryIdString();
      const forToken = slots.filter((s) => s.tokenId === tokenId);
      for (const s of forToken) {
        const chain = await readSlotChainState({
          tokenId,
          serial: s.serial,
          treasuryAccountId: treasury,
        });
        rows.push({
          serial: s.serial,
          title: s.title,
          startTime: s.startTime,
          endTime: s.endTime,
          primaryPriceHbar: s.primaryPriceHbar,
          status: chain.status,
        });
      }
    }
  } catch {
    rows = [];
  }
  return <SlotsClient rows={rows} />;
}
