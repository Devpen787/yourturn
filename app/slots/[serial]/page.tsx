import Link from "next/link";
import { canResell } from "@/lib/domain/guards";
import { getButtonClassName } from "@/components/ui/button-classes";
import { cn } from "@/lib/cn";
import { parseNftMetadataBlob } from "@/lib/domain/metadata";
import { getHashscanTokenUrl, getHashscanTopicUrl } from "@/lib/hedera/hashscan";
import { getNftBySerial } from "@/lib/hedera/mirror";
import { getTreasuryIdString } from "@/lib/hedera/token";
import { formatSlotDateTime } from "@/lib/format/slotDateTime";
import { getLifecycleEventsForSerial, readSlotLiveState } from "@/lib/server/slotChain";
import { getStoredTokenId, getStoredTopicId } from "@/lib/store/ids";
import { getActiveListingForSerial } from "@/lib/store/listings";
import { getSlotBySerial } from "@/lib/store/slots";
import type { LifecycleEvent } from "@/lib/types/event";
import { SlotDetailStickyBar } from "@/components/SlotDetailStickyBar";
import { SlotPassHeroCard } from "@/components/slots/SlotPassHeroCard";
import { SlotResaleCta } from "./SlotResaleCta";

export const dynamic = "force-dynamic";

function statusSummary(status: string): string {
  if (status === "AVAILABLE") return "This session is still open and can be booked.";
  if (status === "HELD") return "Someone currently holds this pass and can use it or resell it if the provider allows it.";
  if (status === "FROZEN") return "The provider has paused this pass, so it cannot move until it is reopened.";
  if (status === "USED") return "This pass has already been checked in and is now closed.";
  return "Status unavailable.";
}

function nextStepSummary(
  status: string,
  showResell: boolean,
  listingActive: boolean
): string {
  if (status === "AVAILABLE") {
    return "Go back to the sessions page, review the booking, and book this session.";
  }
  if (status === "HELD" && listingActive) {
    return "This pass already has an active listing. The next buyer can take over from the resale page.";
  }
  if (status === "HELD" && showResell) {
    return "If the current holder cannot attend, they can list this pass for sale and let another buyer take over.";
  }
  if (status === "HELD") {
    return "This pass is active and ready to be checked in when the session starts.";
  }
  if (status === "FROZEN") {
    return "Nothing can move until the provider reopens this pass.";
  }
  if (status === "USED") {
    return "This pass is finished. The provider can create a fresh session if they want to run the demo again.";
  }
  return "Refresh in a moment if the latest update has not appeared yet.";
}

function holderSummary(
  status: string,
  holderAccountId: string | null,
  guestAId: string,
  guestBId: string
): string {
  if (status === "AVAILABLE") return "Not booked yet";
  if (status === "USED") return "Checked in and closed";
  if (!holderAccountId) return "Waiting for live holder data";
  if (holderAccountId === guestAId) return "Person A";
  if (holderAccountId === guestBId) return "Person B";
  return holderAccountId;
}

function actorLabel(
  accountId: string | undefined,
  guestAId: string,
  guestBId: string,
  treasuryId: string
): string {
  if (!accountId) return "Unknown account";
  if (accountId === guestAId) return "Person A";
  if (accountId === guestBId) return "Person B";
  if (accountId === treasuryId) return "Business inventory";
  return accountId;
}

function eventSummary(
  event: LifecycleEvent,
  guestAId: string,
  guestBId: string,
  treasuryId: string
): string {
  if (event.eventType === "BOOKED") {
    return `${actorLabel(event.to, guestAId, guestBId, treasuryId)} booked this session${
      event.priceHbar != null ? ` for ${event.priceHbar} ℏ` : ""
    }.`;
  }
  if (event.eventType === "LISTED") {
    return `${actorLabel(event.from, guestAId, guestBId, treasuryId)} listed this pass${
      event.priceHbar != null ? ` at ${event.priceHbar} ℏ` : ""
    }.`;
  }
  if (event.eventType === "RESOLD") {
    return `${actorLabel(event.to, guestAId, guestBId, treasuryId)} took over the pass from ${actorLabel(
      event.from,
      guestAId,
      guestBId,
      treasuryId
    )}${event.priceHbar != null ? ` for ${event.priceHbar} ℏ` : ""}.`;
  }
  if (event.eventType === "FROZEN") {
    return `The provider paused this pass for ${actorLabel(
      event.to,
      guestAId,
      guestBId,
      treasuryId
    )}.`;
  }
  if (event.eventType === "UNFROZEN") {
    return `The provider reopened this pass for ${actorLabel(
      event.to,
      guestAId,
      guestBId,
      treasuryId
    )}.`;
  }
  if (event.eventType === "USED") {
    return "The provider checked this pass in and closed it.";
  }
  return event.eventType;
}

export default async function SlotDetailPage({
  params,
}: {
  params: { serial: string };
}) {
  const serial = Number(params.serial);
  if (!Number.isFinite(serial) || serial < 1) {
    return <p>Invalid session link.</p>;
  }
  let tokenId: string | null = null;
  let topicId: string | null = null;
  const guestAId = process.env.HEDERA_GUEST_A_ID ?? "";
  const guestBId = process.env.HEDERA_GUEST_B_ID ?? "";
  try {
    tokenId = await getStoredTokenId();
    topicId = await getStoredTopicId();
  } catch {
    return <p>Server storage not configured (Redis).</p>;
  }
  if (!tokenId) return <p>Token not initialized.</p>;

  const treasury = getTreasuryIdString();
  const slot = await getSlotBySerial(serial);
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
        <h1 className="mt-4 text-xl font-semibold">Session not found</h1>
        <p className="mt-2 max-w-xl text-slate-600">
          This reference does not match a live session in the current demo. Go back
          to the sessions list and pick an active booking from there.
        </p>
      </div>
    );
  }

  const chain = await readSlotLiveState({
    tokenId,
    serial,
    treasuryAccountId: treasury,
    topicId,
  });
  const nft = await getNftBySerial(tokenId, serial);
  const meta = nft?.metadata
    ? parseNftMetadataBlob(nft.metadata)
    : null;
  const listing = await getActiveListingForSerial(serial);
  const lifecycleEvents = (
    await getLifecycleEventsForSerial({
      topicId,
      tokenId,
      serial,
    })
  ).map((event, index) => ({
    key: `${event.timestamp}-${event.eventType}-${index}`,
    event,
  }));

  const showResell =
    slot &&
    canResell({ status: chain.status, resaleAllowed: slot.resaleAllowed });

  return (
    <div
      className={cn(
        "text-sm",
        showResell && "pb-24 md:pb-0"
      )}
    >
      <Link
        href="/slots"
        className="inline-flex min-h-[44px] items-center rounded-md text-blue-700 underline decoration-blue-700/40 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
      >
        ← All sessions
      </Link>
      <h1 className="mt-2 text-xl font-semibold">
        {slot?.title ?? `Session ref #${serial}`}
      </h1>
      <p className="mt-1 text-slate-600">
        Everything about this session pass in one place: status, next step, and proof links.
      </p>
      <SlotPassHeroCard
        className="mt-4"
        serial={serial}
        chainStatus={chain.status}
        statusSummary={statusSummary(chain.status)}
        nextStep={nextStepSummary(
          chain.status,
          !!showResell,
          !!listing?.active
        )}
        holderLabel={holderSummary(
          chain.status,
          chain.holderAccountId,
          guestAId,
          guestBId
        )}
        slot={{
          primaryPriceHbar: slot.primaryPriceHbar,
          startTime: slot.startTime,
          endTime: slot.endTime,
          resaleAllowed: slot.resaleAllowed,
        }}
      />
      {listing?.active && (
        <p className="mt-4 rounded bg-amber-50 p-2">
          Active resale listing: {listing.askPriceHbar} ℏ. A new buyer can take over here —{" "}
          <Link
            href={`/resale/${serial}`}
            className={cn(
              getButtonClassName("textLink"),
              "inline-flex min-h-[44px] items-center font-medium"
            )}
          >
            resale page
          </Link>
        </p>
      )}
      {showResell && (
        <div className="mt-4">
          <SlotResaleCta serial={serial} />
        </div>
      )}
      <section className="mt-6 rounded border border-slate-200 bg-white p-4">
        <h2 className="font-medium text-slate-900">Proof links</h2>
        <p className="mt-1 text-sm text-slate-600">
          Use these if you want to verify the pass or audit trail outside the app.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <a
            className="inline-flex min-h-[44px] items-center rounded-md text-blue-700 underline decoration-blue-700/40 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            href={getHashscanTokenUrl(tokenId)}
            target="_blank"
            rel="noreferrer"
            title="Opens HashScan in a new tab"
          >
            Token on HashScan (new tab)
          </a>
          {topicId && (
            <a
              className="inline-flex min-h-[44px] items-center rounded-md text-blue-700 underline decoration-blue-700/40 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              href={getHashscanTopicUrl(topicId)}
              target="_blank"
              rel="noreferrer"
              title="Opens HashScan in a new tab"
            >
              HCS topic on HashScan (new tab)
            </a>
          )}
        </div>
      </section>
      {meta && (
        <details className="group mt-6 rounded border border-slate-200 bg-white p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
            <span
              className="inline-block text-slate-500 transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none"
              aria-hidden
            >
              ▸
            </span>
            Technical details
          </summary>
          <pre className="mt-3 overflow-x-auto rounded bg-slate-100 p-2 text-xs">
            {JSON.stringify(meta, null, 2)}
          </pre>
        </details>
      )}
      <SlotDetailStickyBar serial={serial} showResell={!!showResell} />
      <section className="mt-6 rounded border border-slate-200 bg-white p-4">
        <h2 className="font-medium text-slate-900">Pass history (optional)</h2>
        <p className="mt-1 text-sm text-slate-600">
          This is the lifecycle trail behind the current status above. Open the raw
          event details only if you want the technical proof.
        </p>
        {lifecycleEvents.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {lifecycleEvents.map(({ key, event }) => (
              <li key={key} className="rounded border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm text-slate-900">
                  {eventSummary(event, guestAId, guestBId, treasury)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatSlotDateTime(event.timestamp)}
                </p>
                <details className="mt-2 text-xs text-slate-600">
                  <summary className="cursor-pointer font-medium text-slate-700">
                    Raw event details
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-[11px] text-slate-700">
                    {JSON.stringify(event, null, 2)}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            No lifecycle events have been recorded for this pass yet.
          </p>
        )}
      </section>
    </div>
  );
}
