import { getToken } from "@/lib/hedera/mirror";
import { getTreasuryIdString } from "@/lib/hedera/token";
import { readSlotLiveState } from "@/lib/server/slotChain";
import { loadDemoPlan } from "@/lib/store/demo-plan";
import { getStoredTokenId, getStoredTopicId } from "@/lib/store/ids";
import { getLatestAutomationProofForSerial } from "@/lib/store/automation-proofs";
import { getLatestRecoveryReceiptForSerial } from "@/lib/store/recovery-receipts";
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
    automationProof: {
      status: "scheduled" | "executed" | "deleted" | "unknown";
      scheduleId: string;
      amountHbar: number;
      scheduleHashscanUrl: string;
      executionHashscanUrl?: string;
    } | null;
    recoveryProof: {
      title: string;
      statusLabel: string;
      actionLabel: string;
      refundHbar?: number;
      hashscanUrl?: string;
      releaseHashscanUrl?: string;
      burnHashscanUrl?: string;
    } | null;
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
      for (const slot of slots.filter((record) => record.tokenId === tokenId)) {
        const chain = await readSlotLiveState({
          tokenId,
          serial: slot.serial,
          treasuryAccountId: treasury,
          topicId,
        });
        const automationProof = await getLatestAutomationProofForSerial(slot.serial);
        const recoveryProof = await getLatestRecoveryReceiptForSerial(slot.serial);
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
          automationProof: automationProof
            ? {
                status: automationProof.scheduleProof.status,
                scheduleId: automationProof.scheduleProof.scheduleId,
                amountHbar: automationProof.scheduleProof.amountHbar,
                scheduleHashscanUrl:
                  automationProof.scheduleProof.scheduleHashscanUrl,
                executionHashscanUrl:
                  automationProof.scheduleProof.executionHashscanUrl,
              }
            : null,
          recoveryProof: recoveryProof
            ? {
                title: recoveryProof.title,
                statusLabel: recoveryProof.statusLabel,
                actionLabel: recoveryProof.actionLabel,
                refundHbar: recoveryProof.refundHbar,
                hashscanUrl: recoveryProof.hashscanUrl,
                releaseHashscanUrl: recoveryProof.releaseHashscanUrl,
                burnHashscanUrl: recoveryProof.burnHashscanUrl,
              }
            : null,
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
