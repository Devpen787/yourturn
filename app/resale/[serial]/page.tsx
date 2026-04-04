import Link from "next/link";
import { getStoredTokenId } from "@/lib/store/ids";
import { getActiveListingForSerial } from "@/lib/store/listings";
import { getSlotBySerial } from "@/lib/store/slots";
import { ResaleClient } from "./ResaleClient";

export const dynamic = "force-dynamic";

export default async function ResalePage({
  params,
}: {
  params: { serial: string };
}) {
  const serial = Number(params.serial);
  if (!Number.isFinite(serial) || serial < 1) {
    return <p>Invalid serial</p>;
  }
  let tokenId: string | null = null;
  try {
    tokenId = await getStoredTokenId();
  } catch {
    tokenId = null;
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
  const previewAsk = listing?.askPriceHbar ?? slot?.primaryPriceHbar ?? 20;

  return (
    <div className="text-sm">
      <Link href={`/slots/${serial}`} className="text-blue-700 underline">
        ← Back to session
      </Link>
      <h1 className="mt-2 text-xl font-semibold">Sell or buy this pass</h1>
      <p className="mt-2 text-slate-600">
        This is where one customer passes the session on to another. Person A
        lists the pass and Person B becomes the new holder by buying it under
        provider rules.
      </p>
      <p className="mt-2 text-slate-600">
        The current MVP uses a fixed <strong>10%</strong> provider royalty on resale.
        The current holder chooses the ask and may sell above cost, at cost, or below cost.
      </p>
      <p className="mt-2 rounded border border-slate-200 bg-slate-50 p-3 text-slate-700">
        <span className="font-medium text-slate-900">Important:</span> the app can
        preview royalty impact, but final settlement should be verified from the
        resale transaction result and HashScan proof. At the moment, treat the
        economics around a <strong>{previewAsk} ℏ</strong> ask as an estimate, not
        a guaranteed seller payout line.
      </p>
      <ResaleClient
        serial={serial}
        tokenId={tokenId}
        initialListing={listing ?? null}
        slotTitle={slot?.title ?? `Pass ${serial}`}
      />
    </div>
  );
}
