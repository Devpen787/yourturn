import { getToken } from "@/lib/hedera/mirror";
import { getTreasuryIdString } from "@/lib/hedera/token";
import { readSlotChainState } from "@/lib/server/slotChain";
import { loadDemoPlan } from "@/lib/store/demo-plan";
import { getStoredTokenId, getStoredTopicId } from "@/lib/store/ids";
import { loadSlots } from "@/lib/store/slots";
import type { DemoSlotSeed } from "@/lib/types/demo-slot";
import { IssuerPanel } from "./IssuerPanel";

export const dynamic = "force-dynamic";

export default async function IssuerPage() {
  let tokenId: string | null = null;
  let topicId: string | null = null;
  let slots: Awaited<ReturnType<typeof loadSlots>> = [];
  let demoPlan: DemoSlotSeed[] = [];
  let rows: {
    serial: number;
    title: string;
    status: string;
    holderAccountId: string | null;
    holderActor: "guestA" | "guestB" | null;
    listingActive: boolean;
  }[] = [];
  const guestAId = process.env.HEDERA_GUEST_A_ID ?? "";
  const guestBId = process.env.HEDERA_GUEST_B_ID ?? "";
  try {
    demoPlan = await loadDemoPlan();
  } catch {
    demoPlan = [];
  }
  try {
    tokenId = await getStoredTokenId();
    topicId = await getStoredTopicId();
    slots = await loadSlots();
    if (tokenId) {
      const treasury = getTreasuryIdString();
      for (const slot of slots) {
        const chain = await readSlotChainState({
          tokenId,
          serial: slot.serial,
          treasuryAccountId: treasury,
        });
        const holder = chain.holderAccountId;
        rows.push({
          serial: slot.serial,
          title: slot.title,
          status: chain.status,
          holderAccountId: holder,
          holderActor:
            holder === guestAId
              ? "guestA"
              : holder === guestBId
                ? "guestB"
                : null,
          listingActive: slot.listingActive,
        });
      }
    }
  } catch {
    /* Redis / env not configured */
  }
  const tokenMirror = tokenId ? await getToken(tokenId) : null;
  return (
    <IssuerPanel
      tokenId={tokenId}
      topicId={topicId}
      tokenExists={!!tokenMirror}
      slotsCount={slots.length}
      demoPlan={demoPlan}
      rows={rows}
    />
  );
}
