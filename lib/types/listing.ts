export type ResaleListing = {
  tokenId: string;
  serial: number;
  sellerAccountId: string;
  /** Settlement amount on Hedera (demo: same numeric value as `askUsd` when set). */
  askPriceHbar: number;
  /** List price in USD (optional for older Redis rows). */
  askUsd?: number;
  active: boolean;
  createdAt: string;
};
