import type { OwnerPolicySnapshot } from "@/lib/policy/policy";
import type { ConciergeAgentTrace, ScheduleAutomationProof } from "@/lib/types/automation";

export type RecoveryProofDetails = {
  title: string;
  statusLabel: string;
  actionLabel: string;
  serial: number;
  actorLabel?: string;
  counterpartyLabel?: string;
  currentState: string;
  askPriceHbar?: number;
  refundHbar?: number;
  royaltyHbar?: number;
  sellerNetHbar?: number;
  approvalId?: string;
  auditTxId?: string;
  txId?: string;
  releaseTxId?: string;
  burnTxId?: string;
  hashscanUrl?: string;
  releaseHashscanUrl?: string;
  burnHashscanUrl?: string;
  policyBasis?: string;
  policySnapshot?: OwnerPolicySnapshot;
  scheduleProof?: ScheduleAutomationProof;
  agentTrace?: ConciergeAgentTrace;
  occurredAt?: string;
};
