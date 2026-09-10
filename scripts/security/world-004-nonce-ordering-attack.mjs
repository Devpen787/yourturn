import assert from "node:assert/strict";
import { Wallet } from "ethers";
import { formatSIWEMessage } from "@worldcoin/agentkit";
import { verifyWorldAgentRequest } from "../../lib/world-agentkit/server-verifier.ts";

const resourceUri = "https://yourturn.example/api/agent/confirm";
const delegated = Wallet.createRandom();
const wrong = Wallet.createRandom();
const privateHumanId = "security-fixture-human-id-must-never-escape";

const registeredAgentBook = {
  async lookupHuman() {
    return privateHumanId;
  },
};
const unresolvedAgentBook = {
  async lookupHuman() {
    return null;
  },
};

async function signedHeader(wallet, resource, nonce) {
  const issuedAt = new Date();
  const info = {
    domain: new URL(resource).hostname,
    uri: resource,
    statement: "Independent World nonce-ordering security retest",
    version: "1",
    nonce,
    issuedAt: issuedAt.toISOString(),
    expirationTime: new Date(issuedAt.getTime() + 120_000).toISOString(),
    resources: [resource],
    chainId: "eip155:480",
    type: "eip191",
  };
  const signature = await wallet.signMessage(formatSIWEMessage(info, wallet.address));
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

function countingNonceStore(options = {}) {
  const consumed = new Set();
  const calls = { isFresh: 0, consume: 0 };
  const key = ({ nonce, resourceUri: resource }) => `${resource}\u0000${nonce}`;
  return {
    calls,
    async isFresh(input) {
      calls.isFresh += 1;
      if (options.throwOnIsFresh) throw new Error("freshness backend unavailable");
      return !consumed.has(key(input));
    },
    async consume(input) {
      calls.consume += 1;
      if (options.throwOnConsume) throw new Error("consume backend unavailable");
      const value = key(input);
      if (consumed.has(value)) return false;
      consumed.add(value);
      return true;
    },
  };
}

function barrierNonceStore(expectedFreshCalls = 2) {
  const consumed = new Set();
  let freshCalls = 0;
  let releaseFresh;
  const freshBarrier = new Promise((resolve) => {
    releaseFresh = resolve;
  });
  const calls = { consume: 0 };
  const key = ({ nonce, resourceUri: resource }) => `${resource}\u0000${nonce}`;
  return {
    calls,
    async isFresh(input) {
      freshCalls += 1;
      if (freshCalls >= expectedFreshCalls) releaseFresh();
      await freshBarrier;
      return !consumed.has(key(input));
    },
    async consume(input) {
      calls.consume += 1;
      const value = key(input);
      if (consumed.has(value)) return false;
      consumed.add(value);
      return true;
    },
  };
}

async function verify({
  wallet = delegated,
  expectedAgentAddress = delegated.address,
  nonce,
  resource = resourceUri,
  expectedResource = resourceUri,
  store,
  agentBook = registeredAgentBook,
  header,
}) {
  return verifyWorldAgentRequest({
    agentkitHeader: header ?? (await signedHeader(wallet, resource, nonce)),
    expectedResourceUri: expectedResource,
    expectedAgentAddress,
    nonceStore: store,
    agentBook,
  });
}

const sharedStore = countingNonceStore();
const sharedNonce = "secworld004shared01";
const wrongFirst = await verify({ wallet: wrong, nonce: sharedNonce, store: sharedStore });
assert.equal(wrongFirst.status, "blocked");
assert.equal(wrongFirst.reason, "agent_mismatch");
assert.equal(sharedStore.calls.consume, 0, "wrong agent burned the shared nonce");

const delegatedSecond = await verify({ nonce: sharedNonce, store: sharedStore });
assert.equal(delegatedSecond.status, "allowed");
assert.equal(delegatedSecond.reason, "human_backed_agent_verified");
assert.equal(sharedStore.calls.consume, 1);
assert.equal(JSON.stringify(delegatedSecond).includes(privateHumanId), false);

const concurrentStore = barrierNonceStore(2);
const concurrentHeader = await signedHeader(delegated, resourceUri, "secworld004race01");
const concurrent = await Promise.all([
  verify({ nonce: "unused-a", store: concurrentStore, header: concurrentHeader }),
  verify({ nonce: "unused-b", store: concurrentStore, header: concurrentHeader }),
]);
const allowed = concurrent.filter((result) => result.status === "allowed");
const blocked = concurrent.filter((result) => result.status === "blocked");
assert.equal(allowed.length, 1, "concurrent replay produced more than one winner");
assert.equal(blocked.length, 1);
assert.equal(blocked[0].reason, "nonce_replayed");
assert.equal(concurrentStore.calls.consume, 2);

const tamperStore = countingNonceStore();
const goodHeader = await signedHeader(delegated, resourceUri, "secworld004tamper1");
const tamperedHeader = mutateHeader(goodHeader, (payload) => {
  payload.signature = `${payload.signature.slice(0, -1)}${payload.signature.endsWith("0") ? "1" : "0"}`;
});
const tampered = await verify({
  nonce: "unused-c",
  store: tamperStore,
  header: tamperedHeader,
});
assert.equal(tampered.status, "blocked");
assert.equal(tampered.reason, "agentkit_signature_invalid");
assert.equal(tamperStore.calls.consume, 0);

const resourceStore = countingNonceStore();
const previewUri = "https://yourturn.example/api/agent/preview";
const wrongResource = await verify({
  wallet: delegated,
  nonce: "secworld004resource1",
  resource: previewUri,
  expectedResource: resourceUri,
  store: resourceStore,
});
assert.equal(wrongResource.status, "blocked");
assert.equal(wrongResource.reason, "exact_resource_mismatch");
assert.equal(resourceStore.calls.consume, 0);

const unresolvedStore = countingNonceStore();
const unresolved = await verify({
  nonce: "secworld004book001",
  store: unresolvedStore,
  agentBook: unresolvedAgentBook,
});
assert.equal(unresolved.status, "blocked");
assert.equal(unresolved.reason, "agentbook_unresolved");
assert.equal(unresolvedStore.calls.consume, 0);

const freshnessFailure = await verify({
  nonce: "secworld004fresh01",
  store: countingNonceStore({ throwOnIsFresh: true }),
});
assert.equal(freshnessFailure.status, "blocked");
assert.equal(freshnessFailure.reason, "nonce_store_unavailable");

const consumeFailureStore = countingNonceStore({ throwOnConsume: true });
const consumeFailure = await verify({
  nonce: "secworld004consume1",
  store: consumeFailureStore,
});
assert.equal(consumeFailure.status, "blocked");
assert.equal(consumeFailure.reason, "nonce_store_unavailable");
assert.equal(consumeFailureStore.calls.consume, 1);

console.log(
  JSON.stringify({
    ok: true,
    target: "SEC-WORLD-004",
    wrongAgentSharedNonceNotConsumed: true,
    delegatedAgentSameNonceAllowedAfterWrongAgent: true,
    concurrentAuthorizedReplayWinners: allowed.length,
    tamperConsumesNonce: false,
    wrongResourceConsumesNonce: false,
    unresolvedAgentConsumesNonce: false,
    nonceBackendFailureFailsClosed: true,
    rawHumanIdExposed: false,
  })
);
