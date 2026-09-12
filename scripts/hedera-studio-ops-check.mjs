import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Client } from "@hiero-ledger/sdk";
import {
  YOURTURN_STUDIO_BOOKING_HOLDER_TOOL,
  YOURTURN_STUDIO_INVENTORY_TOOL,
  YOURTURN_STUDIO_NETWORK_HEALTH_TOOL,
  YOURTURN_STUDIO_OPS_TOOL_METHODS,
  YOURTURN_STUDIO_POLICY_TOOL,
  YOURTURN_STUDIO_RECEIVE_READINESS_TOOL,
  YOURTURN_STUDIO_RESALE_RECEIPT_TOOL,
  createYourTurnStudioOpsPlugin,
} from "../lib/hedera-agent-kit/studio-ops-plugin.ts";

const pluginSource = readFileSync(
  new URL("../lib/hedera-agent-kit/studio-ops-plugin.ts", import.meta.url),
  "utf8"
);
for (const forbidden of [
  "PrivateKey",
  ".setOperator(",
  "handleTransaction",
  "TokenAirdropTransaction",
  "BatchTransaction",
  "@hashgraph/hedera-agent-kit-mcp",
  "process.env",
]) {
  assert.equal(pluginSource.includes(forbidden), false, `read-only Studio Ops source must not contain ${forbidden}`);
}
assert.equal(YOURTURN_STUDIO_OPS_TOOL_METHODS.length, 6);
assert.equal(new Set(YOURTURN_STUDIO_OPS_TOOL_METHODS).size, 6);

const providerAccountId = "0.0.1900";
const receiverAccountId = "0.0.2002";
const otherAccountId = "0.0.2999";
const bookingTokenId = "0.0.3001";
const settlementTokenId = "0.0.429274";
const transactionId = "0.0.2002@1789139309.785362819";
const mirrorTransactionId = "0.0.2002-1789139309-785362819";

let trustedConnectedAccountId = receiverAccountId;
let accountBody = { account: receiverAccountId, receiver_sig_required: false };
let bookingRelationshipBody = {
  tokens: [
    {
      token_id: bookingTokenId,
      freeze_status: "FROZEN",
      kyc_status: "GRANTED",
      balance: 0,
    },
  ],
};
let settlementRelationshipBody = {
  tokens: [
    {
      token_id: settlementTokenId,
      freeze_status: "NOT_APPLICABLE",
      kyc_status: "NOT_APPLICABLE",
      balance: 90000000,
    },
  ],
};
let pendingBody = { airdrops: [] };
let inventoryBody = {
  nfts: [
    { token_id: bookingTokenId, serial_number: 11, account_id: providerAccountId, spender: null },
    { token_id: bookingTokenId, serial_number: 12, account_id: providerAccountId, spender: null },
  ],
};
let holderBody = {
  token_id: bookingTokenId,
  serial_number: 11,
  account_id: receiverAccountId,
  spender: null,
  delegating_spender: null,
};

const rootReceipt = (overrides = {}) => ({
  transaction_id: mirrorTransactionId,
  nonce: 0,
  scheduled: false,
  result: "SUCCESS",
  nft_transfers: [
    {
      token_id: bookingTokenId,
      serial_number: 11,
      sender_account_id: "0.0.2001",
      receiver_account_id: receiverAccountId,
      is_approval: true,
    },
  ],
  token_transfers: [
    { token_id: settlementTokenId, account: receiverAccountId, amount: -45000000 },
    { token_id: settlementTokenId, account: "0.0.2001", amount: 45000000 },
  ],
  ...overrides,
});

let receiptBody = { transactions: [rootReceipt()] };
let statusBody = { status: { indicator: "none", description: "All Systems Operational" } };
let latestMirrorBody = { transactions: [{ consensus_timestamp: "1789139310.000000000" }] };
const fetchFailures = new Set();

async function fetchJson(url) {
  for (const marker of fetchFailures) {
    if (url.includes(marker)) throw new Error(`fixture_read_failed:${marker}`);
  }
  if (url === "https://status.fixture/api/v2/status.json") return statusBody;
  if (url.includes(`/accounts/${providerAccountId}/nfts?`)) return inventoryBody;
  if (url.includes(`/tokens/${bookingTokenId}/nfts/11`)) return holderBody;
  if (url.endsWith(`/accounts/${receiverAccountId}`)) return accountBody;
  if (url.includes(`/accounts/${receiverAccountId}/tokens?token.id=${bookingTokenId}`)) {
    return bookingRelationshipBody;
  }
  if (url.includes(`/accounts/${receiverAccountId}/tokens?token.id=${settlementTokenId}`)) {
    return settlementRelationshipBody;
  }
  if (url.includes(`/accounts/${receiverAccountId}/airdrops/pending?`)) return pendingBody;
  if (url.includes(`/transactions/${mirrorTransactionId}`)) return receiptBody;
  if (url.endsWith("/transactions?limit=1&order=desc")) return latestMirrorBody;
  throw new Error(`unexpected_fixture_url:${url}`);
}

let policy = {
  providerId: "studio-a",
  version: "policy-v7",
  active: true,
  bookingTokenId,
  settlementTokenId,
  transferMode: "default_frozen_hip551",
  royaltyBps: 750,
};

const plugin = createYourTurnStudioOpsPlugin({
  mirrorBaseUrl: "https://mirror.fixture/api/v1",
  statusUrl: "https://status.fixture/api/v2/status.json",
  fetchJson,
  loadProviderPolicy: async () => policy,
  loadConnectedHederaAccountId: async () => trustedConnectedAccountId,
  nowMs: () => 1789139320000,
});
const tools = plugin.tools({});
assert.deepEqual(
  tools.map((tool) => tool.method),
  [...YOURTURN_STUDIO_OPS_TOOL_METHODS]
);

const tool = (method) => {
  const found = tools.find((candidate) => candidate.method === method);
  assert.ok(found, `missing Studio Ops tool ${method}`);
  return found;
};

const client = Client.forTestnet();
const context = {};
const originalConsoleError = console.error;
console.error = () => {};

async function expectToolError(method, params, pattern) {
  const result = await tool(method).execute(client, context, params);
  assert.match(result?.raw?.error ?? "", pattern);
}

async function executeReadiness(readinessParams) {
  return tool(YOURTURN_STUDIO_RECEIVE_READINESS_TOOL).execute(client, context, readinessParams);
}

try {
  const inventory = await tool(YOURTURN_STUDIO_INVENTORY_TOOL).execute(client, context, {
    providerAccountId,
    bookingTokenId,
    limit: 25,
  });
  assert.equal(inventory.raw.nfts.length, 2);
  assert.deepEqual(inventory.raw.nfts.map((nft) => nft.serial), [11, 12]);
  assert.equal(inventory.raw.readOnly, true);
  assert.equal(inventory.raw.signed, false);
  assert.equal(inventory.raw.submitted, false);
  assert.equal(inventory.raw.mutationAuthorized, false);

  let holder = await tool(YOURTURN_STUDIO_BOOKING_HOLDER_TOOL).execute(client, context, {
    bookingTokenId,
    serial: 11,
    expectedHolderAccountId: receiverAccountId,
  });
  assert.equal(holder.raw.holderAccountId, receiverAccountId);
  await expectToolError(
    YOURTURN_STUDIO_BOOKING_HOLDER_TOOL,
    { bookingTokenId, serial: 11, expectedHolderAccountId: otherAccountId },
    /studio_booking_holder_mismatch/
  );
  holderBody = { ...holderBody, token_id: settlementTokenId };
  await expectToolError(
    YOURTURN_STUDIO_BOOKING_HOLDER_TOOL,
    { bookingTokenId, serial: 11 },
    /studio_booking_holder_token_mismatch/
  );
  holderBody = { ...holderBody, token_id: bookingTokenId, serial_number: 12 };
  await expectToolError(
    YOURTURN_STUDIO_BOOKING_HOLDER_TOOL,
    { bookingTokenId, serial: 11 },
    /studio_booking_holder_serial_mismatch/
  );
  holderBody = {
    token_id: bookingTokenId,
    serial_number: 11,
    account_id: receiverAccountId,
    spender: null,
    delegating_spender: null,
  };

  const readinessParams = {
    receiverAccountId,
    connectedAccountId: receiverAccountId,
    bookingTokenId,
    settlementTokenId,
  };
  let readiness = await executeReadiness(readinessParams);
  assert.equal(readiness.raw.readyForPaidDelivery, true);
  assert.equal(readiness.raw.trustedConnectedAccountId, receiverAccountId);
  assert.equal(readiness.raw.requiresControlledBookingUnfreeze, true);
  assert.equal(readiness.raw.paidFlowMayUsePendingAirdrop, false);
  assert.deepEqual(readiness.raw.blockers, []);

  trustedConnectedAccountId = otherAccountId;
  await expectToolError(
    YOURTURN_STUDIO_RECEIVE_READINESS_TOOL,
    readinessParams,
    /studio_receive_account_switch_identity_mismatch/
  );
  trustedConnectedAccountId = receiverAccountId;

  await expectToolError(
    YOURTURN_STUDIO_RECEIVE_READINESS_TOOL,
    { ...readinessParams, connectedAccountId: otherAccountId },
    /studio_receive_client_identity_disagrees_with_trusted/
  );

  trustedConnectedAccountId = null;
  await expectToolError(
    YOURTURN_STUDIO_RECEIVE_READINESS_TOOL,
    readinessParams,
    /studio_receive_trusted_identity_missing_or_invalid/
  );
  trustedConnectedAccountId = receiverAccountId;

  await expectToolError(
    YOURTURN_STUDIO_RECEIVE_READINESS_TOOL,
    { ...readinessParams, extraClientPolicy: true },
    /unrecognized|unknown/i
  );

  accountBody = { ...accountBody, receiver_sig_required: true };
  readiness = await executeReadiness(readinessParams);
  assert.equal(readiness.raw.readyForPaidDelivery, false);
  assert.ok(readiness.raw.blockers.includes("receiver_signature_required"));

  accountBody = { account: receiverAccountId };
  readiness = await executeReadiness(readinessParams);
  assert.equal(readiness.raw.readyForPaidDelivery, false);
  assert.ok(readiness.raw.blockers.includes("receiver_signature_state_missing_or_invalid"));
  accountBody = { account: receiverAccountId, receiver_sig_required: false };

  bookingRelationshipBody = { tokens: [] };
  readiness = await executeReadiness(readinessParams);
  assert.equal(readiness.raw.readyForPaidDelivery, false);
  assert.ok(readiness.raw.blockers.includes("booking_token_not_associated"));

  bookingRelationshipBody = {};
  readiness = await executeReadiness(readinessParams);
  assert.equal(readiness.raw.readyForPaidDelivery, false);
  assert.ok(readiness.raw.blockers.some((value) => value.startsWith("studio_ops_token_relationship_list_missing")));

  bookingRelationshipBody = {
    tokens: [{ token_id: bookingTokenId, freeze_status: "UNFROZEN", kyc_status: "GRANTED" }],
  };
  readiness = await executeReadiness(readinessParams);
  assert.ok(readiness.raw.blockers.includes("booking_not_frozen_at_rest"));

  bookingRelationshipBody = {
    tokens: [{ token_id: bookingTokenId, kyc_status: "GRANTED" }],
  };
  readiness = await executeReadiness(readinessParams);
  assert.ok(readiness.raw.blockers.includes("booking_freeze_state_missing_or_invalid"));

  bookingRelationshipBody = {
    tokens: [{ token_id: bookingTokenId, freeze_status: "FROZEN", kyc_status: "REVOKED" }],
  };
  readiness = await executeReadiness(readinessParams);
  assert.ok(readiness.raw.blockers.includes("booking_kyc_not_granted"));
  bookingRelationshipBody = {
    tokens: [{ token_id: bookingTokenId, freeze_status: "FROZEN", kyc_status: "GRANTED" }],
  };

  settlementRelationshipBody = {
    tokens: [{ token_id: settlementTokenId, freeze_status: "FROZEN", kyc_status: "NOT_APPLICABLE" }],
  };
  readiness = await executeReadiness(readinessParams);
  assert.ok(readiness.raw.blockers.includes("settlement_token_frozen"));

  settlementRelationshipBody = {
    tokens: [{ token_id: settlementTokenId, freeze_status: "UNKNOWN", kyc_status: "NOT_APPLICABLE" }],
  };
  readiness = await executeReadiness(readinessParams);
  assert.ok(readiness.raw.blockers.includes("settlement_freeze_state_missing_or_invalid"));
  settlementRelationshipBody = {
    tokens: [{ token_id: settlementTokenId, freeze_status: "NOT_APPLICABLE", kyc_status: "NOT_APPLICABLE" }],
  };

  pendingBody = { airdrops: [{ token_id: bookingTokenId, serial_number: 99 }] };
  readiness = await executeReadiness(readinessParams);
  assert.equal(readiness.raw.readyForPaidDelivery, false);
  assert.ok(readiness.raw.blockers.includes("relevant_pending_airdrop_exists"));
  assert.equal(readiness.raw.paidFlowMayUsePendingAirdrop, false);

  pendingBody = {};
  readiness = await executeReadiness(readinessParams);
  assert.equal(readiness.raw.readyForPaidDelivery, false);
  assert.ok(readiness.raw.blockers.includes("pending_airdrop_state_missing"));
  pendingBody = { airdrops: [] };

  fetchFailures.add(`/accounts/${receiverAccountId}/tokens?token.id=${bookingTokenId}`);
  readiness = await executeReadiness(readinessParams);
  assert.equal(readiness.raw.readyForPaidDelivery, false);
  assert.deepEqual(readiness.raw.blockers, ["mirror_read_failed"]);
  fetchFailures.clear();

  accountBody = { receiver_sig_required: false };
  readiness = await executeReadiness(readinessParams);
  assert.equal(readiness.raw.readyForPaidDelivery, false);
  assert.ok(readiness.raw.blockers.includes("account_missing_or_ambiguous"));
  accountBody = { account: receiverAccountId, receiver_sig_required: false };

  const policyResult = await tool(YOURTURN_STUDIO_POLICY_TOOL).execute(client, context, {
    providerId: "studio-a",
    version: "policy-v7",
  });
  assert.equal(policyResult.raw.policy.royaltyBps, 750);
  policy = { ...policy, providerId: "studio-b" };
  await expectToolError(
    YOURTURN_STUDIO_POLICY_TOOL,
    { providerId: "studio-a", version: "policy-v7" },
    /studio_policy_provider_mismatch/
  );
  policy = {
    providerId: "studio-a",
    version: "policy-v7",
    active: true,
    bookingTokenId,
    settlementTokenId,
    transferMode: "default_frozen_hip551",
    royaltyBps: 750,
  };

  const receiptParams = {
    transactionId,
    bookingTokenId,
    bookingSerial: 11,
    sellerAccountId: "0.0.2001",
    buyerAccountId: receiverAccountId,
    settlementTokenId,
    settlementSourceAccountId: receiverAccountId,
    settlementRecipientAccountId: "0.0.2001",
    settlementAmountAtomicUnits: "45000000",
  };
  let receipt = await tool(YOURTURN_STUDIO_RESALE_RECEIPT_TOOL).execute(client, context, receiptParams);
  assert.equal(receipt.raw.exactBookingAndSettlementVerified, true);
  assert.equal(receipt.raw.rootNonce, 0);
  assert.equal(receipt.raw.scheduled, false);
  assert.equal(receipt.raw.hip551BatchContainmentVerified, false);
  assert.equal(receipt.raw.evidenceBoundary, "single successful root settlement transaction only");

  receiptBody = {
    transactions: [
      rootReceipt({
        token_transfers: [
          ...rootReceipt().token_transfers,
          { token_id: settlementTokenId, account: "0.0.9999", amount: 1 },
        ],
      }),
    ],
  };
  await expectToolError(YOURTURN_STUDIO_RESALE_RECEIPT_TOOL, receiptParams, /studio_receipt_token_transfer_count:3/);

  const child = rootReceipt({ nonce: 1 });
  const scheduled = rootReceipt({ scheduled: true });
  const root = rootReceipt();

  receiptBody = { transactions: [child] };
  await expectToolError(
    YOURTURN_STUDIO_RESALE_RECEIPT_TOOL,
    receiptParams,
    /studio_receipt_exact_root_transaction_missing_or_ambiguous/
  );

  receiptBody = { transactions: [scheduled] };
  await expectToolError(
    YOURTURN_STUDIO_RESALE_RECEIPT_TOOL,
    receiptParams,
    /studio_receipt_exact_root_transaction_missing_or_ambiguous/
  );

  receiptBody = { transactions: [child, root] };
  receipt = await tool(YOURTURN_STUDIO_RESALE_RECEIPT_TOOL).execute(client, context, receiptParams);
  assert.equal(receipt.raw.exactBookingAndSettlementVerified, true);

  receiptBody = { transactions: [scheduled, root] };
  receipt = await tool(YOURTURN_STUDIO_RESALE_RECEIPT_TOOL).execute(client, context, receiptParams);
  assert.equal(receipt.raw.exactBookingAndSettlementVerified, true);

  receiptBody = { transactions: [root, rootReceipt()] };
  await expectToolError(
    YOURTURN_STUDIO_RESALE_RECEIPT_TOOL,
    receiptParams,
    /studio_receipt_exact_root_transaction_missing_or_ambiguous/
  );

  receiptBody = { transactions: [rootReceipt({ result: "FAIL_INVALID" })] };
  await expectToolError(YOURTURN_STUDIO_RESALE_RECEIPT_TOOL, receiptParams, /studio_receipt_not_success:FAIL_INVALID/);
  receiptBody = { transactions: [rootReceipt()] };

  const healthParams = { maxMirrorLagSeconds: 30 };
  let health = await tool(YOURTURN_STUDIO_NETWORK_HEALTH_TOOL).execute(client, context, healthParams);
  assert.equal(health.raw.safeToStartWritePreparation, true);
  assert.equal(health.raw.mirrorLagSeconds, 10);

  latestMirrorBody = { transactions: [{ consensus_timestamp: "1789139200.000000000" }] };
  health = await tool(YOURTURN_STUDIO_NETWORK_HEALTH_TOOL).execute(client, context, healthParams);
  assert.equal(health.raw.safeToStartWritePreparation, false);
  assert.ok(health.raw.blockers.includes("mirror_stale"));

  latestMirrorBody = { transactions: [] };
  health = await tool(YOURTURN_STUDIO_NETWORK_HEALTH_TOOL).execute(client, context, healthParams);
  assert.equal(health.raw.safeToStartWritePreparation, false);
  assert.ok(health.raw.blockers.includes("mirror_freshness_missing"));

  latestMirrorBody = null;
  health = await tool(YOURTURN_STUDIO_NETWORK_HEALTH_TOOL).execute(client, context, healthParams);
  assert.equal(health.raw.safeToStartWritePreparation, false);
  assert.ok(health.raw.blockers.includes("mirror_freshness_missing"));

  latestMirrorBody = {};
  health = await tool(YOURTURN_STUDIO_NETWORK_HEALTH_TOOL).execute(client, context, healthParams);
  assert.equal(health.raw.safeToStartWritePreparation, false);
  assert.ok(health.raw.blockers.includes("mirror_freshness_missing"));

  latestMirrorBody = { transactions: [{ consensus_timestamp: "1789139310.000000000" }] };
  statusBody = { status: { indicator: "major", description: "Major Outage" } };
  health = await tool(YOURTURN_STUDIO_NETWORK_HEALTH_TOOL).execute(client, context, healthParams);
  assert.equal(health.raw.safeToStartWritePreparation, false);
  assert.ok(health.raw.blockers.includes("hedera_status_major"));

  statusBody = null;
  health = await tool(YOURTURN_STUDIO_NETWORK_HEALTH_TOOL).execute(client, context, healthParams);
  assert.equal(health.raw.safeToStartWritePreparation, false);
  assert.ok(health.raw.blockers.includes("hedera_status_missing_or_invalid"));

  statusBody = {};
  health = await tool(YOURTURN_STUDIO_NETWORK_HEALTH_TOOL).execute(client, context, healthParams);
  assert.equal(health.raw.safeToStartWritePreparation, false);
  assert.ok(health.raw.blockers.includes("hedera_status_missing_or_invalid"));

  statusBody = { status: { indicator: "none", description: "All Systems Operational" } };
  fetchFailures.add("status.fixture");
  health = await tool(YOURTURN_STUDIO_NETWORK_HEALTH_TOOL).execute(client, context, healthParams);
  assert.equal(health.raw.safeToStartWritePreparation, false);
  assert.ok(health.raw.blockers.includes("hedera_status_unavailable"));
  fetchFailures.clear();

  console.log(
    JSON.stringify(
      {
        ok: true,
        evidenceLevel: "CI/LOCAL",
        phase: "Studio-Tomorrow Phase B security repair",
        base: "facd02f14ebd80e591bfe66fca47f165494229f4",
        tools: [...YOURTURN_STUDIO_OPS_TOOL_METHODS],
        assertions: {
          strictSchemas: true,
          noSigningOrMutationSurface: true,
          noOfficialMcpDependency: true,
          inventoryProviderScoped: true,
          exactHolderTokenAndSerialCheck: true,
          trustedSessionIdentityInjected: true,
          selfAssertedConnectedIdentityCannotAuthorize: true,
          missingTrustedIdentityFailsClosed: true,
          receiverSigRequiredBlocks: true,
          missingReceiverSigStateBlocks: true,
          missingAssociationBlocks: true,
          missingRelationshipShapeBlocks: true,
          defaultFrozenAtRestRequired: true,
          unknownFreezeStateBlocks: true,
          kycFailureBlocks: true,
          pendingAirdropCannotSubstitutePaidDelivery: true,
          missingPendingAirdropShapeBlocks: true,
          mirrorReadFailureBlocks: true,
          authoritativePolicyInjectedServerSide: true,
          exactRootReceiptNonceAndScheduledBound: true,
          childOrScheduledReceiptCannotSubstituteRoot: true,
          duplicateOrFailedRootRejected: true,
          bobFundedSettlementReceiptChecked: true,
          receiptDoesNotOverclaimHip551Containment: true,
          staleMissingNullOrMalformedMirrorFreshnessBlocks: true,
          degradedUnavailableNullOrMalformedStatusBlocks: true,
        },
        signed: false,
        submitted: false,
        networkMutation: false,
      },
      null,
      2
    )
  );
} finally {
  console.error = originalConsoleError;
  client.close();
}
