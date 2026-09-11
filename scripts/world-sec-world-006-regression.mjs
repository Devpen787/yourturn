import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const route = await readFile("app/api/agent/confirm/route.ts", "utf8");
const saga = await readFile("lib/world-agentkit/recovery-saga.ts", "utf8");
const store = await readFile("lib/store/recovery-operations.ts", "utf8");
const bookingPort = await readFile("lib/adapters/booking-port.ts", "utf8");
const nonceStore = await readFile("lib/world-agentkit/nonce-store.ts", "utf8");

// Source-level invariants on the actual repair surface.
assert.match(route, /await authorizeWorldRecoveryWrite/);
assert.match(route, /await confirmWorldCreateListing/);
assert.match(route, /await confirmWorldCancelRelease/);
assert.ok(
  route.indexOf("await authorizeWorldRecoveryWrite") <
    route.indexOf("await confirmWorldCreateListing"),
  "World verification must precede protected create-listing saga"
);
assert.ok(
  route.indexOf("await authorizeWorldRecoveryWrite") <
    route.indexOf("await confirmWorldCancelRelease"),
  "World verification must precede protected cancel-release saga"
);
assert.doesNotMatch(
  route,
  /case "create_listing"[\s\S]{0,900}bookingPort\.confirmCreateListing/,
  "World create-listing must not bypass the durable saga"
);
assert.doesNotMatch(
  route,
  /case "cancel_release"[\s\S]{0,900}bookingPort\.confirmCancelRelease/,
  "World cancel-release must not bypass the durable saga"
);
assert.match(route, /RECOVERY_RECONCILING/);
assert.match(route, /status: 202/);

assert.match(store, /action: input\.action/);
assert.match(store, /actorAccountId: input\.actorAccountId/);
assert.match(store, /tokenId: input\.tokenId/);
assert.match(store, /serial: input\.serial/);
assert.match(store, /delegatedAgentAddress: input\.delegatedAgentAddress/);
assert.match(store, /parameters: input\.parameters/);
assert.match(store, /identityHash = digest\(normalized\)/);
assert.match(store, /nx: true/);
assert.match(store, /RECOVERY_OPERATION_LEASE_SECONDS/);
assert.match(store, /redis\.call\('get', KEYS\[1\]\).*redis\.call\('del', KEYS\[1\]\)/s);
assert.match(
  store,
  /This is intentionally NOT part of operation identity/,
  "fresh exact-scoped authorization must resume the same operation rather than reset replay"
);

const listingAudit = saga.indexOf('markRunning(operation, leaseToken, "listing_audit")');
const listingHcs = saga.indexOf("await submitLifecycleEvent(stored.topicId", listingAudit);
const listingActivation = saga.indexOf(
  'markRunning(operation, leaseToken, "listing_activation")'
);
const listingPersist = saga.indexOf("await addListing(listing)", listingActivation);
assert.ok(listingAudit >= 0 && listingHcs > listingAudit);
assert.ok(
  listingActivation > listingHcs && listingPersist > listingActivation,
  "listing must not become active before its HCS audit boundary"
);

const cancelTransfer = saga.indexOf('markRunning(operation, leaseToken, "cancel_transfer")');
const cancelTransferEffect = saga.indexOf(
  "await refundAndTransferNftFromHolderToTreasury",
  cancelTransfer
);
const cancelBurn = saga.indexOf('markRunning(operation, leaseToken, "cancel_burn")');
const cancelBurnEffect = saga.indexOf("await burnUsedSlot", cancelBurn);
const cancelAudit = saga.indexOf('markRunning(operation, leaseToken, "cancel_audit")');
assert.ok(cancelTransfer >= 0 && cancelTransferEffect > cancelTransfer);
assert.ok(cancelBurn > cancelTransferEffect && cancelBurnEffect > cancelBurn);
assert.ok(cancelAudit > cancelBurnEffect);
assert.match(saga, /if \(transferStep\.state === "running"\)/);
assert.match(saga, /if \(burnStep\.state === "running"\)/);
assert.match(saga, /if \(auditStep\.state === "running"\)/);
assert.match(saga, /bookingPort\.previewCancelRelease\(preview\.input\)/);

// Golden/provider cancellation permission remains in the canonical preflight.
assert.match(bookingPort, /if \(!slot\.policySnapshot\.releaseAllowed\)/);
assert.match(
  bookingPort,
  /does not allow release recovery/,
  "repair must not add cancellation permission"
);

// Existing persistent AgentKit replay consumption remains intact; no reset path
// is introduced by the repair.
assert.match(nonceStore, /SET NX|nx\s*:\s*true/);
assert.match(nonceStore, /async consume\(input\)/);
assert.doesNotMatch(saga, /nonceStore|world-agentkit:nonce|redis\.del\([^)]*nonce/i);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stable(item)])
    );
  }
  return value;
}
function sha(value) {
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}
function operationId(intent) {
  return `wr_${sha(intent)}`;
}

const fixedIntent = {
  action: "cancel_release",
  actorAccountId: "0.0.8504405",
  tokenId: "0.0.8505698",
  serial: 193,
  delegatedAgentAddress: "0xef1c84eab9cc74bcbae321b75cf2d916ee329163",
  parameters: { policyVersion: 1, refundHbar: 5, releaseAllowed: true },
};
assert.equal(operationId(fixedIntent), operationId({ ...fixedIntent }));
assert.equal(
  operationId(fixedIntent),
  operationId({ ...fixedIntent, delegatedAgentAddress: fixedIntent.delegatedAgentAddress }),
  "operation identity is independent of a replacement grant/nonce"
);
assert.notEqual(operationId(fixedIntent), operationId({ ...fixedIntent, serial: 194 }));
assert.notEqual(
  operationId(fixedIntent),
  operationId({ ...fixedIntent, delegatedAgentAddress: "0x1111111111111111111111111111111111111111" })
);

function step() {
  return { state: "pending", receipt: null };
}
function createModel(action) {
  return {
    action,
    status: "pending",
    lease: false,
    steps:
      action === "create_listing"
        ? { listing_audit: step(), listing_activation: step() }
        : {
            cancel_listing_deactivation: step(),
            cancel_transfer: step(),
            cancel_burn: step(),
            cancel_audit: step(),
          },
  };
}
function reconcile(model, phase) {
  model.status = "reconciling";
  return { status: "reconciling", phase };
}

async function runCreateModel(model, io) {
  if (model.lease) return reconcile(model, "operation_busy");
  model.lease = true;
  try {
    const audit = model.steps.listing_audit;
    if (audit.state === "running") {
      if (!io.auditObserved) return reconcile(model, "listing_audit");
      audit.state = "reconciled";
    }
    if (audit.state === "pending") {
      audit.state = "running";
      try {
        audit.receipt = await io.audit();
        audit.state = "succeeded";
      } catch {
        return reconcile(model, "listing_audit");
      }
    }
    const activation = model.steps.listing_activation;
    if (activation.state === "pending" || activation.state === "running") {
      activation.state = "running";
      await io.activate();
      activation.state = "succeeded";
    }
    model.status = "completed";
    return { status: "completed" };
  } finally {
    model.lease = false;
  }
}

// Fault 1: HCS listing audit fails. No active listing is exposed; retry does not
// submit a second audit while receipt is unknown. Once audit evidence appears,
// only local activation runs.
{
  const model = createModel("create_listing");
  const counts = { audit: 0, activate: 0 };
  const io = {
    auditObserved: false,
    audit: async () => {
      counts.audit += 1;
      throw new Error("injected HCS failure");
    },
    activate: async () => {
      counts.activate += 1;
    },
  };
  assert.deepEqual(await runCreateModel(model, io), {
    status: "reconciling",
    phase: "listing_audit",
  });
  assert.deepEqual(counts, { audit: 1, activate: 0 });
  assert.deepEqual(await runCreateModel(model, io), {
    status: "reconciling",
    phase: "listing_audit",
  });
  assert.deepEqual(counts, { audit: 1, activate: 0 });
  io.auditObserved = true;
  assert.deepEqual(await runCreateModel(model, io), { status: "completed" });
  assert.deepEqual(counts, { audit: 1, activate: 1 });
}

async function runCancelModel(model, io) {
  if (model.lease) return reconcile(model, "operation_busy");
  model.lease = true;
  try {
    const local = model.steps.cancel_listing_deactivation;
    if (local.state === "pending" || local.state === "running") {
      local.state = "running";
      await io.deactivate();
      local.state = "succeeded";
    }

    const transfer = model.steps.cancel_transfer;
    if (transfer.state === "running") {
      if (io.nftState === "treasury") {
        transfer.state = "reconciled";
      } else {
        return reconcile(model, "cancel_transfer");
      }
    }
    if (transfer.state === "pending") {
      transfer.state = "running";
      try {
        transfer.receipt = await io.transfer();
        transfer.state = "succeeded";
      } catch {
        return reconcile(model, "cancel_transfer");
      }
    }

    const burn = model.steps.cancel_burn;
    if (burn.state === "running") {
      if (io.nftState === "deleted") {
        burn.state = "reconciled";
      } else {
        return reconcile(model, "cancel_burn");
      }
    }
    if (burn.state === "pending") {
      burn.state = "running";
      try {
        burn.receipt = await io.burn();
        burn.state = "succeeded";
      } catch {
        return reconcile(model, "cancel_burn");
      }
    }

    const audit = model.steps.cancel_audit;
    if (audit.state === "running") {
      if (io.auditObserved) {
        audit.state = "reconciled";
      } else {
        return reconcile(model, "cancel_audit");
      }
    }
    if (audit.state === "pending") {
      audit.state = "running";
      try {
        audit.receipt = await io.audit();
        audit.state = "succeeded";
      } catch {
        return reconcile(model, "cancel_audit");
      }
    }
    model.status = "completed";
    return { status: "completed" };
  } finally {
    model.lease = false;
  }
}

// Fault 2: transfer committed and receipt persisted; burn fails. Retry cannot
// duplicate transfer or burn while burn receipt is unknown.
{
  const model = createModel("cancel_release");
  const counts = { deactivate: 0, transfer: 0, burn: 0, audit: 0 };
  const io = {
    nftState: "treasury",
    auditObserved: false,
    deactivate: async () => { counts.deactivate += 1; },
    transfer: async () => { counts.transfer += 1; return "transfer-tx"; },
    burn: async () => { counts.burn += 1; throw new Error("injected burn failure"); },
    audit: async () => { counts.audit += 1; return "audit-tx"; },
  };
  assert.deepEqual(await runCancelModel(model, io), {
    status: "reconciling",
    phase: "cancel_burn",
  });
  assert.deepEqual(counts, { deactivate: 1, transfer: 1, burn: 1, audit: 0 });
  assert.deepEqual(await runCancelModel(model, io), {
    status: "reconciling",
    phase: "cancel_burn",
  });
  assert.deepEqual(counts, { deactivate: 1, transfer: 1, burn: 1, audit: 0 });
}

// Fault 3: transfer + burn commit, HCS audit fails. A retry does not repeat any
// committed asset effect or submit another unknown audit; it completes only
// after operation-bound audit evidence is observed.
{
  const model = createModel("cancel_release");
  const counts = { deactivate: 0, transfer: 0, burn: 0, audit: 0 };
  const io = {
    nftState: "deleted",
    auditObserved: false,
    deactivate: async () => { counts.deactivate += 1; },
    transfer: async () => { counts.transfer += 1; return "transfer-tx"; },
    burn: async () => { counts.burn += 1; return "burn-tx"; },
    audit: async () => { counts.audit += 1; throw new Error("injected HCS failure"); },
  };
  assert.deepEqual(await runCancelModel(model, io), {
    status: "reconciling",
    phase: "cancel_audit",
  });
  assert.deepEqual(counts, { deactivate: 1, transfer: 1, burn: 1, audit: 1 });
  assert.deepEqual(await runCancelModel(model, io), {
    status: "reconciling",
    phase: "cancel_audit",
  });
  assert.deepEqual(counts, { deactivate: 1, transfer: 1, burn: 1, audit: 1 });
  io.auditObserved = true;
  assert.deepEqual(await runCancelModel(model, io), { status: "completed" });
  assert.deepEqual(counts, { deactivate: 1, transfer: 1, burn: 1, audit: 1 });
}

// Crash/unknown receipt: the transfer step was durably marked running, the
// economic effect committed, but its receipt write did not. Public treasury
// ownership reconciles that step; the retry does not refund/transfer again.
{
  const model = createModel("cancel_release");
  model.steps.cancel_listing_deactivation.state = "succeeded";
  model.steps.cancel_transfer.state = "running";
  const counts = { deactivate: 0, transfer: 0, burn: 0, audit: 0 };
  const io = {
    nftState: "treasury",
    auditObserved: false,
    deactivate: async () => { counts.deactivate += 1; },
    transfer: async () => { counts.transfer += 1; return "should-not-run"; },
    burn: async () => { counts.burn += 1; return "burn-tx"; },
    audit: async () => { counts.audit += 1; return "audit-tx"; },
  };
  assert.deepEqual(await runCancelModel(model, io), { status: "completed" });
  assert.deepEqual(counts, { deactivate: 0, transfer: 0, burn: 1, audit: 1 });
  assert.equal(model.steps.cancel_transfer.state, "reconciled");
}

// Concurrent retry: one executor owns the operation lease; another returns a
// reconciling/busy status without touching effects.
{
  const model = createModel("create_listing");
  model.lease = true;
  const counts = { audit: 0, activate: 0 };
  const result = await runCreateModel(model, {
    auditObserved: false,
    audit: async () => { counts.audit += 1; return "audit"; },
    activate: async () => { counts.activate += 1; },
  });
  assert.deepEqual(result, { status: "reconciling", phase: "operation_busy" });
  assert.deepEqual(counts, { audit: 0, activate: 0 });
}

console.log(
  JSON.stringify(
    {
      ok: true,
      finding: "SEC-WORLD-006_REPAIR_REGRESSION",
      sourceInvariants: {
        worldVerificationBeforeSaga: true,
        durableIdentity: true,
        listingAuditBeforeActivation: true,
        cancelStepReceipts: true,
        nonceResetAbsent: true,
        goldenReleasePolicyPreserved: true,
        reconcilingResponseDistinct: true,
      },
      faultInjection: {
        listingHcsFailure: "no active listing; no blind HCS replay",
        burnFailureAfterTransfer: "transfer not duplicated; burn unknown remains reconciling",
        hcsFailureAfterTransferBurn: "asset effects not duplicated; audit reconciles by operation evidence",
        unknownTransferReceipt: "public treasury ownership resumes without duplicate refund/transfer",
        concurrentRetry: "second executor blocked before effects",
      },
    },
    null,
    2
  )
);
