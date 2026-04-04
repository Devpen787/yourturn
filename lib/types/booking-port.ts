export type BookingPortErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "HEDERA_TX_ERROR"
  | "INTERNAL_ERROR";

export type BookingPortAction =
  | "book"
  | "create_listing"
  | "buy_listing"
  | "freeze"
  | "unfreeze"
  | "mark_used";

export type BookingActorRef =
  | { kind: "demoActor"; id: "guestA" | "guestB" | "issuer" }
  | { kind: "hederaAccount"; accountId: string };

export type ApprovalProof = {
  approvedBy: string;
  approvedAt: string;
  source: "ui_click" | "agent_handoff" | "api_client";
};

export type SlotStatus = "AVAILABLE" | "HELD" | "FROZEN" | "USED";

export type BookingSlotView = {
  tokenId: string;
  serial: number;
  slotId: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  primaryPriceHbar: number;
  resaleAllowed: boolean;
  listingActive: boolean;
  status: SlotStatus;
  holderAccountId: string | null;
};

export type ResaleListingView = {
  tokenId: string;
  serial: number;
  sellerAccountId: string;
  askPriceHbar: number;
  royaltyHbar: number;
  sellerNetHbar: number;
  active: boolean;
  createdAt: string;
};

export type ActionPreview<TAction extends string, TDetails> = {
  action: TAction;
  previewId: string;
  summary: string;
  details: TDetails;
  expiresAt: string;
};

export interface BookingPort {
  listSlots(): Promise<BookingSlotView[]>;
  getSlot(serial: number): Promise<BookingSlotView | null>;
  listHoldings(holder: BookingActorRef): Promise<BookingSlotView[]>;
  getListing(serial: number): Promise<ResaleListingView | null>;
  getLifecycle(serial: number): Promise<
    Array<Record<string, unknown> & { serial: number }>
  >;

  previewBook(input: {
    buyer: BookingActorRef;
    serial: number;
  }): Promise<
    ActionPreview<
      "book",
      {
        serial: number;
        buyerAccountId: string;
        priceHbar: number;
      }
    >
  >;

  confirmBook(input: {
    previewId: string;
    approval: ApprovalProof;
  }): Promise<{ txId: string; hashscanUrl: string }>;

  previewCreateListing(input: {
    seller: BookingActorRef;
    serial: number;
    askPriceHbar: number;
  }): Promise<ActionPreview<"create_listing", ResaleListingView>>;

  confirmCreateListing(input: {
    previewId: string;
    approval: ApprovalProof;
  }): Promise<{ listing: ResaleListingView }>;

  previewBuyListing(input: {
    buyer: BookingActorRef;
    serial: number;
  }): Promise<ActionPreview<"buy_listing", ResaleListingView>>;

  confirmBuyListing(input: {
    previewId: string;
    approval: ApprovalProof;
  }): Promise<{ txId: string; hashscanUrl: string }>;

  previewFreeze(input: {
    issuer: BookingActorRef;
    serial: number;
    holder: BookingActorRef;
  }): Promise<
    ActionPreview<
      "freeze",
      {
        serial: number;
        holderAccountId: string;
      }
    >
  >;

  confirmFreeze(input: {
    previewId: string;
    approval: ApprovalProof;
  }): Promise<{ ok: true }>;

  previewUnfreeze(input: {
    issuer: BookingActorRef;
    serial: number;
    holder: BookingActorRef;
  }): Promise<
    ActionPreview<
      "unfreeze",
      {
        serial: number;
        holderAccountId: string;
      }
    >
  >;

  confirmUnfreeze(input: {
    previewId: string;
    approval: ApprovalProof;
  }): Promise<{ ok: true }>;

  previewMarkUsed(input: {
    issuer: BookingActorRef;
    serial: number;
  }): Promise<
    ActionPreview<
      "mark_used",
      {
        serial: number;
        currentHolderAccountId: string | null;
      }
    >
  >;

  confirmMarkUsed(input: {
    previewId: string;
    approval: ApprovalProof;
  }): Promise<{ ok: true }>;
}
