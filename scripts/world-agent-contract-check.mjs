import assert from "node:assert/strict";
import {
  WORLD_AGENT_MAX_CLOCK_SKEW_MS,
  evaluateWorldAgentGate,
  toWorldPublicTrustSummary,
} from "../lib/world-agentkit/trust-boundary.ts";

const nowMs = Date.parse("2026-09-09T20:45:00.000Z");
const delegatedAgent = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
const valid = {
  source: "world-agentkit",
  agentAddress: delegatedAgent,
  humanBacked: true,
  agentBookResolved: true,
  resourceUri: "https://yourturn.example/api/recovery/confirm",
  verifiedAt: "2026-09-09T20:44:00.000Z",
  expiresAt: "2026-09-09T20:49:00.000Z",
};

const evaluate = (verification = valid, expectedAgentAddress = delegatedAgent, timeMs = nowMs) =>
  evaluateWorldAgentGate(verification, valid.resourceUri, expectedAgentAddress, timeMs);

assert.deepEqual(evaluate(), {
  status: "allowed",
  reason: "human_backed_agent_verified",
});
assert.deepEqual(evaluate(valid, delegatedAgent.toUpperCase().replace("0X", "0x")), {
  status: "allowed",
  reason: "human_backed_agent_verified",
});
assert.equal(evaluate({ ...valid, source: "client-asserted" }).reason, "source_mismatch");
assert.equal(evaluate({ ...valid, humanBacked: false }).reason, "not_human_backed");
assert.equal(evaluate({ ...valid, agentBookResolved: false }).reason, "agentbook_unresolved");
assert.equal(
  evaluateWorldAgentGate(valid, "https://yourturn.example/api/other", delegatedAgent, nowMs).reason,
  "resource_mismatch"
);
assert.equal(evaluate(valid, "not-an-address").reason, "invalid_agent_address");
assert.equal(evaluate({ ...valid, agentAddress: "not-an-address" }).reason, "invalid_agent_address");
assert.equal(evaluate(valid, "0x2222222222222222222222222222222222222222").reason, "agent_mismatch");
assert.equal(evaluate({ ...valid, expiresAt: "2026-09-09T20:44:30.000Z" }).reason, "expired");
assert.equal(evaluate({ ...valid, verifiedAt: "not-a-date" }).reason, "invalid_timestamp");

const justInsideSkew = new Date(nowMs + WORLD_AGENT_MAX_CLOCK_SKEW_MS).toISOString();
assert.equal(
  evaluate({ ...valid, verifiedAt: justInsideSkew, expiresAt: new Date(nowMs + 120_000).toISOString() }).status,
  "allowed"
);
const beyondSkew = new Date(nowMs + WORLD_AGENT_MAX_CLOCK_SKEW_MS + 1).toISOString();
assert.equal(
  evaluate({ ...valid, verifiedAt: beyondSkew, expiresAt: new Date(nowMs + 120_000).toISOString() }).reason,
  "verified_in_future"
);

const publicSummary = toWorldPublicTrustSummary(valid);
assert.equal(publicSummary.signal, "human-backed-agent");
assert.equal("agentAddress" in publicSummary, false);
assert.equal("humanId" in publicSummary, false);
console.log("World AgentKit trust-boundary contract checks passed.");
