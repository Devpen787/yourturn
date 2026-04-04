"use client";

/** List price: USD label + ℏ; demo assumes 1 ℏ = US$1 on testnet. */
export function SlotPrimaryPrice({
  priceUsd,
  primaryPriceHbar,
}: {
  priceUsd?: number;
  primaryPriceHbar: number;
}) {
  if (priceUsd != null && Number.isFinite(priceUsd)) {
    return (
      <span>
        <strong>US${priceUsd}</strong>
        <span className="font-normal text-slate-600">
          {" "}
          · {primaryPriceHbar} ℏ on testnet
          <span className="text-slate-500"> (demo: 1 ℏ = US$1)</span>
        </span>
      </span>
    );
  }
  return (
    <span>
      <strong>{primaryPriceHbar} ℏ</strong>
      <span className="font-normal text-slate-500"> (demo: 1 ℏ = US$1)</span>
    </span>
  );
}
