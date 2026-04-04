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
    return <p>Invalid session link.</p>;
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
      <h1 className="mt-2 text-xl font-semibold">Resell or buy this pass</h1>
      <p className="mt-2 text-slate-600">
        This is the resale step: Person A lists the pass and Person B becomes the
        new holder by buying it under provider rules (like secondary ticket resale,
        not a free transfer).
      </p>
      <p className="mt-2 text-slate-600">
        This demo uses a fixed <strong>10%</strong> provider fee on resale. The
        seller sets the ask and may sell above cost, at cost, or below cost.
      </p>
      <p className="mt-2 rounded border border-slate-200 bg-slate-50 p-3 text-slate-700">
        <span className="font-medium text-slate-900">Important:</span> the app can
        preview the provider fee, but final amounts should be verified from the
        resale transaction and HashScan. Treat a <strong>{previewAsk} ℏ</strong> ask
        as an estimate, not a guaranteed payout.
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
