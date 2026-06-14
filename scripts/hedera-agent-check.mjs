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

const policyScenarios = {
  validListing: summarizeChecks(validListing),
  validRefund: summarizeChecks(validRefund),
  blockedNonHolder: summarizeChecks(blockedNonHolder),
  blockedResaleDisabled: summarizeChecks(blockedResaleDisabled),
  blockedDuplicateListing: summarizeChecks(blockedDuplicateListing),
  scheduleInspect: summarizeChecks(scheduleInspect),
};

const policyAssertions = [
  assert(policyChecksPassed(validListing), "valid listing policies pass"),
  assert(policyChecksPassed(validRefund), "valid refund policies pass"),
  assert(!policyChecksPassed(blockedNonHolder), "non-holder is blocked"),
  assert(!policyChecksPassed(blockedResaleDisabled), "resale-disabled listing is blocked"),
  assert(!policyChecksPassed(blockedDuplicateListing), "duplicate listing is blocked"),
  assert(policyChecksPassed(scheduleInspect), "schedule inspection policies pass"),
];

const output = {
  ok: true,
  agent: {
    name: YOURTURN_AGENT_NAME,
    version: YOURTURN_AGENT_VERSION,
    agentKitVersion,
    manifestVersion: YOURTURN_TOOL_MANIFEST_VERSION,
  },
  toolsChecked: YOURTURN_AGENT_TOOLS.map((tool) => ({
    id: tool.id,
    mutation: tool.mutation,
    requiresHumanApproval: tool.requiresHumanApproval,
    hederaServices: tool.hederaServices,
  })),
  manifestChecks: manifestChecks.length,
  policiesChecked: policyAssertions,
  policyScenarios,
  bountyCoverage: bountyCoverage(),
  remainingGaps: [
    "OpenClaw ACP is not integrated.",
    "x402, A2A, UCP, and HCS-14 agent identity are not integrated.",
    "Wallet-funded user budgets and fiat/stablecoin onramp are not integrated.",
    "Scheduled token release/refund remains future scope.",
  ],
};

console.log(JSON.stringify(output, null, 2));
