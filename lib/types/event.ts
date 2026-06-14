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
  agentProof?: {
    agentName: string;
    agentVersion: string;
    manifestVersion: string;
    toolId: string;
    approvalId?: string;
    proofType: "agent_policy_approved_action";
  };
  timestamp: string;
};
