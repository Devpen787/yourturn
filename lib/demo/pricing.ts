import { calcRoyalty, calcSellerNet } from "@/lib/domain/fees";

/**
 * Demo-only convention: the UI shows US dollars as if **1 ℏ on testnet = US$1**.
 * Transfers are still in ℏ; there is no real USD oracle.
 */
export const DEMO_HBAR_EQUALS_USD_ONE_LINE =
  "Demo: 1 ℏ = US$1 on testnet (not a real FX rate). Royalty is 10% of the ask, shown in USD and ℏ.";

export function formatDemoUsdFromHbar(hbar: number): string {
  if (!Number.isFinite(hbar)) return "US$—";
  const rounded = Math.round(hbar * 100) / 100;
  const s = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `US$${s}`;
}

/** Format ℏ amount for display (same numeric idea as USD in 1:1 demo). */
export function formatDemoHbar(hbar: number): string {
  if (!Number.isFinite(hbar)) return "— ℏ";
  const rounded = Math.round(hbar * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)} ℏ`;
}

export function describeDemoRoyaltyFromAsk(askAmount: number): {
  royaltyUsd: string;
  royaltyHbar: string;
  netUsd: string;
  netHbar: string;
} {
  const r = calcRoyalty(askAmount);
  const n = calcSellerNet(askAmount);
  return {
    royaltyUsd: formatDemoUsdFromHbar(r),
    royaltyHbar: formatDemoHbar(r),
    netUsd: formatDemoUsdFromHbar(n),
    netHbar: formatDemoHbar(n),
  };
}
