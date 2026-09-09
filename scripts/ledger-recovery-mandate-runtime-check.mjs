import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Wallet } from "ethers";
import { buildRecoveryMandateTypedData } from "../lib/ledger/recovery-mandate.ts";
import { createRedisRecoveryMandateReplayStore } from "../lib/ledger/recovery-mandate-replay.ts";
import {
  activatePreparedRecoveryMandate,
  loadActiveRecoveryMandate,
  storePreparedRecoveryMandate,
} from "../lib/ledger/recovery-mandate-state.ts";

const NOW = BigInt(1_800_000_000);
const TEST_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412b95e0d3dc89116";
const wallet = new Wallet(TEST_PRIVATE_KEY);

function makeMandate(overrides = {}) {
  return {
    mandateId: "mandate-runtime-193",
    ownerId: "owner-alice",
    ledgerSignerAddress: wallet.address,
    agentId: "yourturn-concierge",
    bookingTokenId: "0.0.700001",
    bookingSerial: BigInt(193),
    allowedAction: "resale",
    minimumRecoveryAtomicUnits: BigInt(40_000_000),
    settlementAsset: "0.0.429274",
    expiresAt: NOW + BigInt(3_600),
    nonce: "runtime-nonce-193",
    cancellationAllowed: false,
    issuedAt: NOW - BigInt(30),
    ...overrides,
  };
}

function createRedisFixture() {
  const records = new Map();
  return {
    records,
    async get(key) {
      return records.get(key)?.value ?? null;
    },
    async set(key, value, options = {}) {
      if (options.nx && records.has(key)) return null;
      records.set(key, { value, options });
      return "OK";
    },
  };
}

async function sign(mandate) {
  const { domain, types, value } = buildRecoveryMandateTypedData(mandate);
  return wallet.signTypedData(domain, types, value);
}

const redis = createRedisFixture();
const replayStore = createRedisRecoveryMandateReplayStore(redis);
const mandate = makeMandate();
await storePreparedRecoveryMandate({
  store: redis,
  mandate,
  ownerId: mandate.ownerId,
  nowUnixSeconds: NOW,
});
const signature = await sign(mandate);

await assert.rejects(
  activatePreparedRecoveryMandate({
    store: redis,
    replayStore,
    mandateId: mandate.mandateId,
    ownerId: "owner-bob",
    signature,
    nowUnixSeconds: NOW,
  }),
  /does not belong/
);

const results = await Promise.allSettled([
  activatePreparedRecoveryMandate({
    store: redis,
    replayStore,
    mandateId: mandate.mandateId,
    ownerId: mandate.ownerId,
    signature,
    nowUnixSeconds: NOW,
  }),
  activatePreparedRecoveryMandate({
    store: redis,
    replayStore,
    mandateId: mandate.mandateId,
    ownerId: mandate.ownerId,
    signature,
    nowUnixSeconds: NOW,
  }),
]);
assert.equal(
  results.filter((result) => result.status === "fulfilled").length,
  1,
  "exactly one concurrent activation may succeed"
);
assert.equal(
  results.filter((result) => result.status === "rejected").length,
  1,
  "duplicate concurrent activation must fail"
);

const active = await loadActiveRecoveryMandate({
  store: redis,
  mandateId: mandate.mandateId,
  ownerId: mandate.ownerId,
});
assert.equal(active.record.state, "active");
assert.equal(active.mandate.agentId, "yourturn-concierge");
assert.equal(active.mandate.bookingSerial, BigInt(193));
assert.equal(active.mandate.minimumRecoveryAtomicUnits, BigInt(40_000_000));
assert.equal(active.mandate.settlementAsset, "0.0.429274");
assert.equal(active.mandate.cancellationAllowed, false);

const badSignatureMandate = makeMandate({
  mandateId: "mandate-runtime-bad-signature",
  nonce: "runtime-nonce-bad-signature",
});
await storePreparedRecoveryMandate({
  store: redis,
  mandate: badSignatureMandate,
  ownerId: badSignatureMandate.ownerId,
  nowUnixSeconds: NOW,
});
const wrongWallet = Wallet.createRandom();
const badTyped = buildRecoveryMandateTypedData(badSignatureMandate);
const wrongSignature = await wrongWallet.signTypedData(
  badTyped.domain,
  badTyped.types,
  badTyped.value
);
await assert.rejects(
  activatePreparedRecoveryMandate({
    store: redis,
    replayStore,
    mandateId: badSignatureMandate.mandateId,
    ownerId: badSignatureMandate.ownerId,
    signature: wrongSignature,
    nowUnixSeconds: NOW,
  }),
  /signature signer mismatch/
);

const correctAfterBadSignature = await sign(badSignatureMandate);
await activatePreparedRecoveryMandate({
  store: redis,
  replayStore,
  mandateId: badSignatureMandate.mandateId,
  ownerId: badSignatureMandate.ownerId,
  signature: correctAfterBadSignature,
  nowUnixSeconds: NOW,
});

const prepareRoute = readFileSync(
  new URL(
    "../app/api/ledger/recovery-mandate/prepare/route.ts",
    import.meta.url
  ),
  "utf8"
);
const activateRoute = readFileSync(
  new URL(
    "../app/api/ledger/recovery-mandate/activate/route.ts",
    import.meta.url
  ),
  "utf8"
);
for (const source of [prepareRoute, activateRoute]) {
  assert.doesNotMatch(source, /mintApprovalGrant|verifyApprovalGrant/);
  assert.doesNotMatch(source, /HEDERA_OPERATOR_KEY|booked-rights-approval-secret/);
}
assert.match(activateRoute, /getRedis\(\)/);
assert.match(activateRoute, /createRedisRecoveryMandateReplayStore\(redis\)/);
assert.match(activateRoute, /activatePreparedRecoveryMandate/);
assert.match(prepareRoute, /YOURTURN_AGENT_NAME/);
assert.match(prepareRoute, /slot\.policySnapshot\.resaleAllowed/);
assert.match(prepareRoute, /slot\.holderAccountId/);

console.log(
  JSON.stringify(
    {
      ok: true,
      evidenceLevel: "CI_CONFIGURED",
      checks: [
        "prepared mandate is bound to authenticated owner state",
        "wrong session owner cannot activate another owner's mandate",
        "bad signature does not consume the valid mandate",
        "concurrent duplicate activation has exactly one winner",
        "active state preserves agent/serial/minimum/asset/cancellation scope",
        "Ledger-specific routes never mint or verify legacy reusable approval grants",
        "activation route instantiates the real Redis adapter at the authority boundary",
        "prepare route reuses holder and booked-provider resale policy checks",
      ],
      deviceProof: false,
      downstreamRecoveryExecution: false,
      claimBoundary:
        "CI proves a separate durable one-shot mandate activation path and DMK-ready payload preparation. It does not prove Ledger hardware provenance or that active mandate state is yet consumed by Hedera recovery execution.",
    },
    null,
    2
  )
);
