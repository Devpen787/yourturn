export type LifecycleEvent = {
  eventType:
    | "BOOKED"
    | "LISTED"
    | "RESOLD"
    | "FROZEN"
    | "UNFROZEN"
    | "USED"
    | "CANCEL_RELEASED";
  tokenId: string;
  serial: number;
  from?: string;
  to?: string;
  priceHbar?: number;
  refundHbar?: number;
  txId?: string;
  timestamp: string;
};
