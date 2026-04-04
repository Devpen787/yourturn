import Link from "next/link";
import { getSessionUser } from "@/lib/auth/get-session";
import { getTreasuryIdString } from "@/lib/hedera/token";
import { readSlotLiveState } from "@/lib/server/slotChain";
import { getButtonClassName } from "@/components/ui/button-classes";
import { cn } from "@/lib/cn";
import type { SlotStatus } from "@/lib/domain/guards";
import { getStoredTokenId, getStoredTopicId } from "@/lib/store/ids";
import { getActiveListingForSerial } from "@/lib/store/listings";
import { getSlotBySerial } from "@/lib/store/slots";
import { ResaleClient } from "./ResaleClient";

export const dynamic = "force-dynamic";

export default async function ResalePage({
  params,
}: {
  params: { serial: string };
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
  if (!slot) {
    return (
      <div className="text-sm">
        <Link
          href="/slots"
          className={cn(
            getButtonClassName("textLink"),
            "inline-flex min-h-[44px] items-center"
          )}
        >
          ← Back to sessions
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Pass not found</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          This reference is not part of the current live demo schedule. Go back to
          the sessions list and open a live pass from there.
        </p>
      </div>
    );
  }
  let mirrorHolderActor: "guestA" | "guestB" | null = null;
  let chainStatus: SlotStatus | null = null;
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
  const isClosed = chainStatus === "USED";
  const heading = isClosed ? "Pass closed" : "Resell or buy this pass";
  const description = isClosed
    ? "This pass has already been checked in and closed. You can review the resale history here, but the page is now read-only."
    : "This is the resale step: Person A lists the pass and Person B becomes the new holder by buying it under provider rules (like secondary ticket resale, not a free transfer).";

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
      <h1 className="mt-2 text-xl font-semibold">{heading}</h1>
      <p className="mt-2 text-slate-600">{description}</p>
      {!isClosed ? (
        <>
          <p className="mt-2 text-slate-600">
            This demo uses a fixed <strong>10%</strong> provider fee on resale. The
            seller sets the ask and may sell above cost, at cost, or below cost.
          </p>
          <p className="mt-2 rounded border border-slate-200 bg-slate-50 p-3 text-slate-700">
            <span className="font-medium text-slate-900">Important:</span> the app can
            preview the provider fee, but final amounts should be verified from the
            resale transaction and HashScan. Treat the resale ask as an estimate, not a
            guaranteed payout.
          </p>
        </>
      ) : null}
      <ResaleClient
        serial={serial}
        tokenId={tokenId}
        mirrorHolderActor={mirrorHolderActor}
        initialListing={listing ?? null}
        currentStatus={chainStatus}
        resaleAllowed={slot.resaleAllowed}
        slotTitle={slot.title}
        lockTo={lockTo}
      />
    </div>
  );
}
