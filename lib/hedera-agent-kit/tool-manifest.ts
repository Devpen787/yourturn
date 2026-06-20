export const YOURTURN_AGENT_NAME = "yourturn-concierge" as const;
export const YOURTURN_AGENT_VERSION = "2026.06.13-wave9" as const;
export const YOURTURN_TOOL_MANIFEST_VERSION = "2026.06.13.1" as const;

export type YourTurnToolId =
  | "yourturn.recovery.preview_listing"
  | "yourturn.recovery.confirm_listing"
  | "yourturn.recovery.preview_refund_release"
  | "yourturn.recovery.confirm_refund_release"
  | "yourturn.automation.inspect_schedule"
  | "yourturn.budget.inspect"
  | "yourturn.wallet_budget.inspect_allowance"
  | "yourturn.x402.quote_recovery";

export type HederaServiceUsed =
  | "Hedera Agent Kit"
  | "Hedera Token Service"
  | "Hedera Consensus Service"
  | "Hedera Schedule Service"
  | "Hedera x402 exact"
  | "HTS USDC"
  | "Mirror Node"
  | "HashScan"
  | "HCS-14";

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
      "budget_allows_payment",
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
  {
    id: "yourturn.budget.inspect",
    description:
      "Inspect the demo-funded HBAR Concierge budget boundary before a value-moving recovery action.",
    requiredInput: ["actor", "toolId", "amountHbar"],
    hederaServices: ["Hedera Agent Kit", "Mirror Node"],
    mutation: "none",
    requiresHumanApproval: false,
    policyGates: ["budget_allows_payment"],
    proofOutputs: [
      "budgetId",
      "limitHbar",
      "spentHbar",
      "remainingHbar",
      "requestedHbar",
      "budgetSource",
    ],
  },
  {
    id: "yourturn.wallet_budget.inspect_allowance",
    description:
      "Inspect a configured wallet-funded HTS/USDC allowance budget for autonomous policy execution.",
    requiredInput: ["actor", "asset", "tokenId", "spenderAccountId"],
    hederaServices: ["Hedera Agent Kit", "Hedera Token Service", "HTS USDC", "Mirror Node"],
    mutation: "none",
    requiresHumanApproval: false,
    policyGates: ["budget_allows_payment", "allowance_configured"],
    proofOutputs: [
      "budgetId",
      "asset",
      "tokenId",
      "spenderAccountId",
      "ownerAccountId",
      "limitAtomicUnits",
      "remainingAtomicUnits",
      "allowanceTxId",
      "status",
    ],
  },
  {
    id: "yourturn.x402.quote_recovery",
    description:
      "Quote a Hedera x402 exact payment requirement for a policy-gated recovery request.",
    requiredInput: ["resource", "asset", "amount", "payTo", "facilitator"],
    hederaServices: ["Hedera Agent Kit", "Hedera x402 exact", "Hedera Token Service", "HTS USDC"],
    mutation: "none",
    requiresHumanApproval: false,
    policyGates: ["x402_payment_required", "budget_allows_payment"],
    proofOutputs: [
      "resource",
      "network",
      "scheme",
      "asset",
      "amount",
      "payTo",
      "facilitator",
      "feePayer",
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
        "yourturn.recovery.confirm_refund_release executes a real testnet HBAR refund/release after policy checks and approval; recovery scheduling is also budget-gated.",
    },
    policyAutonomy: {
      status: process.env.YOURTURN_POLICY_USDC_ALLOWANCE_TX_ID ? "live" : "configured",
      proof: process.env.YOURTURN_POLICY_USDC_ALLOWANCE_TX_ID
        ? `Wallet-funded HTS/USDC allowance budget is backed by allowance tx ${process.env.YOURTURN_POLICY_USDC_ALLOWANCE_TX_ID}.`
        : "Wallet-funded HTS/USDC allowance budgets are represented in the Agent Kit manifest and verifier; live claim requires a real allowance transaction id.",
    },
    x402: {
      status: process.env.YOURTURN_X402_HBAR_SETTLEMENT_TX_ID ? "live" : "configured",
      proof: process.env.YOURTURN_X402_HBAR_SETTLEMENT_TX_ID
        ? `The agent settled Hedera x402 exact payments through HBAR tx ${process.env.YOURTURN_X402_HBAR_SETTLEMENT_TX_ID}${
            process.env.YOURTURN_X402_USDC_SETTLEMENT_TX_ID
              ? ` and USDC tx ${process.env.YOURTURN_X402_USDC_SETTLEMENT_TX_ID}`
              : ""
          }.`
        : "The agent exposes Hedera x402 exact payment requirements for recovery requests; live settlement claim requires a signed X-PAYMENT payload and facilitator verification.",
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
