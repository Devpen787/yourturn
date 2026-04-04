import { getSessionUser } from "@/lib/auth/get-session";
import { getStoredTokenId, getStoredTopicId } from "@/lib/store/ids";
import { readSlotLiveState } from "@/lib/server/slotChain";
import { getTreasuryIdString } from "@/lib/hedera/token";
import { loadSlots } from "@/lib/store/slots";
import { MyBookingsClient } from "./MyBookingsClient";

export const dynamic = "force-dynamic";

export default async function MyBookingsPage() {
  const session = await getSessionUser();
  const lockTo =
    session?.hederaPersona === "guestA" || session?.hederaPersona === "guestB"
      ? session.hederaPersona
      : undefined;
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
    const topicId = await getStoredTopicId();
    if (!tokenId) {
      return (
        <MyBookingsClient
          guestAId={guestAId}
          guestBId={guestBId}
          tokenId={null}
          initialRows={[]}
          lockTo={lockTo}
        />
      );
    }
    const treasury = getTreasuryIdString();
    const slots = await loadSlots();
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
      lockTo={lockTo}
    />
  );
}
