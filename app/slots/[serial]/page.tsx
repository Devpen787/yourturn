import Link from "next/link";
import { canResell } from "@/lib/domain/guards";
import { parseNftMetadataBlob } from "@/lib/domain/metadata";
import { getHashscanTokenUrl, getHashscanTopicUrl } from "@/lib/hedera/hashscan";
import { getNftBySerial, getTopicMessages } from "@/lib/hedera/mirror";
import { getTreasuryIdString } from "@/lib/hedera/token";
import { readSlotChainState } from "@/lib/server/slotChain";
import { getStoredTokenId, getStoredTopicId } from "@/lib/store/ids";
import { getActiveListingForTokenSerial } from "@/lib/store/listings";
import { getSlotByTokenSerial } from "@/lib/store/slots";
import { SlotResaleCta } from "./SlotResaleCta";

export const dynamic = "force-dynamic";

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
  const slot = await getSlotByTokenSerial(tokenId, serial);
  const metaFromChain = nft?.metadata
    ? parseNftMetadataBlob(nft.metadata)
    : null;
  const meta =
    metaFromChain && slot
      ? {
          ...metaFromChain,
          title: metaFromChain.title || slot.title,
          startTime: metaFromChain.startTime || slot.startTime,
          endTime: metaFromChain.endTime || slot.endTime,
          location: metaFromChain.location || slot.location,
        }
      : metaFromChain;
  const listing = await getActiveListingForTokenSerial(tokenId, serial);
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
      <h1 className="mt-2 text-xl font-semibold">Serial #{serial}</h1>
      {!slot && (
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-amber-950">
          This serial is not in the app&apos;s current demo list (for example after{" "}
          <strong>Reset Demo</strong> minted new NFTs). Hedera may still show this
          serial as burned or old inventory. Use{" "}
          <Link href="/slots" className="font-medium underline">
            Public slots
          </Link>{" "}
          for the three slots you can book now.
        </p>
      )}
      <div className="mt-4 space-y-2 rounded border border-slate-200 bg-white p-4">
        <p>
          <span className="font-medium">Status:</span>{" "}
          {slot ? chain.status : `${chain.status} (on-chain only)`}
        </p>
        <p>
          <span className="font-medium">Holder:</span>{" "}
          {chain.holderAccountId || "—"}
        </p>
        {slot && (
          <p>
            <span className="font-medium">Primary price:</span>{" "}
            {slot.primaryPriceHbar} ℏ
          </p>
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
