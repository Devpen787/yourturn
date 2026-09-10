import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Wallet } from "ethers";
import { formatSIWEMessage } from "@worldcoin/agentkit";
import { authorizeWorldRecoveryWrite } from "../lib/world-agentkit/recovery-write-gate.ts";

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
    return "private-human-id-fixture";
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
    chainId: "eip155:480",
    type: "eip191",
  };
  const message = formatSIWEMessage(info, wallet.address);
  const signature = await wallet.signMessage(message);
  return Buffer.from(
    JSON.stringify({ ...info, address: wallet.address, signature }),
    "utf8"
  ).toString("base64");
}

function mutateHeader(header, mutate) {
  const payload = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
  mutate(payload);
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

const delegated = new Wallet(
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
);
const other = new Wallet(
  "0x8b3a350cf5c34c9194ca3a545d4b37d4c9088a3d31cb26449a4e8d78b109a0c4"
);
const resourceUri = "https://yourturn.example/api/agent/confirm";
const baseGrant = {
  kind: "booked-rights-approval-grant",
  grantId: "grant-world-write-fixture",
  action: "create_listing",
  actor: { kind: "demoActor", id: "guestA" },
  serial: 193,
  delegatedAgentAddress: delegated.address,
  approvedBy: "guestA",
  approvedAt: new Date(Date.now() - 1_000).toISOString(),
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  source: "agent_handoff",
};

async function authorize({
  header,
  grant = baseGrant,
  store = memoryNonceStore(),
  agentBook = registeredAgentBook,
  resource = resourceUri,
} = {}) {
  return authorizeWorldRecoveryWrite({
    agentkitHeader:
      header ?? (await signedHeader(delegated, resourceUri, `gate${Date.now()}a`)),
    expectedResourceUri: resource,
    grant,
    previewAction: "create_listing",
    previewSerial: 193,
    nonceStore: store,
    agentBook,
  });
}

const allowed = await authorize({
  header: await signedHeader(delegated, resourceUri, "writegate0001"),
});
assert.equal(allowed.status, "allowed");
assert.equal(allowed.reason, "human_backed_delegated_agent_verified");
assert.deepEqual(Object.keys(allowed.publicTrust).sort(), ["signal", "source", "verifiedAt"]);
assert.equal("agentAddress" in allowed.publicTrust, false);
assert.equal("humanId" in allowed.publicTrust, false);
assert.equal(JSON.stringify(allowed).includes("private-human-id-fixture"), false);

assert.equal(
  (await authorize({ grant: { ...baseGrant, action: "any" } })).reason,
  "mandate_action_not_exact"
);
assert.equal(
  (await authorize({ grant: { ...baseGrant, serial: 194 } })).reason,
  "mandate_serial_not_exact"
);
const { actor: _actor, ...withoutActor } = baseGrant;
assert.equal((await authorize({ grant: withoutActor })).reason, "mandate_actor_missing");
const { delegatedAgentAddress: _agent, ...withoutAgent } = baseGrant;
assert.equal((await authorize({ grant: withoutAgent })).reason, "mandate_agent_missing");
assert.equal(
  (await authorize({ grant: { ...baseGrant, delegatedAgentAddress: "not-an-address" } })).reason,
  "mandate_agent_invalid"
);

const wrongAgent = await authorize({
  header: await signedHeader(other, resourceUri, "writegate0002"),
});
assert.equal(wrongAgent.status, "blocked");
assert.equal(wrongAgent.reason, "world_agent_mismatch");

const replayStore = memoryNonceStore();
const replayHeader = await signedHeader(delegated, resourceUri, "writegate0003");
assert.equal((await authorize({ header: replayHeader, store: replayStore })).status, "allowed");
const replay = await authorize({ header: replayHeader, store: replayStore });
assert.equal(replay.status, "blocked");
assert.equal(replay.reason, "world_agentkit_message_invalid");

const tamperedHeader = mutateHeader(
  await signedHeader(delegated, resourceUri, "writegate0004"),
  payload => {
    payload.signature = `${payload.signature.slice(0, -1)}${payload.signature.endsWith("0") ? "1" : "0"}`;
  }
);
assert.equal(
  (await authorize({ header: tamperedHeader })).reason,
  "world_agentkit_signature_invalid"
);

assert.equal(
  (
    await authorize({
      header: await signedHeader(delegated, resourceUri, "writegate0005"),
      agentBook: unresolvedAgentBook,
    })
  ).reason,
  "world_agentbook_unresolved"
);

const previewResource = "https://yourturn.example/api/agent/preview";
assert.equal(
  (
    await authorize({
      header: await signedHeader(delegated, previewResource, "writegate0006"),
    })
  ).reason,
  "world_exact_resource_mismatch"
);

const routeSource = readFileSync("app/api/agent/confirm/route.ts", "utf8");
assert.match(routeSource, /isWorldProtectedRecoveryAction\(preview\.action\)/);
assert.match(routeSource, /process\.env\.BOOKED_RIGHTS_APPROVAL_SECRET/);
assert.match(routeSource, /createRedisWorldAgentNonceStore\(\)/);
assert.match(routeSource, /req\.headers\.get\("agentkit"\)/);
assert.match(routeSource, /authorizeWorldRecoveryWrite\(/);
assert.ok(
  routeSource.indexOf("authorizeWorldRecoveryWrite({") <
    routeSource.indexOf("bookingPort.confirmCreateListing({"),
  "World identity gate must execute before recovery listing mutation"
);
assert.ok(
  routeSource.indexOf("authorizeWorldRecoveryWrite({") <
    routeSource.indexOf("bookingPort.confirmCancelRelease({"),
  "World identity gate must execute before recovery release mutation"
);

console.log(
  "World recovery write gate checks passed: exact mandate + official AgentKit + AgentBook + replay + privacy."
);
