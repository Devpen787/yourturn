/**
 * Fixed royalty: numerator 1 / denominator 10 = 10%.
 * In the UI, the same numeric amount is shown as USD using the demo rule 1 ℏ = US$1.
 */

const NUMERATOR = 1;
const DENOMINATOR = 10;

export function calcRoyalty(askPriceHbar: number): number {
  return (askPriceHbar * NUMERATOR) / DENOMINATOR;
}

export function calcSellerNet(askPriceHbar: number): number {
  return askPriceHbar - calcRoyalty(askPriceHbar);
}
