import { readFileSync } from "node:fs";

const path = "docs/agent-lab/yourturn-concierge-agent-lab.ts";
const text = readFileSync(path, "utf8");

function assert(condition, label) {
  if (!condition) throw new Error(`${label} failed`);
  return label;
}

const checks = [
  assert(text.includes("@hashgraph/hedera-agent-kit"), "uses Agent Kit"),
  assert(text.includes("MaxRecipientsPolicy"), "uses MaxRecipientsPolicy"),
  assert(text.includes("RejectToolPolicy"), "uses RejectToolPolicy"),
  assert(text.includes("HcsAuditTrailHook"), "uses HcsAuditTrailHook"),
  assert(text.includes("yourturn_policy_agent_describe"), "exports proof tool"),
  assert(text.includes("yourturn_recovery_preview"), "exports preview tool"),
  assert(text.includes("yourturn_wallet_budget_describe"), "exports wallet-budget tool"),
  assert(text.includes("/api/agent/week5-proof"), "calls Week 5 proof API"),
  assert(text.includes("/api/wallet-budget/config"), "calls wallet-budget config API"),
  assert(text.includes("YOURTURN_AGENT_LAB_SYSTEM_PROMPT"), "has narrow agent prompt"),
];

console.log(
  JSON.stringify(
    {
      ok: true,
      source: path,
      checks,
      claimBoundary:
        "Agent Lab packet is a compatibility/export artifact; production runtime remains the Next.js Concierge flow.",
    },
    null,
    2
  )
);
