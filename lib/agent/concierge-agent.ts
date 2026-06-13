import { AgentMode } from "@hashgraph/hedera-agent-kit";
import { TRANSFER_HBAR_TOOL } from "@hashgraph/hedera-agent-kit/plugins";
import type { ConciergeAgentTrace } from "@/lib/types/automation";
import type { OwnerPolicySnapshot } from "@/lib/policy/policy";

export function buildRecoveryPaymentAgentTrace(args: {
  serial: number;
  intent: string;
  actorLabel: string;
  approvalId: string;
  policySnapshot: OwnerPolicySnapshot;
  amountHbar: number;
  scheduleId?: string;
}): ConciergeAgentTrace {
  const createdAt = new Date().toISOString();
  return {
    traceId: `trace_${args.serial}_${Date.now()}`,
    agentName: "yourturn-concierge",
    mode: "hedera-agent-kit-guided",
    intent: args.intent,
    selectedTool: TRANSFER_HBAR_TOOL,
    selectedAction: "scheduled_recovery_payment",
    humanApprovalRequired: true,
    approvalId: args.approvalId,
    createdAt,
    steps: [
      {
        label: "Agent mode selected",
        status: "selected",
        detail: `Hedera Agent Kit ${AgentMode.AUTONOMOUS} tool policy constrained to approved recovery payment.`,
      },
      {
        label: "Policy read",
        status: args.policySnapshot.scheduleAutomationEnabled ? "passed" : "blocked",
        detail: `${args.policySnapshot.label} allows scheduled automation: ${args.policySnapshot.scheduleAutomationEnabled ? "yes" : "no"}.`,
      },
      {
        label: "Human approval",
        status: "approved",
        detail: `${args.actorLabel} approved grant ${args.approvalId}.`,
      },
      {
        label: "Financial operation",
        status: "executed",
        detail: `Prepared ${args.amountHbar.toFixed(2)} HBAR recovery payment with ${TRANSFER_HBAR_TOOL}.`,
      },
      {
        label: "Schedule proof",
        status: args.scheduleId ? "executed" : "blocked",
        detail: args.scheduleId
          ? `Hedera Schedule Service created schedule ${args.scheduleId}.`
          : "Schedule Service proof not created.",
      },
    ],
  };
}

export function buildRefundReleaseAgentTrace(args: {
  serial: number;
  intent: string;
  actorLabel: string;
  approvalId: string;
  policySnapshot: OwnerPolicySnapshot;
  refundHbar: number;
  refundTxId: string;
}): ConciergeAgentTrace {
  const createdAt = new Date().toISOString();
  return {
    traceId: `trace_refund_${args.serial}_${Date.now()}`,
    agentName: "yourturn-concierge",
    mode: "hedera-agent-kit-guided",
    intent: args.intent,
    selectedTool: TRANSFER_HBAR_TOOL,
    selectedAction: "cancel_release_refund",
    humanApprovalRequired: true,
    approvalId: args.approvalId,
    createdAt,
    steps: [
      {
        label: "Agent mode selected",
        status: "selected",
        detail: `Hedera Agent Kit ${AgentMode.AUTONOMOUS} tool policy constrained to approved refund release.`,
      },
      {
        label: "Policy read",
        status: args.policySnapshot.releaseAllowed ? "passed" : "blocked",
        detail: `${args.policySnapshot.label} allows release recovery: ${args.policySnapshot.releaseAllowed ? "yes" : "no"}.`,
      },
      {
        label: "Human approval",
        status: "approved",
        detail: `${args.actorLabel} approved grant ${args.approvalId}.`,
      },
      {
        label: "Financial operation",
        status: "executed",
        detail: `Sent ${args.refundHbar.toFixed(2)} HBAR testnet refund with ${TRANSFER_HBAR_TOOL}.`,
      },
      {
        label: "Booking right closed",
        status: "executed",
        detail: `Release/refund transaction ${args.refundTxId} returned the booking right to treasury before closeout.`,
      },
    ],
  };
}
