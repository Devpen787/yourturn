import assert from "node:assert/strict";
import { Transaction, TransferTransaction } from "@hiero-ledger/sdk";
import { preparePolicyAuthorizedDelegatedRecovery } from "../lib/hedera-agent-kit/policy-authorized-delegated-recovery.ts";

const nowMs = Date.parse("2026-09-10T10:20:00Z");
const delegation = {
  delegationId: "security-provider-state-001",
  delegatedAgentAccountId: "0.0.7101",
  spenderAccountId: "0.0.1102",
  tokenId: "0.0.2101",
  serial: 77,
  holderAccountId: "0.0.1101",
  allowedActions: ["RECOVER"],
  minimumRecovery: {
    asset: { kind: "HTS", tokenId: "0.0.456858" },
    atomicUnits: "40000000",
  },
  expiresAtMs: nowMs + 60 * 60 * 1000,
  cancellationAllowed: false,
  providerPolicyId: "provider-policy-security-v1",
  revokedAtMs: null,
};

function createStore() {
  const values = new Map();
  let reservations = 0;
  return {
    get reservations() {
      return reservations;
    },
    async reserve({ key, fingerprint }) {
      reservations += 1;
      if (values.has(key)) {
        return values.get(key) === fingerprint ? "duplicate" : "conflict";
      }
      values.set(key, fingerprint);
      return "claimed";
    },
  };
}

function invocation(providerPolicy, nonce) {
  return {
    agentAccountId: delegation.delegatedAgentAccountId,
    currentHolderAccountId: delegation.holderAccountId,
    action: "RECOVER",
    nonce,
    providerPolicy,
    recovery: {
      asset: delegation.minimumRecovery.asset,
      atomicUnits: "45000000",
    },
    receiverAccountId: "0.0.1103",
  };
}

async function prepare(providerPolicy, nonce) {
  const store = createStore();
  const result = await preparePolicyAuthorizedDelegatedRecovery({
    delegation,
    invocation: invocation(providerPolicy, nonce),
    nonceStore: store,
    now: () => nowMs,
  });
  return { result, store };
}

// Control: the owner repair really does make the H2 hook load-bearing for a
// recognized provider denial. This must stop before replay reservation/bytes.
const blocked = await prepare(
  { id: delegation.providerPolicyId, state: "BLOCK" },
  "recognized-block"
);
assert.equal(blocked.result.ok, false);
assert.equal(blocked.result.transactionBytesProduced, false);
assert.equal(blocked.result.decision.reason, "PROVIDER_POLICY_DENIED");
assert.equal(blocked.store.reservations, 0);

// Attack: provider state is a runtime value. TypeScript's union is erased, and
// the policy only branches on BLOCK/REVIEW. Any other value falls through as if
// it were ALLOW. "DENY" is intentionally plausible adapter/API drift rather
// than a magic exploit string.
const unknown = await prepare(
  { id: delegation.providerPolicyId, state: "DENY" },
  "unknown-state"
);
assert.equal(
  unknown.result.ok,
  true,
  "reproducer expected unrecognized provider state to fail open"
);
assert.equal(unknown.result.transactionBytesProduced, true);
assert.equal(unknown.result.decision.outcome, "ALLOW");
assert.equal(unknown.store.reservations, 1);

const unknownTx = Transaction.fromBytes(
  Buffer.from(unknown.result.envelope.bytesBase64, "base64")
);
assert.ok(unknownTx instanceof TransferTransaction);
assert.equal(unknownTx.transactionId?.accountId?.toString(), delegation.spenderAccountId);
const entries = [...unknownTx.nftTransfers];
assert.equal(entries.length, 1);
assert.equal(entries[0][0].toString(), delegation.tokenId);
assert.equal(entries[0][1].length, 1);
assert.equal(Number(entries[0][1][0].serial.toString()), delegation.serial);
assert.equal(entries[0][1][0].sender.toString(), delegation.holderAccountId);
assert.equal(entries[0][1][0].recipient.toString(), "0.0.1103");
assert.equal(entries[0][1][0].isApproved, true);

// A missing state has the same fail-open behavior at runtime.
const missing = await prepare(
  { id: delegation.providerPolicyId },
  "missing-state"
);
assert.equal(
  missing.result.ok,
  true,
  "reproducer expected missing provider state to fail open"
);
assert.equal(missing.result.transactionBytesProduced, true);
assert.equal(missing.result.decision.outcome, "ALLOW");
assert.equal(missing.store.reservations, 1);

console.log(
  JSON.stringify(
    {
      ok: true,
      finding: "SEC-HEDERA-005_REPAIR_INCOMPLETE_PROVIDER_STATE_FAIL_OPEN",
      control: {
        state: "BLOCK",
        result: blocked.result.decision.reason,
        transactionBytesProduced: blocked.result.transactionBytesProduced,
        nonceReservations: blocked.store.reservations,
      },
      attacks: [
        {
          state: "DENY",
          outcome: unknown.result.decision.outcome,
          transactionBytesProduced: unknown.result.transactionBytesProduced,
          transactionType: unknown.result.envelope.transactionType,
          nonceReservations: unknown.store.reservations,
        },
        {
          state: "<missing>",
          outcome: missing.result.decision.outcome,
          transactionBytesProduced: missing.result.transactionBytesProduced,
          transactionType: missing.result.envelope.transactionType,
          nonceReservations: missing.store.reservations,
        },
      ],
    },
    null,
    2
  )
);
