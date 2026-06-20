import type { ConciergeAgentTrace } from "@/lib/types/automation";
import type { RecoveryProofDetails } from "@/lib/types/recovery-proof";
import type { HederaAgentProof } from "@/lib/hedera-agent-kit/agent-proof";
import type { AgentPolicyCheckResult } from "@/lib/hedera-agent-kit/policies";
import type { OwnerPolicySnapshot } from "@/lib/policy/policy";

const policySnapshot: OwnerPolicySnapshot = {
  resaleAllowed: true,
  ownerRoyaltyPercent: 10,
  releaseAllowed: true,
  waitlistEnabled: true,
  scheduleAutomationEnabled: true,
  version: 1,
  label: "Provider recovery policy v1",
  snapshotId: "policy_v1_recorded",
  capturedAt: "2026-06-14T02:23:59.479Z",
  source: "owner_policy",
};

function passed(
  id: AgentPolicyCheckResult["id"],
  label: string,
  detail: string
): AgentPolicyCheckResult {
  return {
    id,
    label,
    status: "passed",
    detail,
  };
}

function agentTrace(args: {
  traceId: string;
  intent: string;
  selectedTool: string;
  selectedAction: string;
  approvalId: string;
  createdAt: string;
  steps: ConciergeAgentTrace["steps"];
}): ConciergeAgentTrace {
  return {
    traceId: args.traceId,
    agentName: "yourturn-concierge",
    mode: "hedera-agent-kit-guided",
    intent: args.intent,
    selectedTool: args.selectedTool,
    selectedAction: args.selectedAction,
    humanApprovalRequired: true,
    approvalId: args.approvalId,
    steps: args.steps,
    createdAt: args.createdAt,
  };
}

function agentProof(args: {
  toolId: HederaAgentProof["toolId"];
  approvalId: string;
  createdAt: string;
  hederaServices: HederaAgentProof["hederaServices"];
  mutation: HederaAgentProof["mutation"];
  policyChecks: AgentPolicyCheckResult[];
  proofOutputs: HederaAgentProof["proofOutputs"];
}): HederaAgentProof {
  const toolDescriptions: Record<HederaAgentProof["toolId"], string> = {
    "yourturn.recovery.preview_listing":
      "Preview a policy-valid resale recovery listing for the current holder.",
    "yourturn.recovery.confirm_listing":
      "Create a recovery listing, emit HCS audit proof, and create scheduled recovery payment proof after approval.",
    "yourturn.recovery.preview_refund_release":
      "Preview release of a held booking right with a policy-derived testnet HBAR refund.",
    "yourturn.recovery.confirm_refund_release":
      "Execute real testnet HBAR refund, return the NFT to treasury, close the booking right, and emit HCS proof.",
    "yourturn.automation.inspect_schedule":
      "Inspect a Hedera Schedule Service proof for a recovery action.",
    "yourturn.budget.inspect":
      "Inspect the demo-funded Concierge budget boundary before a value-moving recovery action.",
    "yourturn.wallet_budget.inspect_allowance":
      "Inspect a configured wallet-funded HTS/USDC allowance budget for autonomous policy execution.",
    "yourturn.x402.quote_recovery":
      "Quote a Hedera x402 exact payment requirement for a policy-gated recovery request.",
  };

  return {
    agentName: "yourturn-concierge",
    agentVersion: "2026.06.13-wave9",
    manifestVersion: "2026.06.13.1",
    toolId: args.toolId,
    toolDescription: toolDescriptions[args.toolId],
    executionMode: "human_in_the_loop_server_execute",
    hederaServices: args.hederaServices,
    mutation: args.mutation,
    humanApprovalRequired: true,
    approvalId: args.approvalId,
    policyChecks: args.policyChecks,
    proofOutputs: args.proofOutputs,
    createdAt: args.createdAt,
  };
}

export function getRecordedRecoveryReceipt(
  serial: number
): RecoveryProofDetails | null {
  if (serial === 193) {
    const createdAt = "2026-06-14T02:23:59.479Z";
    const approvalId = "bc9155e7-17dd-451d-8f4f-1ba56e4fb99f";
    const policyChecks = [
      passed(
        "actor_is_current_holder",
        "Actor is current holder",
        "Person A held booking #193 when the Concierge approval was recorded."
      ),
      passed(
        "slot_is_held",
        "Slot is held",
        "Booking #193 was held and eligible for recovery checks."
      ),
      passed(
        "resale_allowed",
        "Resale allowed",
        "The booked provider policy allowed resale recovery."
      ),
      passed(
        "schedule_automation_allowed",
        "Schedule automation allowed",
        "The provider policy allowed a scheduled recovery-payment proof."
      ),
      passed(
        "budget_allows_payment",
        "Budget allows payment",
        "The demo-funded Concierge budget allowed the scheduled proof payment."
      ),
      passed(
        "approval_present",
        "Human approval present",
        "Person A approved the listing from Concierge before the action executed."
      ),
    ];

    return {
      title: "Resale recovery receipt for Booking #193",
      statusLabel: "Listed",
      actionLabel: "Concierge recovery listing",
      serial,
      actorLabel: "Person A",
      currentState:
        "Person A approved Concierge to list this booking for another customer under provider rules.",
      askPriceHbar: 21,
      royaltyHbar: 2.1,
      sellerNetHbar: 18.9,
      approvalId,
      auditTxId: "0.0.8504300@1781403839.479174338",
      hashscanUrl:
        "https://hashscan.io/#/testnet/transaction/0.0.8504300-1781403839-479174338",
      policyBasis: `${policySnapshot.label} (${policySnapshot.snapshotId})`,
      policySnapshot,
      scheduleProof: {
        scheduleId: "0.0.9228236",
        scheduledTransactionId: "0.0.8504300@1781403839.567406004",
        createTxId: "0.0.8504300@1781403839.567406004",
        createHashscanUrl:
          "https://hashscan.io/#/testnet/transaction/0.0.8504300-1781403839-567406004",
        scheduleHashscanUrl:
          "https://hashscan.io/#/testnet/schedule/0.0.9228236",
        executionTxId: "0.0.8504300-1781403839-567406004",
        executionHashscanUrl:
          "https://hashscan.io/#/testnet/transaction/0.0.8504300-1781403839-567406004",
        executedAt: "2026-06-14T02:25:36.047Z",
        memo: "YourTurn scheduled recovery payment #193",
        amountHbar: 0.01,
        payerAccountId: "0.0.8504300",
        recipientAccountId: "0.0.8504300",
        executeAfter: "2026-06-14T02:25:29.479Z",
        waitForExpiry: false,
        status: "executed",
      },
      agentTrace: agentTrace({
        traceId: "recorded-concierge-listing-193",
        intent:
          "Recover value by listing booking #193 and recording scheduled settlement proof.",
        selectedTool: "yourturn.recovery.confirm_listing",
        selectedAction: "create_listing",
        approvalId,
        createdAt,
        steps: [
          {
            label: "Policy checked",
            status: "passed",
            detail: "Provider policy allowed resale recovery and schedule proof.",
          },
          {
            label: "Human approved",
            status: "approved",
            detail: "Person A approved listing through Concierge.",
          },
          {
            label: "Hedera proof recorded",
            status: "executed",
            detail: "HCS audit and Schedule Service proof were created on testnet.",
          },
        ],
      }),
      agentProof: agentProof({
        toolId: "yourturn.recovery.confirm_listing",
        approvalId,
        createdAt,
        hederaServices: [
          "Hedera Agent Kit",
          "Hedera Consensus Service",
          "Hedera Schedule Service",
          "Mirror Node",
          "HashScan",
        ],
        mutation: "schedule_create",
        policyChecks,
        proofOutputs: {
          serial,
          askPriceHbar: 21,
          royaltyHbar: 2.1,
          sellerNetHbar: 18.9,
          auditTxId: "0.0.8504300@1781403839.479174338",
          scheduleId: "0.0.9228236",
          scheduleStatus: "executed",
        },
      }),
      occurredAt: createdAt,
    };
  }

  if (serial === 194) {
    const createdAt = "2026-06-14T02:31:55.316Z";
    const approvalId = "143c5cee-8d08-468d-9f6e-d4f349857a08";
    const policyChecks = [
      passed(
        "actor_is_current_holder",
        "Actor is current holder",
        "Person A held booking #194 when the Concierge approval was recorded."
      ),
      passed(
        "slot_is_held",
        "Slot is held",
        "Booking #194 was held and eligible for recovery checks."
      ),
      passed(
        "release_allowed",
        "Release allowed",
        "The booked provider policy allowed release recovery."
      ),
      passed(
        "refund_matches_booked_price",
        "Refund matches booked price",
        "The testnet refund matched the policy-derived booked price."
      ),
      passed(
        "approval_present",
        "Human approval present",
        "Person A approved release and refund from Concierge before value moved."
      ),
    ];

    return {
      title: "Release receipt for Booking #194",
      statusLabel: "Refunded",
      actionLabel: "Concierge release + test HBAR refund",
      serial,
      actorLabel: "Person A",
      currentState:
        "Person A approved Concierge to release the booking and send a real testnet HBAR refund.",
      refundHbar: 18,
      approvalId,
      txId: "0.0.8504300@1781404315.316217004",
      releaseTxId: "0.0.8504300@1781404315.316217004",
      burnTxId: "0.0.8504300@1781404320.752860402",
      auditTxId: "0.0.8504300@1781404320.697190583",
      hashscanUrl:
        "https://hashscan.io/#/testnet/transaction/0.0.8504300-1781404315-316217004",
      releaseHashscanUrl:
        "https://hashscan.io/#/testnet/transaction/0.0.8504300-1781404315-316217004",
      burnHashscanUrl:
        "https://hashscan.io/#/testnet/transaction/0.0.8504300-1781404320-752860402",
      policyBasis: `${policySnapshot.label} (${policySnapshot.snapshotId})`,
      policySnapshot,
      agentTrace: agentTrace({
        traceId: "recorded-concierge-release-194",
        intent: "Release booking #194 and return testnet value to Person A.",
        selectedTool: "yourturn.recovery.confirm_refund_release",
        selectedAction: "cancel_release_refund",
        approvalId,
        createdAt,
        steps: [
          {
            label: "Policy checked",
            status: "passed",
            detail: "Provider policy allowed release recovery.",
          },
          {
            label: "Human approved",
            status: "approved",
            detail: "Person A approved release and refund through Concierge.",
          },
          {
            label: "Hedera value moved",
            status: "executed",
            detail:
              "The booking right was released and 18 HBAR testnet moved on Hedera.",
          },
        ],
      }),
      agentProof: agentProof({
        toolId: "yourturn.recovery.confirm_refund_release",
        approvalId,
        createdAt,
        hederaServices: [
          "Hedera Agent Kit",
          "Hedera Token Service",
          "Hedera Consensus Service",
          "Mirror Node",
          "HashScan",
        ],
        mutation: "hbar_transfer_and_token_close",
        policyChecks,
        proofOutputs: {
          serial,
          refundHbar: 18,
          releaseTxId: "0.0.8504300@1781404315.316217004",
          burnTxId: "0.0.8504300@1781404320.752860402",
          auditTxId: "0.0.8504300@1781404320.697190583",
        },
      }),
      occurredAt: createdAt,
    };
  }

  return null;
}
