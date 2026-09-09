import assert from "node:assert/strict";
import { Wallet } from "ethers";
import { formatSIWEMessage } from "@worldcoin/agentkit";
import {
  WORLD_AGENT_MAX_CLOCK_SKEW_MS,
  evaluateWorldAgentGate,
  toWorldPublicTrustSummary,
} from "../lib/world-agentkit/trust-boundary.ts";
import { verifyWorldAgentRequest } from "../lib/world-agentkit/server-verifier.ts";

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

// --- Official @worldcoin/agentkit 0.2.1 verifier adapter ---

function memoryNonceStore() {
  const consumed = new Set();
  const key = ({ nonce, resourceUri }) => `${resourceUri}\u0000${nonce}`;
  return {
    async isFresh(input) {
      return !consumed.has(key(input));
    },
    async consume(input) {
      const value = key(input);
      if (consumed.has(value)) return false;
      consumed.add(value);
      return true;
    },
  };
}

const registeredAgentBook = {
  async lookupHuman() {
    return "anonymous-human-id-that-must-not-escape";
  },
};
const unresolvedAgentBook = {
  async lookupHuman() {
    return null;
  },
};

async function signedHeader(wallet, resourceUri, nonce) {
  const issuedAt = new Date();
  const info = {
    domain: new URL(resourceUri).hostname,
    uri: resourceUri,
    statement: "Authorize a human-backed agent for this YourTurn recovery resource",
    version: "1",
    nonce,
    issuedAt: issuedAt.toISOString(),
    expirationTime: new Date(issuedAt.getTime() + 120_000).toISOString(),
    resources: [resourceUri],
    chainId: "eip155:8453",
    type: "eip191",
  };
  const message = formatSIWEMessage(info, wallet.address);
  const signature = await wallet.signMessage(message);
  return Buffer.from(JSON.stringify({ ...info, address: wallet.address, signature }), "utf8").toString("base64");
}

function mutateHeader(header, mutate) {
  const payload = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
  mutate(payload);
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

const wallet = new Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
const otherWallet = new Wallet("0x8b3a350cf5c34c9194ca3a545d4b37d4c9088a3d31cb26449a4e8d78b109a0c4");
const resourceUri = "https://yourturn.example/api/recovery/confirm";

const liveStyleStore = memoryNonceStore();
const header = await signedHeader(wallet, resourceUri, "agentkit-nonce-0001");
const first = await verifyWorldAgentRequest({
  agentkitHeader: header,
  expectedResourceUri: resourceUri,
  expectedAgentAddress: wallet.address,
  nonceStore: liveStyleStore,
  agentBook: registeredAgentBook,
});
assert.equal(first.status, "allowed");
assert.equal(first.reason, "human_backed_agent_verified");
assert.equal(first.verification.agentAddress.toLowerCase(), wallet.address.toLowerCase());
assert.equal(first.verification.humanBacked, true);
assert.equal(first.verification.agentBookResolved, true);
assert.equal("humanId" in first.verification, false);
assert.equal(JSON.stringify(first).includes("anonymous-human-id-that-must-not-escape"), false);

// The same authenticated request cannot be reused.
const replay = await verifyWorldAgentRequest({
  agentkitHeader: header,
  expectedResourceUri: resourceUri,
  expectedAgentAddress: wallet.address,
  nonceStore: liveStyleStore,
  agentBook: registeredAgentBook,
});
assert.equal(replay.status, "blocked");
assert.equal(replay.reason, "agentkit_message_invalid");
assert.match(replay.detail ?? "", /Nonce validation failed/i);

// A signature mutation is rejected by the official signature verifier and does
// not consume the nonce because consumption happens after cryptographic proof.
const tamperedSignature = mutateHeader(
  await signedHeader(wallet, resourceUri, "agentkit-nonce-0002"),
  payload => {
    payload.signature = `${payload.signature.slice(0, -1)}${payload.signature.endsWith("0") ? "1" : "0"}`;
  }
);
const tampered = await verifyWorldAgentRequest({
  agentkitHeader: tamperedSignature,
  expectedResourceUri: resourceUri,
  expectedAgentAddress: wallet.address,
  nonceStore: memoryNonceStore(),
  agentBook: registeredAgentBook,
});
assert.equal(tampered.status, "blocked");
assert.equal(tampered.reason, "agentkit_signature_invalid");

// AgentKit 0.2.1's validator binds the host. YourTurn additionally binds the
// full endpoint so a valid signature for /preview cannot authorize /confirm.
const previewHeader = await signedHeader(
  wallet,
  "https://yourturn.example/api/recovery/preview",
  "agentkit-nonce-0003"
);
const wrongResource = await verifyWorldAgentRequest({
  agentkitHeader: previewHeader,
  expectedResourceUri: resourceUri,
  expectedAgentAddress: wallet.address,
  nonceStore: memoryNonceStore(),
  agentBook: registeredAgentBook,
});
assert.equal(wrongResource.status, "blocked");
assert.equal(wrongResource.reason, "exact_resource_mismatch");

const unresolved = await verifyWorldAgentRequest({
  agentkitHeader: await signedHeader(wallet, resourceUri, "agentkit-nonce-0004"),
  expectedResourceUri: resourceUri,
  expectedAgentAddress: wallet.address,
  nonceStore: memoryNonceStore(),
  agentBook: unresolvedAgentBook,
});
assert.equal(unresolved.status, "blocked");
assert.equal(unresolved.reason, "agentbook_unresolved");

// Even another legitimately signed + AgentBook-resolved agent is not the agent
// independently delegated by the YourTurn Recovery Mandate.
const wrongAgent = await verifyWorldAgentRequest({
  agentkitHeader: await signedHeader(otherWallet, resourceUri, "agentkit-nonce-0005"),
  expectedResourceUri: resourceUri,
  expectedAgentAddress: wallet.address,
  nonceStore: memoryNonceStore(),
  agentBook: registeredAgentBook,
});
assert.equal(wrongAgent.status, "blocked");
assert.equal(wrongAgent.reason, "agent_mismatch");

const missing = await verifyWorldAgentRequest({
  agentkitHeader: null,
  expectedResourceUri: resourceUri,
  expectedAgentAddress: wallet.address,
  nonceStore: memoryNonceStore(),
  agentBook: registeredAgentBook,
});
assert.equal(missing.status, "blocked");
assert.equal(missing.reason, "missing_agentkit_header");

console.log("World AgentKit trust-boundary + official cryptographic verifier checks passed.");
