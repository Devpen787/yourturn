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

// Security reproducer only. It proves that the current activation authority
// boundary does not have any live booking/policy/ownership revalidation seam.
const NOW = BigInt(1_800_000_000);
const wallet = new Wallet(
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412b95e0d3dc89116"
);

function createRedisFixture() {
  const records = new Map();
  return {
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

const mandate = {
  mandateId: "security-stale-activation-193",
  ownerId: "owner-alice",
  ledgerSignerAddress: wallet.address,
  agentId: "yourturn-concierge",
  bookingTokenId: "0.0.700001",
  bookingSerial: BigInt(193),
  allowedAction: "resale",
  minimumRecoveryAtomicUnits: BigInt(40_000_000),
  settlementAsset: "0.0.429274",
  expiresAt: NOW + BigInt(3_600),
  nonce: "security-stale-activation-nonce-193",
  cancellationAllowed: false,
  issuedAt: NOW - BigInt(30),
};

const redis = createRedisFixture();
await storePreparedRecoveryMandate({
  store: redis,
  mandate,
  ownerId: mandate.ownerId,
  nowUnixSeconds: NOW,
});

const { domain, types, value } = buildRecoveryMandateTypedData(mandate);
const signature = await wallet.signTypedData(domain, types, value);

// This represents the load-bearing predicates changing after preparation but
// before activation. The current activation function receives none of them.
const liveBookingAfterPrepare = {
  status: "AVAILABLE",
  holderAccountId: "0.0.999999",
  resaleAllowed: false,
  activeListing: true,
};
assert.notEqual(liveBookingAfterPrepare.status, "HELD");
assert.equal(liveBookingAfterPrepare.resaleAllowed, false);
assert.equal(liveBookingAfterPrepare.activeListing, true);

const activated = await activatePreparedRecoveryMandate({
  store: redis,
  replayStore: createRedisRecoveryMandateReplayStore(redis),
  mandateId: mandate.mandateId,
  ownerId: mandate.ownerId,
  signature,
  nowUnixSeconds: NOW,
});
assert.equal(activated.active.state, "active");

const active = await loadActiveRecoveryMandate({
  store: redis,
  mandateId: mandate.mandateId,
  ownerId: mandate.ownerId,
});
assert.equal(active.record.state, "active");

// Verify that the public activation route has no alternate live recheck before
// it promotes the prepared object to active authority state.
const activateRoute = readFileSync(
  new URL(
    "../app/api/ledger/recovery-mandate/activate/route.ts",
    import.meta.url
  ),
  "utf8"
);
for (const requiredLiveBoundary of [
  /bookingPort/,
  /getSlot\(/,
  /policySnapshot/,
  /holderAccountId/,
  /getListing\(/,
  /accountsEqual/,
]) {
  assert.doesNotMatch(activateRoute, requiredLiveBoundary);
}

console.log(
  JSON.stringify(
    {
      reproduced: true,
      finding: "Ledger mandate activation promotes stale prepared authority without revalidating live booking ownership/status/provider policy/listing state",
      exactHead: "1d50b01c619687950bd87130baf30a3ae2b4a927",
      preparedPredicatesCanChangeBeforeActivation: true,
      activationStillSucceeded: true,
      activeAuthorityCreated: true,
      downstreamMutationCurrentlyWired: false,
      impactBoundary:
        "No asset mutation is reached today because active Ledger mandate state is not yet consumed by recovery execution. This must be closed before that state becomes load-bearing.",
    },
    null,
    2
  )
);
