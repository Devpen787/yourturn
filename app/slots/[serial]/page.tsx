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
  if (status === "AVAILABLE") return "The booking right is still with treasury and can be booked.";
  if (status === "HELD") return "A guest currently holds this booking right and can use it or resell it if policy allows.";
  if (status === "FROZEN") return "The issuer has frozen this booking right, so it cannot move until it is unfrozen.";
  if (status === "USED") return "This booking right has already been used and its lifecycle is closed.";
  return "Status unavailable.";
}

function nextStepSummary(
  status: string,
  showResell: boolean,
  listingActive: boolean
): string {
  if (status === "AVAILABLE") {
    return "Go back to the slot list and book this service slot from a guest account.";
  }
  if (status === "HELD" && listingActive) {
    return "This booking right already has an active resale listing. Open the resale page to review it.";
  }
  if (status === "HELD" && showResell) {
    return "If the current holder cannot attend, they can open the resale page and list this slot under issuer rules.";
  }
  if (status === "HELD") {
    return "This booking right is active and ready to be used for the scheduled session.";
  }
  if (status === "FROZEN") {
    return "No movement is possible until the issuer unfreezes this booking right.";
  }
  if (status === "USED") {
    return "This lifecycle is complete. Use the issuer console for a new slot if you want another demo run.";
  }
  return "Refresh after the latest Mirror state lands.";
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
        Serial #{serial} detail view for the current booking-right lifecycle.
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
          <span className="font-medium">Holder:</span>{" "}
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
        {meta && (
          <pre className="mt-2 overflow-x-auto rounded bg-slate-100 p-2 text-xs">
            {JSON.stringify(meta, null, 2)}
          </pre>
        )}
        <p>
          <a
            className="text-blue-700 underline"
            href={getHashscanTokenUrl(tokenId)}
            target="_blank"
            rel="noreferrer"
          >
            Token on HashScan
          </a>
        </p>
        {topicId && (
          <p>
            <a
              className="text-blue-700 underline"
              href={getHashscanTopicUrl(topicId)}
              target="_blank"
              rel="noreferrer"
            >
              HCS topic on HashScan
            </a>
          </p>
        )}
      </div>
      {listing?.active && (
        <p className="mt-4 rounded bg-amber-50 p-2">
          Active resale listing: {listing.askPriceHbar} ℏ —{" "}
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
      <section className="mt-6">
        <h2 className="font-medium">Lifecycle messages (HCS)</h2>
        <p className="mt-1 text-xs text-slate-600">
          Use this as an audit trail. Hedera state still determines the current holder and status.
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
