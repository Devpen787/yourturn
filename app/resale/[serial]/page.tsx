import Link from "next/link";
import { getSessionUser } from "@/lib/auth/get-session";
import { calcRoyalty, calcSellerNet } from "@/lib/domain/fees";
import { getTreasuryIdString } from "@/lib/hedera/token";
import {
  getLifecycleEventsForSerial,
  readSlotLiveState,
} from "@/lib/server/slotChain";
import { getButtonClassName } from "@/components/ui/button-classes";
import { cn } from "@/lib/cn";
import type { SlotStatus } from "@/lib/domain/guards";
import { getStoredTokenId, getStoredTopicId } from "@/lib/store/ids";
import { getActiveListingForSerial } from "@/lib/store/listings";
import { getLatestAutomationProofForSerial } from "@/lib/store/automation-proofs";
import { getLatestRecoveryReceiptForSerial } from "@/lib/store/recovery-receipts";
import { getSlotBySerial } from "@/lib/store/slots";
import type { LifecycleEvent } from "@/lib/types/event";
import type { RecoveryProofDetails } from "@/lib/types/recovery-proof";
import { getRecordedRecoveryReceipt } from "@/lib/proof/recorded-recovery-receipts";
import { ResaleClient } from "./ResaleClient";

export const dynamic = "force-dynamic";

function accountLabel(
  accountId: string | undefined,
  guestAId: string,
  guestBId: string
): string | undefined {
  if (!accountId) return undefined;
  if (accountId === guestAId) return "Person A";
  if (accountId === guestBId) return "Person B";
  return accountId;
}

function latestEvent(
  events: LifecycleEvent[],
  eventType: LifecycleEvent["eventType"]
): LifecycleEvent | undefined {
  return [...events].reverse().find((event) => event.eventType === eventType);
}

function resaleBlockReason(
  status: SlotStatus | null,
  resaleAllowed: boolean,
  releaseAllowed: boolean
): string | null {
  if (status === "AVAILABLE") {
    return "No customer holds this pass yet, so there is nothing to resell.";
  }
  if (status === "FROZEN") {
    return "The provider has paused this pass. It cannot be listed or bought until it is reopened.";
  }
  if (status === "USED") {
    return "This pass has already been checked in and closed. It cannot be resold.";
  }
  if (!resaleAllowed && !releaseAllowed) {
    return "This session is not set up for resale under provider rules.";
  }
  return null;
}

export default async function ResalePage({
  params,
  searchParams,
}: {
  params: { serial: string };
  searchParams?: { mode?: string };
}) {
  const session = await getSessionUser();
  const lockTo =
    session?.hederaPersona === "guestA" || session?.hederaPersona === "guestB"
      ? session.hederaPersona
      : undefined;
  const serial = Number(params.serial);
  if (!Number.isFinite(serial) || serial < 1) {
    return <p>Invalid session link.</p>;
  }
  let tokenId: string | null = null;
  let topicId: string | null = null;
  try {
    tokenId = await getStoredTokenId();
    topicId = await getStoredTopicId();
  } catch {
    tokenId = null;
    topicId = null;
  }
  let listing = null;
  let slot = undefined;
  try {
    listing = await getActiveListingForSerial(serial);
  } catch {
    listing = null;
  }
  try {
    slot = await getSlotBySerial(serial);
  } catch {
    slot = undefined;
  }
  let mirrorHolderActor: "guestA" | "guestB" | null = null;
  let chainStatus: SlotStatus | null = null;
  let initialProof: RecoveryProofDetails | null = null;
  const guestAId = process.env.HEDERA_GUEST_A_ID ?? "";
  const guestBId = process.env.HEDERA_GUEST_B_ID ?? "";
  if (tokenId) {
    try {
      const chain = await readSlotLiveState({
        tokenId,
        serial,
        treasuryAccountId: getTreasuryIdString(),
        topicId,
      });
      chainStatus = chain.status;
      const holder = chain.holderAccountId;
      mirrorHolderActor =
        holder === guestAId
          ? "guestA"
          : holder === guestBId
            ? "guestB"
            : null;
    } catch {
      mirrorHolderActor = null;
    }
  }
  if (tokenId && slot) {
    try {
      const events = await getLifecycleEventsForSerial({
        topicId,
        tokenId,
        serial,
      });
      const resold = latestEvent(events, "RESOLD");
      const storedReceipt = await getLatestRecoveryReceiptForSerial(serial);
      const automationProof = await getLatestAutomationProofForSerial(serial);
      if (!listing?.active && resold) {
        initialProof = {
          title: "Resale completed",
          statusLabel: "Transferred",
          actionLabel: "Resale purchase",
          serial,
          actorLabel: accountLabel(resold.to, guestAId, guestBId),
          counterpartyLabel: accountLabel(resold.from, guestAId, guestBId),
          currentState:
            "The listed pass was purchased and the buyer is now the current holder.",
          askPriceHbar: resold.priceHbar,
          royaltyHbar:
            resold.priceHbar != null ? calcRoyalty(resold.priceHbar) : undefined,
          sellerNetHbar:
            resold.priceHbar != null ? calcSellerNet(resold.priceHbar) : undefined,
          txId: resold.txId,
          occurredAt: resold.timestamp,
          policyBasis: `${slot.policySnapshot.label} (${slot.policySnapshot.snapshotId})`,
          policySnapshot: slot.policySnapshot,
        };
      } else if (storedReceipt) {
        initialProof = storedReceipt;
      } else if (listing?.active) {
        const listed = latestEvent(events, "LISTED");
        initialProof = {
          title: "Active resale listing",
          statusLabel: "Listed",
          actionLabel: "Resale listing",
          serial,
          actorLabel: accountLabel(listing.sellerAccountId, guestAId, guestBId),
          currentState:
            "This pass is listed. Another customer can buy it through the resale flow.",
          askPriceHbar: listing.askPriceHbar,
          royaltyHbar: calcRoyalty(listing.askPriceHbar),
          sellerNetHbar: calcSellerNet(listing.askPriceHbar),
          policyBasis: `${slot.policySnapshot.label} (${slot.policySnapshot.snapshotId})`,
          policySnapshot: slot.policySnapshot,
          occurredAt: listed?.timestamp ?? listing.createdAt,
          auditTxId: listed?.txId,
        };
      }
      if (initialProof && automationProof) {
        initialProof = {
          ...initialProof,
          scheduleProof: automationProof.scheduleProof,
          agentTrace: automationProof.agentTrace,
          agentProof: automationProof.agentProof,
        };
      }
    } catch {
      initialProof = getRecordedRecoveryReceipt(serial);
    }
  }
  if (!initialProof) {
    initialProof = getRecordedRecoveryReceipt(serial);
  }
  const pageBlockReason = initialProof
    ? null
    : resaleBlockReason(
        chainStatus,
        slot?.resaleAllowed ?? false,
        slot?.policySnapshot.releaseAllowed ?? false
      );

  return (
    <div className="text-sm">
      <Link
        href={`/slots/${serial}`}
        className={cn(
          getButtonClassName("textLink"),
          "inline-flex min-h-[44px] items-center"
        )}
      >
        ← Back to session
      </Link>
      <h1 className="mt-2 text-xl font-semibold">
        {initialProof
          ? "Recovery receipt for this pass"
          : pageBlockReason
            ? "Recovery status for this pass"
            : "Recover this pass"}
      </h1>
      {pageBlockReason ? (
        <p className="mt-2 rounded border border-slate-200 bg-slate-50 p-3 text-slate-700">
          {pageBlockReason}
        </p>
      ) : (
        <>
          <p className="mt-2 text-slate-600">
            Concierge can help the current holder list this pass for resale or
            release it back to the provider with a real testnet HBAR refund when
            the booked policy allows it.
          </p>
          <p className="mt-2 text-slate-600">
            When resale is used, this demo applies a fixed <strong>10%</strong>{" "}
            provider fee. When release is used, refund copy appears only after
            testnet HBAR actually moves.
          </p>
          <p className="mt-2 rounded border border-slate-200 bg-slate-50 p-3 text-slate-700">
            <span className="font-medium text-slate-900">Important:</span> the app can
            preview the provider fee, but final amounts should be verified from the
            resale transaction and HashScan. Treat the resale ask as an estimate, not a
            guaranteed payout.
          </p>
        </>
      )}
      <ResaleClient
        serial={serial}
        tokenId={tokenId}
        mirrorHolderActor={mirrorHolderActor}
        initialListing={listing ?? null}
        currentStatus={chainStatus}
        resaleAllowed={slot?.resaleAllowed ?? false}
        releaseAllowed={slot?.policySnapshot.releaseAllowed ?? false}
        slotTitle={slot?.title ?? `Pass ${serial}`}
        primaryPriceHbar={slot?.primaryPriceHbar ?? 20}
        initialProof={initialProof}
        recoveryMode={searchParams?.mode === "recovery"}
        lockTo={lockTo}
      />
    </div>
  );
}
