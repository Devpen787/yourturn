export const YOURTURN_AGENT_NAME = "yourturn-concierge" as const;
export const YOURTURN_AGENT_VERSION = "2026.06.13-wave9" as const;
export const YOURTURN_TOOL_MANIFEST_VERSION = "2026.06.13.1" as const;

export type YourTurnToolId =
  | "yourturn.recovery.preview_listing"
  | "yourturn.recovery.confirm_listing"
  | "yourturn.recovery.preview_refund_release"
  | "yourturn.recovery.confirm_refund_release"
  | "yourturn.automation.inspect_schedule";

export type HederaServiceUsed =
  | "Hedera Agent Kit"
  | "Hedera Token Service"
  | "Hedera Consensus Service"
  | "Hedera Schedule Service"
  | "Mirror Node"
  | "HashScan";

export type YourTurnToolManifestEntry = {
  id: YourTurnToolId;
  description: string;
  requiredInput: string[];
  hederaServices: HederaServiceUsed[];
  mutation: "none" | "hcs_message" | "schedule_create" | "hbar_transfer_and_token_close";
  requiresHumanApproval: boolean;
  policyGates: string[];
  proofOutputs: string[];
};

export const YOURTURN_AGENT_TOOLS: YourTurnToolManifestEntry[] = [
  {
    id: "yourturn.recovery.preview_listing",
    description:
      "Preview a policy-valid resale recovery listing for the current holder.",
    requiredInput: ["actor", "serial", "askPriceHbar"],
    hederaServices: ["Mirror Node"],
    mutation: "none",
    requiresHumanApproval: false,
    policyGates: [
      "actor_is_current_holder",
      "slot_is_held",
      "resale_allowed",
      "no_duplicate_active_listing",
    ],
    proofOutputs: ["previewId", "policySnapshot", "priceMath"],
  },
  {
    id: "yourturn.recovery.confirm_listing",
    description:
      "Create a recovery listing, emit HCS audit proof, and create scheduled recovery payment proof after approval.",
    requiredInput: ["actor", "previewId", "approvalId"],
    hederaServices: [
      "Hedera Agent Kit",
      "Hedera Consensus Service",
      "Hedera Schedule Service",
      "Mirror Node",
      "HashScan",
    ],
    mutation: "schedule_create",
    requiresHumanApproval: true,
    policyGates: [
      "actor_is_current_holder",
      "slot_is_held",
      "resale_allowed",
      "schedule_automation_allowed",
      "approval_present",
    ],
    proofOutputs: [
      "approvalId",
      "auditTxId",
      "scheduleId",
      "scheduledTransactionId",
      "scheduleHashscanUrl",
      "executionHashscanUrl",
      "agentProof",
    ],
  },
  {
    id: "yourturn.recovery.preview_refund_release",
    description:
      "Preview release of a held booking right with a policy-derived testnet HBAR refund.",
    requiredInput: ["actor", "serial"],
    hederaServices: ["Mirror Node"],
    mutation: "none",
    requiresHumanApproval: false,
    policyGates: [
      "actor_is_current_holder",
      "slot_is_held",
      "release_allowed",
      "refund_matches_booked_price",
    ],
    proofOutputs: ["previewId", "policySnapshot", "refundHbar"],
  },
  {
    id: "yourturn.recovery.confirm_refund_release",
    description:
      "Execute real testnet HBAR refund, return the NFT to treasury, close the booking right, and emit HCS proof.",
    requiredInput: ["actor", "previewId", "approvalId"],
    hederaServices: [
      "Hedera Agent Kit",
      "Hedera Token Service",
      "Hedera Consensus Service",
      "Mirror Node",
      "HashScan",
    ],
    mutation: "hbar_transfer_and_token_close",
    requiresHumanApproval: true,
    policyGates: [
      "actor_is_current_holder",
      "slot_is_held",
      "release_allowed",
      "refund_matches_booked_price",
      "approval_present",
    ],
    proofOutputs: [
      "approvalId",
      "releaseTxId",
      "burnTxId",
      "auditTxId",
      "releaseHashscanUrl",
      "burnHashscanUrl",
      "agentProof",
    ],
  },
  {
    id: "yourturn.automation.inspect_schedule",
    description:
      "Inspect a Hedera Schedule Service proof and refresh execution status from Mirror.",
    requiredInput: ["actor", "serial"],
    hederaServices: ["Hedera Schedule Service", "Mirror Node", "HashScan"],
    mutation: "none",
    requiresHumanApproval: false,
    policyGates: ["schedule_references_serial", "actor_can_view_schedule"],
    proofOutputs: [
      "scheduleId",
      "createTxId",
      "scheduledTransactionId",
      "executionTxId",
      "executionHashscanUrl",
      "status",
    ],
  },
];

export function getYourTurnTool(id: YourTurnToolId): YourTurnToolManifestEntry {
  const tool = YOURTURN_AGENT_TOOLS.find((entry) => entry.id === id);
  if (!tool) throw new Error(`Unknown YourTurn agent tool: ${id}`);
  return tool;
}

export function bountyCoverage() {
  return {
    automation: {
      status: "live",
      proof:
        "yourturn.recovery.confirm_listing creates and verifies a Hedera Schedule Service payment proof.",
    },
    agenticPayments: {
      status: "live",
      proof:
        "yourturn.recovery.confirm_refund_release executes a real testnet HBAR refund/release after policy checks and approval.",
    },
    noSolidity: {
      status: "live",
      proof:
        "YourTurn uses Hedera SDK/native services: HTS, HCS, Schedule Service, Mirror Node, and HashScan links.",
    },
    tokenization: {
      status: "supporting",
      proof:
        "Booking rights are HTS NFTs with lifecycle actions; Wave 9 does not add a new token class.",
    },
  };
}
