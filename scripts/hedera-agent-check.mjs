import { readFileSync } from "node:fs";
function loadEnvLocal() {
  try {
    const text = readFileSync(".env.local", "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // CI can provide env directly.
  }
}

function assert(condition, label, detail = {}) {
  if (!condition) {
    throw new Error(`${label} failed: ${JSON.stringify(detail, null, 2)}`);
  }
  return label;
}

function makeSlot(overrides = {}) {
  const policySnapshot = {
    resaleAllowed: true,
    ownerRoyaltyPercent: 10,
    releaseAllowed: true,
    waitlistEnabled: true,
    scheduleAutomationEnabled: true,
    version: 2,
    label: "Agent checker policy v2",
    snapshotId: "policy_v2_agentcheck",
    capturedAt: "2026-06-13T00:00:00.000Z",
    source: "owner_policy",
    ...(overrides.policySnapshot ?? {}),
  };
  return {
    tokenId: "0.0.8505698",
    serial: 901,
    slotId: "agent-check-slot",
    title: "Agent Check Session",
    startTime: "2026-06-15T14:00:00.000Z",
    endTime: "2026-06-15T15:00:00.000Z",
    location: "Studio A",
    primaryPriceHbar: 18,
    resaleAllowed: policySnapshot.resaleAllowed,
    policy: policySnapshot,
    policySnapshot,
    listingActive: false,
    status: "HELD",
    holderAccountId: "0.0.1001",
    ...overrides,
  };
}

function summarizeChecks(checks) {
  return checks.map((check) => ({
    id: check.id,
    status: check.status,
  }));
}

loadEnvLocal();

const packageLock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const agentKitVersion =
  packageLock.packages?.["node_modules/@hashgraph/hedera-agent-kit"]?.version ??
  packageLock.dependencies?.["@hashgraph/hedera-agent-kit"]?.version ??
  "unknown";
const {
  YOURTURN_AGENT_NAME,
  YOURTURN_AGENT_VERSION,
  YOURTURN_AGENT_TOOLS,
  YOURTURN_TOOL_MANIFEST_VERSION,
  bountyCoverage,
} = await import("../lib/hedera-agent-kit/tool-manifest.ts");
const { getDemoConciergeBudget, getConfiguredUsdcAllowanceBudget } = await import("../lib/hedera-agent-kit/budget.ts");
const { buildHcs14AgentIdentity } = await import(
  "../lib/hedera-agent-kit/identity.ts"
);
const { inspectYourTurnHederaAgentRuntime } = await import(
  "../lib/hedera-agent-kit/runtime.ts"
);
const { HAK_REJECTED_TOOL_METHODS, buildYourTurnHakPolicies } = await import(
  "../lib/hedera-agent-kit/runtime.ts"
);
const { buildAgentProtocolDescriptors } = await import(
  "../lib/agent-protocols/descriptors.ts"
);
const { buildHederaX402PaymentRequirements } = await import("../lib/x402/hedera.ts");
const { evaluateYourTurnAgentPolicies, policyChecksPassed } = await import(
  "../lib/hedera-agent-kit/policies.ts"
);

const manifestChecks = [];
const toolIds = new Set();
for (const tool of YOURTURN_AGENT_TOOLS) {
  manifestChecks.push(assert(!toolIds.has(tool.id), `unique tool ${tool.id}`));
  toolIds.add(tool.id);
  manifestChecks.push(assert(tool.description.length > 20, `${tool.id} description`));
  manifestChecks.push(assert(tool.requiredInput.length > 0, `${tool.id} required input`));
  manifestChecks.push(assert(tool.hederaServices.length > 0, `${tool.id} Hedera services`));
  manifestChecks.push(assert(tool.policyGates.length > 0, `${tool.id} policy gates`));
  manifestChecks.push(assert(tool.proofOutputs.length > 0, `${tool.id} proof outputs`));
  if (tool.mutation !== "none") {
    manifestChecks.push(
      assert(tool.requiresHumanApproval, `${tool.id} mutation requires approval`)
    );
  }
}

const validListing = evaluateYourTurnAgentPolicies({
  toolId: "yourturn.recovery.confirm_listing",
  slot: makeSlot(),
  actorAccountId: "0.0.1001",
  askPriceHbar: 18,
  approvalId: "grant_agent_check_listing",
  budget: getDemoConciergeBudget("guestA"),
  budgetAmountHbar: 0.01,
});
const validRefund = evaluateYourTurnAgentPolicies({
  toolId: "yourturn.recovery.confirm_refund_release",
  slot: makeSlot({ serial: 902 }),
  actorAccountId: "0.0.1001",
  refundHbar: 18,
  approvalId: "grant_agent_check_refund",
});
const blockedNonHolder = evaluateYourTurnAgentPolicies({
  toolId: "yourturn.recovery.confirm_listing",
  slot: makeSlot({ serial: 903 }),
  actorAccountId: "0.0.9999",
  askPriceHbar: 18,
  approvalId: "grant_agent_check_wrong_holder",
  budget: getDemoConciergeBudget("guestA"),
  budgetAmountHbar: 0.01,
});
const blockedResaleDisabled = evaluateYourTurnAgentPolicies({
  toolId: "yourturn.recovery.preview_listing",
  slot: makeSlot({
    serial: 904,
    policySnapshot: { resaleAllowed: false },
    resaleAllowed: false,
  }),
  actorAccountId: "0.0.1001",
  askPriceHbar: 18,
});
const blockedDuplicateListing = evaluateYourTurnAgentPolicies({
  toolId: "yourturn.recovery.preview_listing",
  slot: makeSlot({ serial: 905, listingActive: true }),
  actorAccountId: "0.0.1001",
  askPriceHbar: 18,
});
const scheduleInspect = evaluateYourTurnAgentPolicies({
  toolId: "yourturn.automation.inspect_schedule",
  slot: makeSlot({ serial: 906 }),
  actorAccountId: "0.0.1001",
  scheduleSerial: 906,
});
const blockedBudget = evaluateYourTurnAgentPolicies({
  toolId: "yourturn.recovery.confirm_listing",
  slot: makeSlot({ serial: 907 }),
  actorAccountId: "0.0.1001",
  askPriceHbar: 18,
  approvalId: "grant_agent_check_budget",
  budget: {
    ...getDemoConciergeBudget("guestA"),
    limitHbar: 0.001,
    remainingHbar: 0.001,
  },
  budgetAmountHbar: 0.01,
});
const configuredUsdcBudget = getConfiguredUsdcAllowanceBudget("guestA");
const configuredUsdcAllowance = evaluateYourTurnAgentPolicies({
  toolId: "yourturn.wallet_budget.inspect_allowance",
  slot: makeSlot({ serial: 908 }),
  actorAccountId: "0.0.1001",
  budget: configuredUsdcBudget,
  budgetAmountAtomicUnits: "10000",
});
const x402Quote = evaluateYourTurnAgentPolicies({
  toolId: "yourturn.x402.quote_recovery",
  slot: makeSlot({ serial: 909 }),
  actorAccountId: "0.0.1001",
  budget: configuredUsdcBudget,
  budgetAmountAtomicUnits: "10000",
  x402PaymentRequired: true,
});

const policyScenarios = {
  validListing: summarizeChecks(validListing),
  validRefund: summarizeChecks(validRefund),
  blockedNonHolder: summarizeChecks(blockedNonHolder),
  blockedResaleDisabled: summarizeChecks(blockedResaleDisabled),
  blockedDuplicateListing: summarizeChecks(blockedDuplicateListing),
  scheduleInspect: summarizeChecks(scheduleInspect),
  blockedBudget: summarizeChecks(blockedBudget),
  configuredUsdcAllowance: summarizeChecks(configuredUsdcAllowance),
  x402Quote: summarizeChecks(x402Quote),
};

const policyAssertions = [
  assert(policyChecksPassed(validListing), "valid listing policies pass"),
  assert(policyChecksPassed(validRefund), "valid refund policies pass"),
  assert(!policyChecksPassed(blockedNonHolder), "non-holder is blocked"),
  assert(!policyChecksPassed(blockedResaleDisabled), "resale-disabled listing is blocked"),
  assert(!policyChecksPassed(blockedDuplicateListing), "duplicate listing is blocked"),
  assert(policyChecksPassed(scheduleInspect), "schedule inspection policies pass"),
  assert(!policyChecksPassed(blockedBudget), "budget overflow is blocked"),
  assert(policyChecksPassed(configuredUsdcAllowance), "configured USDC allowance policies pass"),
  assert(policyChecksPassed(x402Quote), "x402 quote policies pass"),
];

const identity = buildHcs14AgentIdentity({
  nativeId: "hedera:testnet:0.0.8504300",
});
assert(identity.id.startsWith("uaid:aid:"), "HCS-14 UAID generated");
assert(identity.id.includes("nativeId="), "HCS-14 UAID includes native id");

const runtime = await inspectYourTurnHederaAgentRuntime();
assert(runtime.hasYourTurnPlugin, "Agent Kit runtime has YourTurn plugin");
assert(runtime.hasCoreTransferTool, "Agent Kit runtime has core transfer tool");
assert(runtime.hasCoreAllowanceTool, "Agent Kit runtime has core allowance tool");
assert(runtime.hasCoreTokenAllowanceTool, "Agent Kit runtime has token allowance approval tool");
assert(
  runtime.hasCoreUsdcTransferWithAllowanceTool,
  "Agent Kit runtime has fungible token transfer-with-allowance tool"
);
assert(
  runtime.hakPolicies.some((policy) => policy.name === "Max Recipients Policy"),
  "Agent Kit runtime has MaxRecipientsPolicy"
);
assert(
  runtime.hakPolicies.some((policy) => policy.name === "Reject Tool Call"),
  "Agent Kit runtime has RejectToolPolicy"
);
if (runtime.auditTopicId) {
  assert(runtime.hasHcsAuditTrailHook, "Agent Kit runtime has HcsAuditTrailHook");
}

const hakPolicies = buildYourTurnHakPolicies();
const rejectPolicy = hakPolicies.find((policy) => policy.name === "Reject Tool Call");
const maxRecipientsPolicy = hakPolicies.find(
  (policy) => policy.name === "Max Recipients Policy"
);
assert(rejectPolicy, "RejectToolPolicy can be constructed");
assert(maxRecipientsPolicy, "MaxRecipientsPolicy can be constructed");

let rejectedDeleteAccount = false;
try {
  await rejectPolicy.preToolExecutionHook(
    {
      context: { hooks: hakPolicies },
      rawParams: {},
      client: {},
    },
    HAK_REJECTED_TOOL_METHODS[0]
  );
} catch {
  rejectedDeleteAccount = true;
}
assert(rejectedDeleteAccount, "RejectToolPolicy blocks destructive account tool");

let rejectedBulkRecipients = false;
try {
  await maxRecipientsPolicy.postParamsNormalizationHook(
    {
      context: { hooks: hakPolicies },
      rawParams: {},
      normalisedParams: {
        hbarTransfers: [
          { accountId: "0.0.1001", amount: 1 },
          { accountId: "0.0.1002", amount: 1 },
        ],
      },
      client: {},
    },
    "transfer_hbar_tool"
  );
} catch {
  rejectedBulkRecipients = true;
}
assert(rejectedBulkRecipients, "MaxRecipientsPolicy blocks multi-recipient HBAR transfer");

const protocolDescriptors = buildAgentProtocolDescriptors("http://localhost:3000");
assert(
  protocolDescriptors.a2a.identifiers.hcs14,
  "A2A descriptor includes HCS-14 id"
);
assert(
  protocolDescriptors.openclaw.status === "descriptor_only",
  "OpenClaw descriptor is honest"
);
assert(
  protocolDescriptors.x402.status === "payment_required_endpoint_live" ||
    protocolDescriptors.x402.status === "settlement_enabled",
  "x402 descriptor exposes Hedera payment-required endpoint"
);
const x402Requirements = buildHederaX402PaymentRequirements("http://localhost:3000");
assert(
  x402Requirements.some((requirement) => requirement.assetSymbol === "HBAR"),
  "x402 requirements include HBAR"
);
assert(
  x402Requirements.some((requirement) => requirement.assetSymbol === "USDC"),
  "x402 requirements include HTS USDC"
);

const output = {
  ok: true,
  agent: {
    name: YOURTURN_AGENT_NAME,
    version: YOURTURN_AGENT_VERSION,
    agentKitVersion,
    manifestVersion: YOURTURN_TOOL_MANIFEST_VERSION,
    hcs14: identity.id,
  },
  runtime: {
    mode: runtime.mode,
    toolMethods: runtime.toolMethods,
    hasCoreTransferTool: runtime.hasCoreTransferTool,
    hasCoreAllowanceTool: runtime.hasCoreAllowanceTool,
    hasCoreTokenAllowanceTool: runtime.hasCoreTokenAllowanceTool,
    hasCoreUsdcTransferWithAllowanceTool:
      runtime.hasCoreUsdcTransferWithAllowanceTool,
    hasYourTurnPlugin: runtime.hasYourTurnPlugin,
    hasHcsAuditTrailHook: runtime.hasHcsAuditTrailHook,
    auditTopicId: runtime.auditTopicId,
    hakPolicies: runtime.hakPolicies,
  },
  toolsChecked: YOURTURN_AGENT_TOOLS.map((tool) => ({
    id: tool.id,
    mutation: tool.mutation,
    requiresHumanApproval: tool.requiresHumanApproval,
    hederaServices: tool.hederaServices,
  })),
  manifestChecks: manifestChecks.length,
  policiesChecked: policyAssertions,
  hakPoliciesChecked: [
    "Agent Kit runtime includes MaxRecipientsPolicy",
    "Agent Kit runtime includes RejectToolPolicy",
    runtime.auditTopicId
      ? "Agent Kit runtime includes HcsAuditTrailHook"
      : "Agent Kit HcsAuditTrailHook is enabled when a BOOKED_RIGHTS_TOPIC_ID or stored audit topic exists",
    "RejectToolPolicy blocks destructive account tools",
    "MaxRecipientsPolicy blocks multi-recipient HBAR transfers",
  ],
  policyScenarios,
  protocols: {
    a2a: "live descriptor at /.well-known/agent.json and /api/agent/capabilities",
    hcs14: "live deterministic UAID descriptor",
    openclaw: "descriptor only; no Gateway-backed ACP runtime configured",
    x402:
      "Hedera exact payment-required endpoint exposed at /api/x402/recovery-policy",
    hederaX402:
      "payment-required endpoint exposes Hedera exact requirements for HBAR and HTS USDC; settlement requires signed X-PAYMENT payload and facilitator verification",
  },
  bountyCoverage: bountyCoverage(),
  x402Requirements,
  remainingGaps: [
    "OpenClaw ACP Gateway runtime is not configured; descriptor only.",
    process.env.YOURTURN_X402_USDC_SETTLEMENT_TX_ID
      ? "x402 HBAR and USDC settlement are proven on Hedera testnet."
      : process.env.YOURTURN_X402_HBAR_SETTLEMENT_TX_ID
        ? "USDC x402 settlement still requires funding the payer with Hedera testnet USDC."
        : "x402 payment requirements are exposed; full settlement requires a signed X-PAYMENT payload and enabled facilitator verification.",
    "A2A is exposed as an agent card descriptor, not a remote multi-agent negotiation runtime.",
    process.env.NEXT_PUBLIC_REOWN_PROJECT_ID
      ? process.env.YOURTURN_POLICY_USDC_ALLOWANCE_TX_ID
        ? "WalletConnect UI is available for bounded USDC allowance approval; a live operator allowance tx id is also configured."
        : "WalletConnect UI is available for bounded USDC allowance approval; a live claim still requires a connected Hedera wallet signature."
      : "WalletConnect UI is present but disabled until NEXT_PUBLIC_REOWN_PROJECT_ID is configured.",
    "Scheduled token release/refund remains future scope.",
  ],
};

console.log(JSON.stringify(output, null, 2));
process.exit(0);
