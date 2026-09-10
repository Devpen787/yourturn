import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Wallet } from "ethers";
import { resolveEnrolledLedgerSignerAddress } from "../lib/ledger/ledger-signer-enrollment.ts";
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
const substituteWallet = Wallet.createRandom();

const configuredSigners = {
  LEDGER_GUEST_A_SIGNER_ADDRESS: wallet.address,
  LEDGER_GUEST_B_SIGNER_ADDRESS: substituteWallet.address,
};
assert.equal(
  resolveEnrolledLedgerSignerAddress("guestA", configuredSigners),
  wallet.address,
  "guestA signer must come from server-side enrollment configuration"
);
assert.equal(
  resolveEnrolledLedgerSignerAddress("guestB", configuredSigners),
  substituteWallet.address,
  "guestB signer must have an independent server-side enrollment"
);
assert.throws(
  () => resolveEnrolledLedgerSignerAddress("guestA", {}),
  /not configured/,
  "missing server enrollment must fail closed"
);
assert.throws(
  () =>
    resolveEnrolledLedgerSignerAddress("guestA", {
      LEDGER_GUEST_A_SIGNER_ADDRESS: "not-an-evm-address",
    }),
  /invalid/,
  "malformed server enrollment must fail closed"
);

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
const badTyped = buildRecoveryMandateTypedData(badSignatureMandate);
const wrongSignature = await substituteWallet.signTypedData(
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
assert.match(
  prepareRoute,
  /resolveEnrolledLedgerSignerAddress\(\s*appUser\.hederaPersona\s*\)/,
  "prepare must resolve the expected signer from authenticated server-side enrollment"
);
assert.match(
  prepareRoute,
  /\.strict\(\)/,
  "prepare request schema must reject unknown signer-override fields"
);
assert.doesNotMatch(
  prepareRoute,
  /ledgerSignerAddress:\s*z\./,
  "prepare request must not accept ledgerSignerAddress from the client"
);
assert.match(
  prepareRoute,
  /signerSource:\s*"server_enrollment"/,
  "prepared evidence should expose that signer identity came from server enrollment"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      evidenceLevel: "CI_CONFIGURED",
      checks: [
        "prepared mandate is bound to authenticated owner state",
        "expected Ledger signer is resolved from server-controlled enrollment keyed by signed session persona",
        "client signer override is absent from and rejected by the strict prepare schema",
        "missing or malformed signer enrollment fails closed",
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
        "CI proves client signer substitution is removed and the dedicated one-shot mandate path is bound to independent server enrollment. It does not prove Ledger hardware provenance or that active mandate state is yet consumed by Hedera recovery execution.",
    },
    null,
    2
  )
);
