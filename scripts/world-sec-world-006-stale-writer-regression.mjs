import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const saga = await readFile("lib/world-agentkit/recovery-saga.ts", "utf8");
const store = await readFile("lib/store/recovery-operations.ts", "utf8");

// The lease token must be execution-local to the exact operation object, not a
// process-global operationId -> token slot that an old worker could accidentally
// borrow after a successor acquires the same operation.
assert.match(store, /new WeakMap<RecoveryOperationRecord, string>\(\)/);
assert.match(store, /recoveryOperationLeaseTokens\.set\(operation, token\)/);
assert.match(store, /recoveryOperationLeaseTokens\.get\(record\)/);
assert.match(saga, /acquireRecoveryOperationLease\(operation\)/);
assert.doesNotMatch(saga, /acquireRecoveryOperationLease\(operation\.operationId\)/);

// Every durable write goes through one Redis Lua CAS that checks both the
// current lease token and the exact record revision before replacing the record.
assert.match(store, /revision: number/);
assert.match(store, /revision: 0/);
assert.match(store, /activeLease ~= ARGV\[1\]/);
assert.match(store, /currentRevision ~= tonumber\(ARGV\[2\]\)/);
assert.match(store, /revision: nextRevision/);
assert.match(store, /RecoveryOperationFenceError\("lease_lost"\)/);
assert.match(store, /RecoveryOperationFenceError\("revision_mismatch"\)/);
assert.doesNotMatch(
  store,
  /await getRedis\(\)\.set\(operationKey\(record\.operationId\), JSON\.stringify\(record\)\)/,
  "unconditional whole-record overwrite must not return"
);

function clone(value) {
  return structuredClone(value);
}

class FencedStoreModel {
  constructor(record) {
    this.record = clone(record);
    this.lease = null;
  }

  acquire(token) {
    assert.equal(this.lease, null);
    this.lease = token;
  }

  expire(token) {
    assert.equal(this.lease, token);
    this.lease = null;
  }

  load() {
    return clone(this.record);
  }

  save(snapshot, token) {
    if (this.lease !== token) {
      const error = new Error("lease_lost");
      error.code = "lease_lost";
      throw error;
    }
    if (snapshot.revision !== this.record.revision) {
      const error = new Error("revision_mismatch");
      error.code = "revision_mismatch";
      throw error;
    }
    const next = clone(snapshot);
    next.revision += 1;
    this.record = next;
    snapshot.revision = next.revision;
  }
}

function initialCancelOperation() {
  return {
    revision: 0,
    status: "running",
    steps: {
      cancel_listing_deactivation: { state: "succeeded" },
      cancel_transfer: { state: "succeeded", receipt: "transfer-tx" },
      cancel_burn: { state: "pending" },
      cancel_audit: { state: "pending" },
    },
  };
}

// Exact independent stale-writer sequence:
// A durably marks an external burn step running, then its lease expires while the
// external effect is in flight. B acquires, observes/reconciles that effect,
// records audit/completion, then A returns with the old snapshot. A must be
// unable to overwrite B's later receipts/status.
{
  const durable = new FencedStoreModel(initialCancelOperation());

  durable.acquire("lease-A");
  const workerA = durable.load();
  workerA.steps.cancel_burn = { state: "running" };
  durable.save(workerA, "lease-A");
  assert.equal(workerA.revision, 1);

  // External burn commits, but A stalls before it can persist the receipt.
  durable.expire("lease-A");
  durable.acquire("lease-B");

  const workerB = durable.load();
  workerB.steps.cancel_burn = {
    state: "reconciled",
    evidence: { kind: "mirror_state", value: "nft_deleted:193" },
  };
  durable.save(workerB, "lease-B");

  workerB.steps.cancel_audit = { state: "running" };
  durable.save(workerB, "lease-B");
  workerB.steps.cancel_audit = {
    state: "succeeded",
    receipt: "audit-tx",
    evidence: { kind: "transaction_receipt", value: "audit-tx" },
  };
  durable.save(workerB, "lease-B");
  workerB.status = "completed";
  durable.save(workerB, "lease-B");

  // A returns after its burn call. Its original lease is no longer current.
  workerA.steps.cancel_burn = {
    state: "succeeded",
    receipt: "late-burn-tx",
  };
  assert.throws(
    () => durable.save(workerA, "lease-A"),
    (error) => error?.code === "lease_lost"
  );

  // Even possession of the successor token would not make the stale snapshot
  // writable: revision CAS independently blocks rollback of newer progress.
  assert.throws(
    () => durable.save(workerA, "lease-B"),
    (error) => error?.code === "revision_mismatch"
  );

  const final = durable.load();
  assert.equal(final.status, "completed");
  assert.equal(final.steps.cancel_burn.state, "reconciled");
  assert.equal(final.steps.cancel_audit.state, "succeeded");
  assert.equal(final.steps.cancel_audit.receipt, "audit-tx");
  assert.equal(final.revision, 5);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      finding: "SEC-WORLD-006_STALE_WRITER_FENCE_REGRESSION",
      proof: {
        leaseTokenBoundToOperationObject: true,
        redisWriteChecksLeaseAndRevisionAtomically: true,
        expiredWorkerRejected: "lease_lost",
        staleSnapshotRejected: "revision_mismatch",
        successorReceiptsPreserved: true,
      },
    },
    null,
    2
  )
);
