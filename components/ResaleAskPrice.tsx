"use client";

/** Resale ask: USD + ℏ; demo 1 ℏ = US$1 on testnet. */
export function ResaleAskPrice({
  askUsd,
  askPriceHbar,
}: {
  askUsd?: number;
  askPriceHbar: number;
}) {
  if (askUsd != null && Number.isFinite(askUsd)) {
    const usd =
      Math.round(askUsd * 100) / 100 === askUsd
        ? String(askUsd)
        : askUsd.toFixed(2);
    return (
      <span>
        <strong>US${usd}</strong>
        <span className="font-normal text-slate-600">
          {" "}
          · {askPriceHbar} ℏ on testnet
          <span className="text-slate-500"> (demo: 1 ℏ = US$1)</span>
        </span>
      </span>
    );
  }
  return (
    <span>
      <strong>{askPriceHbar} ℏ</strong>
      <span className="font-normal text-slate-500"> (demo: 1 ℏ = US$1)</span>
    </span>
  );
}
