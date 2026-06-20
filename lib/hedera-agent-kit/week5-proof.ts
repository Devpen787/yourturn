import { buildAgentProtocolDescriptors } from "@/lib/agent-protocols/descriptors";
import { buildHederaX402PaymentRequirements } from "@/lib/x402/hedera";
import { buildHcs14AgentIdentity } from "./identity";
import {
  YOURTURN_AGENT_NAME,
  YOURTURN_AGENT_TOOLS,
  YOURTURN_AGENT_VERSION,
  bountyCoverage,
} from "./tool-manifest";
import { inspectYourTurnHederaAgentRuntime } from "./runtime";

function hashscanTxUrl(txId?: string): string | null {
  if (!txId) return null;
  const hashscanTxId = txId.replace(/@(\d+)\.(\d+)$/, "-$1-$2");
  return `https://hashscan.io/#/testnet/transaction/${hashscanTxId}`;
}

function proofStatus(value?: string): "live" | "missing" {
  return value ? "live" : "missing";
}

export async function buildWeek5PolicyProof(baseUrl = "http://localhost:3000") {
  const runtime = await inspectYourTurnHederaAgentRuntime();
  const coverage = bountyCoverage();
  const hbarX402TxId = process.env.YOURTURN_X402_HBAR_SETTLEMENT_TX_ID;
  const usdcX402TxId = process.env.YOURTURN_X402_USDC_SETTLEMENT_TX_ID;
  const usdcAllowanceTxId = process.env.YOURTURN_POLICY_USDC_ALLOWANCE_TX_ID;
  const usdcTokenId = process.env.HEDERA_USDC_TOKEN_ID ?? "0.0.429274";
  const guestAId = process.env.HEDERA_GUEST_A_ID ?? "0.0.8504405";
  const treasuryId = process.env.HEDERA_TREASURY_ID ?? "0.0.8504300";

  return {
    ok: true,
    title: "Hedera Policy Agent Week 5 Proof",
    updatedAt: new Date().toISOString(),
    demoRoute: `${baseUrl}/week5-proof`,
    agent: {
      name: YOURTURN_AGENT_NAME,
      version: YOURTURN_AGENT_VERSION,
      identity: buildHcs14AgentIdentity(),
    },
    runtime: {
      mode: runtime.mode,
      toolMethods: runtime.toolMethods,
      hakPolicies: runtime.hakPolicies,
      hasCoreTransferTool: runtime.hasCoreTransferTool,
      hasCoreAllowanceTool: runtime.hasCoreAllowanceTool,
      hasCoreTokenAllowanceTool: runtime.hasCoreTokenAllowanceTool,
      hasCoreUsdcTransferWithAllowanceTool:
        runtime.hasCoreUsdcTransferWithAllowanceTool,
      hasYourTurnPlugin: runtime.hasYourTurnPlugin,
      hasHcsAuditTrailHook: runtime.hasHcsAuditTrailHook,
      auditTopicId: runtime.auditTopicId,
    },
    proof: {
      policyAutonomy: coverage.policyAutonomy,
      x402: coverage.x402,
      hbarX402Settlement: {
        status: proofStatus(hbarX402TxId),
        txId: hbarX402TxId,
        hashscanUrl: hashscanTxUrl(hbarX402TxId),
        asset: "HBAR",
      },
      usdcX402Settlement: {
        status: proofStatus(usdcX402TxId),
        txId: usdcX402TxId,
        hashscanUrl: hashscanTxUrl(usdcX402TxId),
        asset: "USDC",
        tokenId: usdcTokenId,
      },
      usdcAllowance: {
        status: proofStatus(usdcAllowanceTxId),
        txId: usdcAllowanceTxId,
        hashscanUrl: hashscanTxUrl(usdcAllowanceTxId),
        ownerAccountId: guestAId,
        spenderAccountId: treasuryId,
        tokenId: usdcTokenId,
        amountAtomicUnits: process.env.YOURTURN_POLICY_USDC_LIMIT_UNITS ?? "5000000",
        amountUsdc: "5",
      },
    },
    policyControls: [
      {
        label: "Official Agent Kit policies",
        evidence:
          "Runtime attaches MaxRecipientsPolicy(1) and RejectToolPolicy through context.hooks.",
      },
      {
        label: "Official HCS audit hook",
        evidence:
          "When an app audit topic exists, Agent Kit value-moving tools also attach HcsAuditTrailHook to the same Hedera audit topic used by the product lifecycle.",
      },
      {
        label: "Domain policy checks",
        evidence:
          "Recovery preview and confirm check holder state, provider policy, duplicate listings, approval, refund value, and budget.",
      },
      {
        label: "Bounded autonomy",
        evidence:
          "The agent can use a pre-authorized USDC allowance budget; it does not get unlimited raw private-key autonomy.",
      },
      {
        label: "Payment rail",
        evidence:
          "The x402 endpoint exposes HBAR and HTS/USDC exact requirements and has settled both assets on Hedera testnet.",
      },
    ],
    x402Requirements: buildHederaX402PaymentRequirements(baseUrl),
    protocols: buildAgentProtocolDescriptors(baseUrl),
    tools: YOURTURN_AGENT_TOOLS,
  };
}
