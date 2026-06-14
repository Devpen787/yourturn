import { buildHcs14AgentIdentity } from "../hedera-agent-kit/identity.ts";
import {
  YOURTURN_AGENT_NAME,
  YOURTURN_AGENT_VERSION,
  YOURTURN_AGENT_TOOLS,
} from "../hedera-agent-kit/tool-manifest.ts";

export function buildA2AAgentCard(baseUrl = "http://localhost:3000") {
  const identity = buildHcs14AgentIdentity();
  return {
    name: YOURTURN_AGENT_NAME,
    version: YOURTURN_AGENT_VERSION,
    description:
      "Policy-gated booking recovery Concierge for tokenized service slots on Hedera.",
    url: `${baseUrl}/api/agent/capabilities`,
    provider: {
      organization: "YourTurn",
      url: baseUrl,
    },
    identifiers: {
      hcs14: identity.id,
      nativeId: identity.nativeId,
    },
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: true,
      humanApprovalRequired: true,
    },
    skills: YOURTURN_AGENT_TOOLS.map((tool) => ({
      id: tool.id,
      name: tool.id.split(".").slice(-1)[0],
      description: tool.description,
      tags: tool.hederaServices,
      examples: tool.requiredInput,
    })),
  };
}

export function buildOpenClawAcpDescriptor(baseUrl = "http://localhost:3000") {
  return {
    protocol: "OpenClaw ACP",
    status: "descriptor_only",
    reason:
      "YourTurn exposes a bounded server-side tool manifest; live OpenClaw Gateway spawning is not configured in this repo.",
    entrypoints: {
      agentCapabilities: `${baseUrl}/api/agent/capabilities`,
      agentRead: `${baseUrl}/api/agent/read`,
      agentPreview: `${baseUrl}/api/agent/preview`,
      agentConfirm: `${baseUrl}/api/agent/confirm`,
    },
    approvalModel: "preview -> scoped approval grant -> confirm",
  };
}

export function buildX402Descriptor(baseUrl = "http://localhost:3000") {
  return {
    protocol: "x402",
    status: "descriptor_only",
    reason:
      "The app does not run a facilitator-backed x402 settlement flow yet; Hedera HBAR transfers are proven through direct testnet transactions.",
    protectedResources: [
      {
        method: "POST",
        path: "/api/recovery/confirm",
        description:
          "Value-moving Concierge confirmation. It currently uses signed demo sessions and scoped approval grants, not HTTP 402 payment challenge settlement.",
      },
    ],
    futurePaymentRequiredEndpoint: `${baseUrl}/api/recovery/confirm`,
  };
}

export function buildAgentProtocolDescriptors(baseUrl?: string) {
  return {
    a2a: buildA2AAgentCard(baseUrl),
    openclaw: buildOpenClawAcpDescriptor(baseUrl),
    x402: buildX402Descriptor(baseUrl),
  };
}
