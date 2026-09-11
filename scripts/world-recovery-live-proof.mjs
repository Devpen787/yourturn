import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { Wallet, getAddress } from "ethers";
import {
  formatSIWEMessage,
  parseAgentkitHeader,
  verifyAgentkitSignature,
} from "@worldcoin/agentkit";

const DEFAULT_REGISTERED_AGENT =
  "0xef1c84eab9cc74bcbae321b75cf2d916ee329163";
const REMOTE_ACK = "NON_PRODUCTION_PREVIEW_ONLY";

function flag(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  return hit?.slice(prefix.length);
}

function requiredSecret(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`Missing required local environment variable: ${names.join(" or ")}`);
}

function positiveNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive number`);
  }
  return parsed;
}

function positiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

function normalizeBaseUrl(raw) {
  const url = new URL(raw);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (!local) {
    if (url.protocol !== "https:") {
      throw new Error("Remote World recovery proof targets must use HTTPS");
    }
    if (process.env.WORLD_RECOVERY_PROOF_ALLOW_REMOTE !== REMOTE_ACK) {
      throw new Error(
        `Remote execution is fail-closed. Set WORLD_RECOVERY_PROOF_ALLOW_REMOTE=${REMOTE_ACK} only for an explicitly non-production preview target.`
      );
    }
  }
  return { baseUrl: url.href.replace(/\/$/, ""), local };
}

function buildAgentkitHeader(wallet, resourceUri, nonce) {
  const issuedAt = new Date();
  const payload = {
    domain: new URL(resourceUri).hostname,
    uri: resourceUri,
    statement:
      "Authorize the exact human-backed delegated agent for this YourTurn recovery write",
    version: "1",
    nonce,
    issuedAt: issuedAt.toISOString(),
    expirationTime: new Date(issuedAt.getTime() + 120_000).toISOString(),
    resources: [resourceUri],
    chainId: "eip155:480",
    type: "eip191",
  };
  return { payload, message: formatSIWEMessage(payload, wallet.address) };
}

async function signAgentkitHeader(wallet, resourceUri, nonce) {
  const { payload, message } = buildAgentkitHeader(wallet, resourceUri, nonce);
  const signature = await wallet.signMessage(message);
  return Buffer.from(
    JSON.stringify({ ...payload, address: wallet.address, signature }),
    "utf8"
  ).toString("base64");
}

async function requestJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${url} returned non-JSON HTTP ${response.status}`);
  }
  if (!response.ok || !body?.ok) {
    const code = body?.code || `HTTP_${response.status}`;
    const message =
      (typeof body?.error === "string" && body.error) ||
      body?.error?.message ||
      body?.message ||
      "request failed";
    throw new Error(`${url} failed: ${code}: ${message}`);
  }
  return body;
}

function assertRecoveryPreflightState({ slot, holdings, listing, actorId, serial }) {
  if (!slot || typeof slot !== "object") {
    throw new Error(
      `Serial ${serial} is not initialized in the target environment. Use an existing non-production booked serial; do not create/fund new state for this proof.`
    );
  }
  if (slot.status !== "HELD") {
    throw new Error(
      `Serial ${serial} must be HELD before create_listing proof; current status is ${String(slot.status)}`
    );
  }
  if (slot.resaleAllowed !== true) {
    throw new Error(`Serial ${serial} does not allow resale under its stored provider policy`);
  }
  if (!Array.isArray(holdings) || !holdings.some((item) => item?.serial === serial)) {
    throw new Error(`Serial ${serial} is not currently held by ${actorId}`);
  }
  if (listing?.active) {
    throw new Error(`Serial ${serial} already has an active listing`);
  }
}

async function preflightRecoveryState({ baseUrl, actor, serial }) {
  const readUrl = `${baseUrl}/api/agent/read`;
  const [slotResponse, holdingsResponse, listingResponse] = await Promise.all([
    requestJson(readUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "getSlot", serial }),
    }),
    requestJson(readUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "listHoldings", holder: actor }),
    }),
    requestJson(readUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "getListing", serial }),
    }),
  ]);

  assertRecoveryPreflightState({
    slot: slotResponse?.data,
    holdings: holdingsResponse?.data,
    listing: listingResponse?.data,
    actorId: actor.id,
    serial,
  });

  return {
    initialized: true,
    serial,
    actor: actor.id,
    slotStatus: slotResponse.data.status,
    resaleAllowed: slotResponse.data.resaleAllowed === true,
    currentHolderMatchesActor: true,
    activeListingAbsent: true,
  };
}

async function selfTest() {
  const wallet = Wallet.createRandom();
  const resource = "http://localhost:3000/api/agent/confirm";
  const header = await signAgentkitHeader(wallet, resource, "selftest0001");
  const parsed = parseAgentkitHeader(header);
  const verified = await verifyAgentkitSignature(parsed);
  assert.equal(verified.valid, true);
  assert.equal(getAddress(verified.address), getAddress(wallet.address));
  assert.equal(parsed.uri, resource);
  assert.deepEqual(parsed.resources, [resource]);
  assert.equal(parsed.chainId, "eip155:480");

  const readyState = {
    slot: { serial: 7, status: "HELD", resaleAllowed: true },
    holdings: [{ serial: 7, status: "HELD" }],
    listing: null,
    actorId: "guestA",
    serial: 7,
  };
  assert.doesNotThrow(() => assertRecoveryPreflightState(readyState));
  assert.throws(
    () => assertRecoveryPreflightState({ ...readyState, holdings: [] }),
    /not currently held by guestA/
  );
  assert.throws(
    () =>
      assertRecoveryPreflightState({
        ...readyState,
        slot: { serial: 7, status: "FROZEN", resaleAllowed: true },
      }),
    /must be HELD/
  );
  assert.throws(
    () => assertRecoveryPreflightState({ ...readyState, listing: { active: true } }),
    /already has an active listing/
  );

  console.log(
    "World recovery live-proof runner self-test passed: exact resource + official AgentKit signature verification + non-secret target-state preflight."
  );
}

async function main() {
  if (process.argv.includes("--self-test")) {
    await selfTest();
    return;
  }

  const { baseUrl, local } = normalizeBaseUrl(
    flag("base-url") || process.env.YOURTURN_BASE_URL || "http://localhost:3000"
  );
  const serial = positiveInteger(
    flag("serial") || process.env.WORLD_RECOVERY_PROOF_SERIAL,
    "serial"
  );
  const askPriceHbar = positiveNumber(
    flag("ask-hbar") || process.env.WORLD_RECOVERY_PROOF_ASK_HBAR || "1",
    "ask-hbar"
  );
  const actorId = flag("actor") || process.env.WORLD_RECOVERY_PROOF_ACTOR || "guestA";
  if (!new Set(["guestA", "guestB"]).has(actorId)) {
    throw new Error("actor must be guestA or guestB for this bounded proof runner");
  }

  const expectedAgent = getAddress(
    flag("agent") || process.env.WORLD_AGENT_ADDRESS || DEFAULT_REGISTERED_AGENT
  );
  const actor = { kind: "demoActor", id: actorId };

  // Resolve every non-secret target-state prerequisite before reading local
  // signer/admin secrets. This does not mutate state and makes a failed local
  // ceremony actionable without exposing or unnecessarily loading the agent key.
  const preflight = await preflightRecoveryState({ baseUrl, actor, serial });
  if (process.argv.includes("--preflight")) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          evidenceLevel: "LOCAL/PREFLIGHT",
          targetClass: local ? "local" : "explicit-non-production-remote",
          expectedAgentAddress: expectedAgent,
          ...preflight,
          humanIdExposed: false,
          claimBoundary:
            "This checks only non-secret target readiness for the registered-agent proof. It does not sign, authorize, mutate, or prove LIVE/SIGNED-ROUTE.",
        },
        null,
        2
      )
    );
    return;
  }

  const privateKey = requiredSecret("WORLD_AGENT_PRIVATE_KEY");
  const approvalAdminSecret = requiredSecret(
    "BOOKED_RIGHTS_APPROVAL_ADMIN_SECRET",
    "BOOKED_RIGHTS_APPROVAL_SECRET"
  );
  const wallet = new Wallet(privateKey);
  if (getAddress(wallet.address) !== expectedAgent) {
    throw new Error(
      "WORLD_AGENT_PRIVATE_KEY does not resolve to the explicitly registered delegated agent"
    );
  }

  const previewUrl = `${baseUrl}/api/agent/preview`;
  const grantUrl = `${baseUrl}/api/agent/approval-grant`;
  const confirmUrl = `${baseUrl}/api/agent/confirm`;
  const readUrl = `${baseUrl}/api/agent/read`;

  const previewResponse = await requestJson(previewUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "create_listing",
      seller: actor,
      serial,
      askPriceHbar,
    }),
  });
  const previewId = previewResponse?.preview?.previewId;
  if (typeof previewId !== "string" || !previewId) {
    throw new Error("Preview succeeded without a previewId");
  }

  const grantResponse = await requestJson(grantUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-booked-rights-approval-secret": approvalAdminSecret,
    },
    body: JSON.stringify({
      action: "create_listing",
      actor,
      serial,
      delegatedAgentAddress: expectedAgent,
      approvedBy: actorId,
      ttlSeconds: 300,
      source: "agent_handoff",
    }),
  });
  const approvalGrant = grantResponse?.grantToken;
  if (typeof approvalGrant !== "string" || !approvalGrant) {
    throw new Error("Approval-grant endpoint succeeded without a grantToken");
  }

  const nonce = randomBytes(16).toString("hex");
  const agentkitHeader = await signAgentkitHeader(wallet, confirmUrl, nonce);
  const confirmResponse = await requestJson(confirmUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      agentkit: agentkitHeader,
    },
    body: JSON.stringify({ previewId, approvalGrant }),
  });

  if (confirmResponse?.worldTrust?.signal !== "human-backed-agent") {
    throw new Error("Recovery write succeeded without the expected public World trust signal");
  }

  const listingResponse = await requestJson(readUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "getListing", serial }),
  });
  if (!listingResponse?.data) {
    throw new Error("Recovery confirm returned success but the listing mutation was not readable");
  }

  // Deliberately privacy-minimized. Never print the private key, grant token,
  // AgentKit header/signature, nonce, approval secret, or AgentBook human id.
  console.log(
    JSON.stringify(
      {
        ok: true,
        evidenceLevel: "LIVE/SIGNED-ROUTE",
        action: "create_listing",
        serial,
        resourceUri: confirmUrl,
        targetClass: local ? "local" : "explicit-non-production-remote",
        agentAddress: expectedAgent,
        verifierNetwork: "worldchain",
        agentBookResolved: true,
        targetPreflight: preflight,
        mutationVerified: true,
        worldTrust: confirmResponse.worldTrust,
        humanIdExposed: false,
        completedAt: new Date().toISOString(),
        claimBoundary:
          "This proves the registered delegated agent signed the exact recovery resource, passed YourTurn's official AgentKit + AgentBook gate, and the configured create-listing write became readable. It does not prove World grants booking ownership or provider entitlement, and branch-local ApprovalGrantClaims are not final holder authority.",
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        evidenceLevel: process.argv.includes("--preflight")
          ? "LOCAL/PREFLIGHT"
          : "LIVE/SIGNED-ROUTE",
        error: error instanceof Error ? error.message : String(error),
        humanIdExposed: false,
      },
      null,
      2
    )
  );
  process.exit(1);
});
