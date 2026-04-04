export type SlotRecord = {
  tokenId: string;
  serial: number;
  slotId: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  primaryPriceHbar: number;
  /** Product-facing list price in USD (demo); chain still uses `primaryPriceHbar` ℏ */
  priceUsd?: number;
  resaleAllowed: boolean;
  seeded: boolean;
  mintedAt: string;
  listingActive: boolean;
};
