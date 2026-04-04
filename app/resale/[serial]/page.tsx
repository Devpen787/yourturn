import Link from "next/link";
import { DemoPricingNotice } from "@/components/DemoPricingNotice";
import { describeDemoRoyaltyFromAsk } from "@/lib/demo/pricing";
import { getStoredTokenId } from "@/lib/store/ids";
import { getActiveListingForTokenSerial } from "@/lib/store/listings";
import { getSlotByTokenSerial } from "@/lib/store/slots";
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
    if (tokenId) {
      listing = await getActiveListingForTokenSerial(tokenId, serial);
    }
  } catch {
    listing = null;
  }
  try {
    if (tokenId) {
      slot = await getSlotByTokenSerial(tokenId, serial);
    }
  } catch {
    slot = undefined;
  }
  const previewAsk = listing?.askPriceHbar ?? 20;
  const previewUsd = listing?.askUsd ?? listing?.askPriceHbar ?? 20;
  const previewRv = describeDemoRoyaltyFromAsk(previewAsk);

  return (
    <div className="text-sm">
      <Link href={`/slots/${serial}`} className="text-blue-700 underline">
        ← Slot #{serial}
      </Link>
      <h1 className="mt-2 text-xl font-semibold">Resale · Serial #{serial}</h1>
      <DemoPricingNotice />
      <p className="mt-2 text-slate-600">
        Listings are stored in the app (Redis), not on-chain. After you create one,
        it appears below, on the slot&apos;s <Link href={`/slots/${serial}`} className="text-blue-700 underline">Details</Link> page, and on{" "}
        <Link href="/slots" className="text-blue-700 underline">Public slots</Link>.
      </p>
      <p className="mt-2 text-slate-600">
        Example at a <strong>US${previewUsd}</strong> ask (= {previewAsk} ℏ in this
        demo): issuer royalty <strong>{previewRv.royaltyUsd}</strong> (
        {previewRv.royaltyHbar}), seller net ≈ <strong>{previewRv.netUsd}</strong>{" "}
        ({previewRv.netHbar}). Enforced on-chain via HTS custom royalty fee.
      </p>
      <ResaleClient
        serial={serial}
        tokenId={tokenId}
        initialListing={listing ?? null}
        slotTitle={slot?.title ?? `Serial ${serial}`}
        guestAId={process.env.HEDERA_GUEST_A_ID ?? ""}
        guestBId={process.env.HEDERA_GUEST_B_ID ?? ""}
      />
    </div>
  );
}
