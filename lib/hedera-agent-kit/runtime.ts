import { AgentMode, HederaAgentAPI, ToolDiscovery, type Plugin, type Tool } from "@hashgraph/hedera-agent-kit";
import {
  allCorePlugins,
  coreAccountPluginToolNames,
  coreConsensusPluginToolNames,
} from "@hashgraph/hedera-agent-kit/plugins";
import { Client } from "@hiero-ledger/sdk";
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

export function createYourTurnHederaAgentRuntime() {
  const client = Client.forTestnet();
  const context = {
    mode: AgentMode.AUTONOMOUS,
    accountId: process.env.HEDERA_TREASURY_ID,
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
      coreAccountPluginToolNames.TRANSFER_HBAR_WITH_ALLOWANCE_TOOL,
      coreConsensusPluginToolNames.SUBMIT_TOPIC_MESSAGE_TOOL,
    ],
  });
  const api = new HederaAgentAPI(client, context, tools);
  return { api, context, tools };
}

export async function inspectYourTurnHederaAgentRuntime() {
  const runtime = createYourTurnHederaAgentRuntime();
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
    hasYourTurnPlugin: runtime.tools.some(
      (tool) => tool.method === describeManifestTool.method
    ),
    identity: manifestResult.raw.identity,
  };
}
