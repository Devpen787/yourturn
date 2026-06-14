import type { AgentPolicyCheckResult } from "./policies";
import {
  getYourTurnTool,
  YOURTURN_AGENT_NAME,
  YOURTURN_AGENT_VERSION,
  YOURTURN_TOOL_MANIFEST_VERSION,
  type HederaServiceUsed,
  type YourTurnToolId,
} from "./tool-manifest";

export type HederaAgentProof = {
  agentName: typeof YOURTURN_AGENT_NAME;
  agentVersion: typeof YOURTURN_AGENT_VERSION;
  manifestVersion: typeof YOURTURN_TOOL_MANIFEST_VERSION;
  toolId: YourTurnToolId;
  toolDescription: string;
  executionMode: "human_in_the_loop_server_execute" | "read_only_inspection";
  hederaServices: HederaServiceUsed[];
  mutation: string;
  humanApprovalRequired: boolean;
  approvalId?: string;
  policyChecks: AgentPolicyCheckResult[];
  proofOutputs: Record<string, string | number | boolean | null | undefined>;
  createdAt: string;
};

export function buildHederaAgentProof(args: {
  toolId: YourTurnToolId;
  executionMode?: HederaAgentProof["executionMode"];
  approvalId?: string;
  policyChecks: AgentPolicyCheckResult[];
  proofOutputs: Record<string, string | number | boolean | null | undefined>;
  createdAt?: string;
}): HederaAgentProof {
  const tool = getYourTurnTool(args.toolId);
  return {
    agentName: YOURTURN_AGENT_NAME,
    agentVersion: YOURTURN_AGENT_VERSION,
    manifestVersion: YOURTURN_TOOL_MANIFEST_VERSION,
    toolId: tool.id,
    toolDescription: tool.description,
    executionMode: args.executionMode ?? "human_in_the_loop_server_execute",
    hederaServices: tool.hederaServices,
    mutation: tool.mutation,
    humanApprovalRequired: tool.requiresHumanApproval,
    approvalId: args.approvalId,
    policyChecks: args.policyChecks,
    proofOutputs: args.proofOutputs,
    createdAt: args.createdAt ?? new Date().toISOString(),
  };
}
