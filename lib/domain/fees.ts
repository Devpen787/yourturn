/** Fixed royalty: numerator 1 / denominator 10 = 10%. No fallback fee in v1. */

const NUMERATOR = 1;
const DENOMINATOR = 10;

export function calcRoyalty(askPriceHbar: number): number {
  return (askPriceHbar * NUMERATOR) / DENOMINATOR;
}

export function calcSellerNet(askPriceHbar: number): number {
  return askPriceHbar - calcRoyalty(askPriceHbar);
}
