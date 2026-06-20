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
import { buildHcs14AgentIdentity } from "./identity.ts";
import { YOURTURN_AGENT_TOOLS } from "./tool-manifest.ts";

const describeManifestTool: Tool = {
  method: "yourturn_manifest_describe",
  name: "Describe YourTurn Concierge manifest",
  description:
    "Return the YourTurn Concierge tool manifest and HCS-14 identity descriptor.",
  parameters: {} as Tool["parameters"],
  async execute() {
    return {
      raw: {
        identity: buildHcs14AgentIdentity(),
        tools: YOURTURN_AGENT_TOOLS,
      },
      humanMessage:
        "YourTurn Concierge exposes recovery, schedule inspection, refund/release, and budget inspection tools.",
    };
  },
};

const budgetInspectTool: Tool = {
  method: "yourturn_budget_inspect",
  name: "Inspect YourTurn Concierge budget boundary",
  description:
    "Return the server-enforced demo budget contract used before value-moving Concierge actions.",
  parameters: {} as Tool["parameters"],
  async execute(_client, _context, params) {
    return {
      raw: params,
      humanMessage: `Budget inspection requested for ${params.actor} at ${params.requestedHbar} HBAR.`,
    };
  },
};

export const yourTurnAgentKitPlugin: Plugin = {
  name: "yourturn-concierge-plugin",
  version: "2026.06.14",
  description:
    "YourTurn booking-right recovery, budget inspection, and proof tools for Hedera Agent Kit.",
  tools: () => [describeManifestTool, budgetInspectTool],
};

export const HAK_REJECTED_TOOL_METHODS = [
  coreAccountPluginToolNames.DELETE_ACCOUNT_TOOL,
  coreAccountPluginToolNames.DELETE_HBAR_ALLOWANCE_TOOL,
  coreAccountPluginToolNames.DELETE_TOKEN_ALLOWANCE_TOOL,
  coreAccountPluginToolNames.SCHEDULE_DELETE_TOOL,
  coreConsensusPluginToolNames.DELETE_TOPIC_TOOL,
  coreConsensusPluginToolNames.UPDATE_TOPIC_TOOL,
  coreTokenPluginToolNames.DELETE_NFT_ALLOWANCE_TOOL,
  coreTokenPluginToolNames.DISSOCIATE_TOKEN_TOOL,
  coreTokenPluginToolNames.UPDATE_TOKEN_TOOL,
] as const;

export function buildYourTurnHakPolicies() {
  return [
    new MaxRecipientsPolicy(1),
    new RejectToolPolicy([...HAK_REJECTED_TOOL_METHODS]),
  ];
}

function parseHakPrivateKey(raw: string, typeHint?: string): PrivateKey {
  const key = raw.trim().replace(/^0x/i, "");
  const normalizedHint = typeHint?.trim().toUpperCase();
  if (normalizedHint === "ECDSA") return PrivateKey.fromStringECDSA(key);
  if (normalizedHint === "ED25519") return PrivateKey.fromStringED25519(key);
  if (normalizedHint === "DER") return PrivateKey.fromStringDer(key);
  return PrivateKey.fromString(key);
}

function createHakAuditLoggingClient(): Client | undefined {
  const accountId = process.env.HEDERA_TREASURY_ID;
  const privateKey = process.env.HEDERA_TREASURY_KEY;
  if (!accountId || !privateKey) return undefined;
  const network = (process.env.HEDERA_NETWORK || "testnet").toLowerCase();
  const client = network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
  client.setOperator(
    accountId,
    parseHakPrivateKey(privateKey, process.env.HEDERA_TREASURY_KEY_TYPE)
  );
  return client;
}

function buildYourTurnHakAuditHooks(topicId?: string | null) {
  if (!topicId) return [];
  return [
    new HcsAuditTrailHook(
      [
        coreAccountPluginToolNames.TRANSFER_HBAR_TOOL,
        coreAccountPluginToolNames.APPROVE_HBAR_ALLOWANCE_TOOL,
        coreAccountPluginToolNames.APPROVE_TOKEN_ALLOWANCE_TOOL,
        coreAccountPluginToolNames.TRANSFER_HBAR_WITH_ALLOWANCE_TOOL,
        coreTokenPluginToolNames.TRANSFER_FUNGIBLE_TOKEN_WITH_ALLOWANCE_TOOL,
        coreConsensusPluginToolNames.SUBMIT_TOPIC_MESSAGE_TOOL,
      ],
      topicId,
      createHakAuditLoggingClient()
    ),
  ];
}

export function buildYourTurnHakHooks(options: { auditTopicId?: string | null } = {}) {
  return [
    ...buildYourTurnHakPolicies(),
    ...buildYourTurnHakAuditHooks(options.auditTopicId ?? process.env.BOOKED_RIGHTS_TOPIC_ID),
  ];
}

async function resolveHakAuditTopicId(): Promise<string | null> {
  if (process.env.BOOKED_RIGHTS_TOPIC_ID) return process.env.BOOKED_RIGHTS_TOPIC_ID;
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return null;
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({ url, token, retry: { retries: 1, backoff: () => 200 } });
    return await redis.get<string>("bookedrights:topicId");
  } catch {
    return null;
  }
}

export function createYourTurnHederaAgentRuntime(options: { auditTopicId?: string | null } = {}) {
  const client = Client.forTestnet();
  const context = {
    mode: AgentMode.AUTONOMOUS,
    accountId: process.env.HEDERA_TREASURY_ID,
    hooks: buildYourTurnHakHooks(options),
  };
  const discovery = new ToolDiscovery([
    yourTurnAgentKitPlugin,
    ...allCorePlugins,
  ]);
  const tools = discovery.getAllTools(context, {
    tools: [
      describeManifestTool.method,
      budgetInspectTool.method,
      coreAccountPluginToolNames.TRANSFER_HBAR_TOOL,
      coreAccountPluginToolNames.APPROVE_HBAR_ALLOWANCE_TOOL,
      coreAccountPluginToolNames.APPROVE_TOKEN_ALLOWANCE_TOOL,
      coreAccountPluginToolNames.TRANSFER_HBAR_WITH_ALLOWANCE_TOOL,
      coreTokenPluginToolNames.TRANSFER_FUNGIBLE_TOKEN_WITH_ALLOWANCE_TOOL,
      coreConsensusPluginToolNames.SUBMIT_TOPIC_MESSAGE_TOOL,
    ],
  });
  const api = new HederaAgentAPI(client, context, tools);
  return { api, context, tools };
}

export async function inspectYourTurnHederaAgentRuntime() {
  const auditTopicId = await resolveHakAuditTopicId();
  const runtime = createYourTurnHederaAgentRuntime({ auditTopicId });
  const manifestResult = JSON.parse(
    await runtime.api.run(describeManifestTool.method, {})
  );
  return {
    mode: runtime.context.mode,
    toolMethods: runtime.tools.map((tool) => tool.method).sort(),
    hasCoreTransferTool: runtime.tools.some(
      (tool) => tool.method === coreAccountPluginToolNames.TRANSFER_HBAR_TOOL
    ),
    hasCoreAllowanceTool: runtime.tools.some(
      (tool) => tool.method === coreAccountPluginToolNames.APPROVE_HBAR_ALLOWANCE_TOOL
    ),
    hasCoreTokenAllowanceTool: runtime.tools.some(
      (tool) => tool.method === coreAccountPluginToolNames.APPROVE_TOKEN_ALLOWANCE_TOOL
    ),
    hasCoreUsdcTransferWithAllowanceTool: runtime.tools.some(
      (tool) =>
        tool.method === coreTokenPluginToolNames.TRANSFER_FUNGIBLE_TOKEN_WITH_ALLOWANCE_TOOL
    ),
    hasYourTurnPlugin: runtime.tools.some(
      (tool) => tool.method === describeManifestTool.method
    ),
    hakPolicies: runtime.context.hooks?.map((hook) => ({
      name: hook.name,
      description: hook.description,
      relevantTools: hook.relevantTools,
    })) ?? [],
    hasHcsAuditTrailHook: runtime.context.hooks?.some(
      (hook) => hook.name === "HCS Audit Trail Hook"
    ) ?? false,
    auditTopicId,
    identity: manifestResult.raw.identity,
  };
}
