import { getSessionUser } from "@/lib/auth/get-session";
import { readSlotChainState } from "@/lib/server/slotChain";
import { getStoredTokenId } from "@/lib/store/ids";
import { loadListings } from "@/lib/store/listings";
import { loadSlots } from "@/lib/store/slots";
import { getTreasuryIdString } from "@/lib/hedera/token";
import { SlotsClient, type SlotRow } from "./SlotsClient";

export const dynamic = "force-dynamic";

export default async function SlotsPage() {
  const session = await getSessionUser();
  const lockTo =
    session?.hederaPersona === "guestA" ||
    session?.hederaPersona === "guestB"
      ? session.hederaPersona
      : undefined;
  let rows: SlotRow[] = [];
  try {
    const tokenId = await getStoredTokenId();
    const slots = await loadSlots();
    if (tokenId) {
      const treasury = getTreasuryIdString();
      const forToken = slots.filter((s) => s.tokenId === tokenId);
      let resaleBySerial = new Map<
        number,
        { askHbar: number; askUsd: number | null; sellerAccountId: string }
      >();
      try {
        const listings = await loadListings();
        for (const l of listings) {
          if (l.tokenId === tokenId && l.active) {
            resaleBySerial.set(l.serial, {
              askHbar: l.askPriceHbar,
              askUsd: typeof l.askUsd === "number" ? l.askUsd : null,
              sellerAccountId: l.sellerAccountId,
            });
          }
        }
      } catch {
        resaleBySerial = new Map();
      }
      for (const s of forToken) {
        const chain = await readSlotChainState({
          tokenId,
          serial: s.serial,
          treasuryAccountId: treasury,
        });
        const resale = resaleBySerial.get(s.serial);
        rows.push({
          serial: s.serial,
          title: s.title,
          startTime: s.startTime,
          endTime: s.endTime,
          primaryPriceHbar: s.primaryPriceHbar,
          priceUsd: s.priceUsd ?? null,
          status: chain.status,
          resaleAskHbar: resale?.askHbar ?? null,
          resaleAskUsd: resale?.askUsd ?? null,
          resaleSellerAccountId: resale?.sellerAccountId ?? null,
        });
      }
    }
  } catch {
    rows = [];
  }
  return (
    <SlotsClient
      rows={rows}
      guestAId={process.env.HEDERA_GUEST_A_ID ?? ""}
      guestBId={process.env.HEDERA_GUEST_B_ID ?? ""}
      lockTo={lockTo}
    />
  );
}
