import { getStoredTokenId } from "@/lib/store/ids";
import { readSlotChainState } from "@/lib/server/slotChain";
import { getTreasuryIdString } from "@/lib/hedera/token";
import { loadSlots } from "@/lib/store/slots";
import { MyBookingsClient } from "./MyBookingsClient";

export const dynamic = "force-dynamic";

export default async function MyBookingsPage() {
  const guestAId = process.env.HEDERA_GUEST_A_ID ?? "";
  const guestBId = process.env.HEDERA_GUEST_B_ID ?? "";
  let tokenId: string | null = null;
  let rows: {
    serial: number;
    title: string;
    status: string;
    holderAccountId: string | null;
    canResell: boolean;
  }[] = [];
  try {
    tokenId = await getStoredTokenId();
    if (!tokenId) {
      return (
        <MyBookingsClient
          guestAId={guestAId}
          guestBId={guestBId}
          tokenId={null}
          initialRows={[]}
        />
      );
    }
    const treasury = getTreasuryIdString();
    const slots = await loadSlots();
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
        status: chain.status,
        holderAccountId: chain.holderAccountId,
        canResell:
          chain.status === "HELD" &&
          s.resaleAllowed &&
          chain.holderAccountId !== null,
      });
    }
  } catch {
    rows = [];
  }
  return (
    <MyBookingsClient
      guestAId={guestAId}
      guestBId={guestBId}
      tokenId={tokenId}
      initialRows={rows}
    />
  );
}
