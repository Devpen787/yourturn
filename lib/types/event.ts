export type LifecycleEvent = {
  eventType: "BOOKED" | "LISTED" | "RESOLD" | "FROZEN" | "UNFROZEN" | "USED";
  tokenId: string;
  serial: number;
  from?: string;
  to?: string;
  priceHbar?: number;
  txId?: string;
  timestamp: string;
};
