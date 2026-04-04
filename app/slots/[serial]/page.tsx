import Link from "next/link";
import { canResell } from "@/lib/domain/guards";
import { parseNftMetadataBlob } from "@/lib/domain/metadata";
import { getHashscanTokenUrl, getHashscanTopicUrl } from "@/lib/hedera/hashscan";
import { getNftBySerial, getTopicMessages } from "@/lib/hedera/mirror";
import { getTreasuryIdString } from "@/lib/hedera/token";
import { readSlotChainState } from "@/lib/server/slotChain";
import { getStoredTokenId, getStoredTopicId } from "@/lib/store/ids";
import { getActiveListingForSerial } from "@/lib/store/listings";
import { getSlotBySerial } from "@/lib/store/slots";
import { SlotResaleCta } from "./SlotResaleCta";

export const dynamic = "force-dynamic";

function statusTone(status: string): string {
  if (status === "AVAILABLE") return "bg-slate-100 text-slate-800";
  if (status === "HELD") return "bg-blue-50 text-blue-900";
  if (status === "FROZEN") return "bg-amber-50 text-amber-900";
  if (status === "USED") return "bg-emerald-50 text-emerald-900";
  return "bg-slate-100 text-slate-800";
}

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
    return "Go back to the sessions page and book this session.";
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

export default async function SlotDetailPage({
  params,
}: {
  params: { serial: string };
}) {
  const serial = Number(params.serial);
  if (!Number.isFinite(serial) || serial < 1) {
    return <p>Invalid serial</p>;
  }
  let tokenId: string | null = null;
  let topicId: string | null = null;
  try {
    tokenId = await getStoredTokenId();
    topicId = await getStoredTopicId();
  } catch {
    return <p>Server storage not configured (Redis).</p>;
  }
  if (!tokenId) return <p>Token not initialized.</p>;

  const treasury = getTreasuryIdString();
  const chain = await readSlotChainState({
    tokenId,
    serial,
    treasuryAccountId: treasury,
  });
  const nft = await getNftBySerial(tokenId, serial);
  const slot = await getSlotBySerial(serial);
  const meta = nft?.metadata
    ? parseNftMetadataBlob(nft.metadata)
    : null;
  const listing = await getActiveListingForSerial(serial);
  const messages = topicId ? await getTopicMessages(topicId) : { messages: [] };
  const events =
    messages.messages?.filter((m) => {
      try {
        const j = JSON.parse(
          Buffer.from(m.message, "base64").toString("utf8")
        ) as { serial?: number };
        return j.serial === serial;
      } catch {
        return false;
      }
    }) ?? [];

  const showResell =
    slot &&
    canResell({ status: chain.status, resaleAllowed: slot.resaleAllowed });

  return (
    <div className="text-sm">
      <Link href="/slots" className="text-blue-700 underline">
        ← All slots
      </Link>
      <h1 className="mt-2 text-xl font-semibold">
        {slot?.title ?? `Serial #${serial}`}
      </h1>
      <p className="mt-1 text-slate-600">
        Everything about this session pass in one place: status, next step, and proof links.
      </p>
      <div className="mt-4 space-y-2 rounded border border-slate-200 bg-white p-4">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-medium">Status:</span>
          <span
            className={`inline-flex rounded px-2 py-1 text-xs font-medium ${statusTone(
              chain.status
            )}`}
          >
            {chain.status}
          </span>
        </p>
        <p className="text-slate-600">{statusSummary(chain.status)}</p>
        <p className="rounded bg-slate-50 p-3 text-slate-700">
          <span className="font-medium text-slate-900">Next step:</span>{" "}
          {nextStepSummary(chain.status, !!showResell, !!listing?.active)}
        </p>
        <p>
          <span className="font-medium">Current holder:</span>{" "}
          {chain.holderAccountId || "—"}
        </p>
        {slot && (
          <div className="grid gap-2 md:grid-cols-2">
            <p>
              <span className="font-medium">Primary price:</span>{" "}
              {slot.primaryPriceHbar} ℏ
            </p>
            <p>
              <span className="font-medium">Start:</span> {slot.startTime}
            </p>
            <p>
              <span className="font-medium">End:</span> {slot.endTime}
            </p>
            <p>
              <span className="font-medium">Resale allowed:</span>{" "}
              {slot.resaleAllowed ? "Yes" : "No"}
            </p>
          </div>
        )}
      </div>
      {listing?.active && (
        <p className="mt-4 rounded bg-amber-50 p-2">
          Active resale listing: {listing.askPriceHbar} ℏ. A new buyer can take over here —{" "}
          <Link href={`/resale/${serial}`} className="underline">
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
            className="text-blue-700 underline"
            href={getHashscanTokenUrl(tokenId)}
            target="_blank"
            rel="noreferrer"
          >
            Token on HashScan
          </a>
          {topicId && (
            <a
              className="text-blue-700 underline"
              href={getHashscanTopicUrl(topicId)}
              target="_blank"
              rel="noreferrer"
            >
              HCS topic on HashScan
            </a>
          )}
        </div>
      </section>
      {meta && (
        <details className="mt-6 rounded border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer font-medium text-slate-900">
            Technical details
          </summary>
          <pre className="mt-3 overflow-x-auto rounded bg-slate-100 p-2 text-xs">
            {JSON.stringify(meta, null, 2)}
          </pre>
        </details>
      )}
      <section className="mt-6">
        <h2 className="font-medium">Technical audit trail</h2>
        <p className="mt-1 text-xs text-slate-600">
          This is optional proof detail. The live pass status above is the easiest thing to follow during the demo.
        </p>
        <ul className="mt-2 space-y-1 text-xs">
          {events.map((m) => (
            <li key={m.consensus_timestamp} className="font-mono">
              {Buffer.from(m.message, "base64").toString("utf8")}
            </li>
          ))}
          {events.length === 0 && (
            <li className="text-slate-500">No events for this serial yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
