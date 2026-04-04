import Link from "next/link";
import { calcRoyalty, calcSellerNet } from "@/lib/domain/fees";
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
  const previewAsk = listing?.askPriceHbar ?? 20;
  const royalty = calcRoyalty(previewAsk);
  const net = calcSellerNet(previewAsk);

  return (
    <div className="text-sm">
      <Link href={`/slots/${serial}`} className="text-blue-700 underline">
        ← Slot #{serial}
      </Link>
      <h1 className="mt-2 text-xl font-semibold">Resale · Serial #{serial}</h1>
      <p className="mt-2 text-slate-600">
        Royalty is fixed at 10% (numerator 1 / denominator 10). Preview for{" "}
        {previewAsk} ℏ ask: issuer royalty {royalty.toFixed(2)} ℏ, seller net{" "}
        {net.toFixed(2)} ℏ.
      </p>
      <ResaleClient
        serial={serial}
        tokenId={tokenId}
        initialListing={listing ?? null}
        slotTitle={slot?.title ?? `Serial ${serial}`}
      />
    </div>
  );
}
