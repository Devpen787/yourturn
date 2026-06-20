import { AgentMode, HederaAgentAPI, ToolDiscovery, type Plugin, type Tool } from "@hashgraph/hedera-agent-kit";
import { HcsAuditTrailHook } from "@hashgraph/hedera-agent-kit/hooks";
import {
  allCorePlugins,
  coreAccountPluginToolNames,
  coreConsensusPluginToolNames,
  coreTokenPluginToolNames,
} from "@hashgraph/hedera-agent-kit/plugins";
import { MaxRecipientsPolicy, RejectToolPolicy } from "@hashgraph/hedera-agent-kit/policies";
import { Client, PrivateKey } from "@hiero-ledger/sdk";

const YOURTURN_APP_URL = process.env.YOURTURN_APP_URL ?? "https://yourturn-sage.vercel.app";

const rejectedTools = [
  coreAccountPluginToolNames.DELETE_ACCOUNT_TOOL,
  coreAccountPluginToolNames.DELETE_HBAR_ALLOWANCE_TOOL,
  coreAccountPluginToolNames.DELETE_TOKEN_ALLOWANCE_TOOL,
  coreAccountPluginToolNames.SCHEDULE_DELETE_TOOL,
  coreConsensusPluginToolNames.DELETE_TOPIC_TOOL,
  coreConsensusPluginToolNames.UPDATE_TOPIC_TOOL,
  coreTokenPluginToolNames.DELETE_NFT_ALLOWANCE_TOOL,
  coreTokenPluginToolNames.DISSOCIATE_TOKEN_TOOL,
  coreTokenPluginToolNames.UPDATE_TOKEN_TOOL,
];

async function callYourTurn(path: string, body?: unknown) {
  const res = await fetch(`${YOURTURN_APP_URL}${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`YourTurn ${path} failed: ${res.status}`);
  return res.json();
}

const describePolicyAgent: Tool = {
  method: "yourturn_policy_agent_describe",
  name: "Describe YourTurn Concierge policy agent",
  description:
    "Return the Week 5 Hedera Policy Agent proof bundle, including Agent Kit policies, x402 settlement proof, USDC allowance proof, and HCS audit hook status.",
  parameters: {} as Tool["parameters"],
  async execute() {
    const proof = await callYourTurn("/api/agent/week5-proof");
    return {
      raw: proof,
      humanMessage:
        "YourTurn Concierge is a policy-constrained recovery agent for booked service slots.",
    };
  },
};

const previewRecovery: Tool = {
  method: "yourturn_recovery_preview",
  name: "Preview a policy-gated recovery action",
  description:
    "Preview whether a booking holder may create a recovery listing or release/refund action under provider policy.",
  parameters: {} as Tool["parameters"],
  async execute(_client, _context, params) {
    const preview = await callYourTurn("/api/recovery/preview", params);
    return {
      raw: preview,
      humanMessage: preview.ok
        ? "Recovery preview returned a policy decision."
        : "Recovery preview was blocked.",
    };
  },
};

const describeWalletBudget: Tool = {
  method: "yourturn_wallet_budget_describe",
  name: "Describe wallet-funded USDC budget",
  description:
    "Return browser-safe config for the optional Hedera WalletConnect USDC allowance budget.",
  parameters: {} as Tool["parameters"],
  async execute() {
    const config = await callYourTurn("/api/wallet-budget/config");
    return {
      raw: config,
      humanMessage:
        "Wallet-funded budgets use a bounded HTS/USDC allowance and do not grant unlimited key custody.",
    };
  },
};

const yourTurnAgentLabPlugin: Plugin = {
  name: "yourturn-concierge-agent-lab",
  version: "2026.06.19",
  description:
    "Agent Lab export of the YourTurn Concierge policy agent for Hedera AI Bounty Week 5.",
  tools: () => [describePolicyAgent, previewRecovery, describeWalletBudget],
};

function buildHooks() {
  return [
    new MaxRecipientsPolicy(1),
    new RejectToolPolicy(rejectedTools),
    ...(process.env.BOOKED_RIGHTS_TOPIC_ID
      ? [
          new HcsAuditTrailHook(
            [
              coreAccountPluginToolNames.TRANSFER_HBAR_TOOL,
              coreAccountPluginToolNames.APPROVE_HBAR_ALLOWANCE_TOOL,
              coreAccountPluginToolNames.APPROVE_TOKEN_ALLOWANCE_TOOL,
              coreAccountPluginToolNames.TRANSFER_HBAR_WITH_ALLOWANCE_TOOL,
              coreTokenPluginToolNames.TRANSFER_FUNGIBLE_TOKEN_WITH_ALLOWANCE_TOOL,
              coreConsensusPluginToolNames.SUBMIT_TOPIC_MESSAGE_TOOL,
            ],
            process.env.BOOKED_RIGHTS_TOPIC_ID
          ),
        ]
      : []),
  ];
}

export function createYourTurnAgentLabRuntime() {
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;
  if (!accountId || !privateKey) {
    throw new Error("HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY are required.");
  }
  const client = Client.forTestnet().setOperator(
    accountId,
    PrivateKey.fromString(privateKey)
  );
  const context = {
    mode: AgentMode.AUTONOMOUS,
    accountId,
    hooks: buildHooks(),
  };
  const tools = new ToolDiscovery([
    yourTurnAgentLabPlugin,
    ...allCorePlugins,
  ]).getAllTools(context, {
    tools: [
      "yourturn_policy_agent_describe",
      "yourturn_recovery_preview",
      "yourturn_wallet_budget_describe",
      coreAccountPluginToolNames.TRANSFER_HBAR_TOOL,
      coreAccountPluginToolNames.APPROVE_TOKEN_ALLOWANCE_TOOL,
      coreTokenPluginToolNames.TRANSFER_FUNGIBLE_TOKEN_WITH_ALLOWANCE_TOOL,
      coreConsensusPluginToolNames.SUBMIT_TOPIC_MESSAGE_TOOL,
    ],
  });
  return new HederaAgentAPI(client, context, tools);
}

export const YOURTURN_AGENT_LAB_SYSTEM_PROMPT = `
You are YourTurn Concierge, a narrow Hedera policy agent.
You help the current holder of a booked service slot recover value only when holder state, provider policy, budget, and approval checks pass.
Never claim raw autonomous custody. Use bounded approvals, USDC allowance budgets, x402 payment receipts, HCS audit proof, Mirror verification, and HashScan links.
`;
