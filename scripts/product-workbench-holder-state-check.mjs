import assert from "node:assert/strict";
import { test } from "node:test";
import {
  INITIAL_HOLDER_FIXTURE as initial, isHolderFixture, readHolderFixture,
  reduceHolderFixture as reduce, resolveHolderStep, holderView,
} from "../app/product-preview/holder-fixture-state.ts";

const waiting = () => reduce(reduce({ ...initial }, { type: "acknowledge", value: true }), { type: "begin-approval" });
const active = () => reduce(waiting(), { type: "approval-result", result: "approved" });
const replacement = () => reduce(reduce(active(), { type: "select-minimum", value: 30 }), { type: "begin-approval" });
const recovered = () => reduce(reduce(active(), { type: "offer", amount: 45 }), { type: "recover" });

test("first entry is a prepared booking, NOT authority or settlement", () => {
  assert.deepEqual(readHolderFixture(null), initial);
  assert.equal(initial.activeMinimum, null);
  assert.equal(initial.settlementCount, 0);
});

test("success and approved URLs cannot create facts", () => {
  for (const view of ["recovery-success", "ledger-approved", "recovery-active", "offer-allowed"]) {
    assert.notEqual(resolveHolderStep(view, initial), "recoverySuccess");
    assert.notEqual(resolveHolderStep(view, initial), "ledgerApproved");
  }
  assert.equal(initial.holder, "maya");
  assert.equal(initial.activeMinimum, null);
});

test("approval needs acknowledged scope", () => {
  assert.throws(() => reduce(initial, { type: "begin-approval" }));
  assert.equal(reduce(initial, { type: "approval-result", result: "approved" }), initial);
});

test("pending attempt survives serialization without being approved", () => {
  const s = readHolderFixture(JSON.stringify(waiting()));
  assert.equal(s.approvalStatus, "waiting");
  assert.equal(s.activeMinimum, null);
  assert.equal(resolveHolderStep("ledger-waiting", s), "ledgerWaiting");
});

test("repeated start resumes the same attempt", () => {
  const s = waiting();
  assert.equal(reduce(s, { type: "begin-approval" }), s);
});

test("draft cannot change during an in-flight attempt", () => {
  const s = replacement();
  assert.equal(reduce(s, { type: "select-minimum", value: 40 }), s);
});

for (const result of ["rejected", "cancelled"]) {
  test(`initial ${result} creates no authority and cannot later approve`, () => {
    const s = reduce(waiting(), { type: "approval-result", result });
    assert.equal(s.activeMinimum, null);
    assert.equal(s.holder, "maya");
    assert.equal(reduce(s, { type: "approval-result", result: "approved" }), s);
  });
  test(`replacement ${result} preserves exact 40 minimum after reload`, () => {
    const s = readHolderFixture(JSON.stringify(reduce(replacement(), { type: "approval-result", result })));
    assert.equal(s.activeMinimum, 40);
    assert.equal(s.approvalMinimum, 30);
    assert.equal(s.settlementCount, 0);
    assert.equal(holderView(result === "rejected" ? "ledgerRejected" : "ledgerCancelled", s), `replacement-ledger-${result}`);
  });
}

test("only actual replacement approval changes active minimum", () => {
  const s = replacement();
  assert.equal(s.activeMinimum, 40);
  assert.equal(reduce(s, { type: "approval-result", result: "approved" }).activeMinimum, 30);
});

test("32 is denied under 40 without transfer or settlement", () => {
  const s = reduce(active(), { type: "offer", amount: 32 });
  assert.throws(() => reduce(s, { type: "recover" }));
  assert.equal(s.holder, "maya");
  assert.equal(s.settlementCount, 0);
});

test("authorized 45 result persists across all holder return URLs", () => {
  const s = readHolderFixture(JSON.stringify(recovered()));
  assert.equal(s.holder, "bob");
  assert.equal(s.recoveredAmount, 45);
  for (const view of [null, "bookings", "booking-detail", "recovery-setup", "ledger-waiting", "recovery-active"]) {
    assert.equal(resolveHolderStep(view, s), "bookings");
  }
  assert.equal(resolveHolderStep("recovery-success", s), "recoverySuccess");
});

test("active recovery remains active regardless of location", () => {
  const s = active();
  for (const view of [null, "bookings", "booking-detail", "change-plans"]) resolveHolderStep(view, s);
  assert.equal(s.activeMinimum, 40);
  assert.equal(s.holder, "maya");
});

test("duplicate recovery does not double-settle", () => {
  const s = recovered();
  assert.equal(reduce(s, { type: "recover" }), s);
  assert.equal(s.settlementCount, 1);
});

test("active 40 remains usable while a 30 replacement is pending", () => {
  const s = reduce(reduce(replacement(), { type: "offer", amount: 45 }), { type: "recover" });
  assert.equal(s.recoveredAmount, 45);
  assert.equal(s.approvalStatus, "cancelled");
  assert.equal(reduce(s, { type: "approval-result", result: "approved" }), s);
});

test("revoke persists and stale active URL cannot revive authority", () => {
  const s = readHolderFixture(JSON.stringify(reduce(active(), { type: "revoke" })));
  assert.equal(s.revoked, true);
  assert.equal(s.activeMinimum, null);
  assert.equal(resolveHolderStep("recovery-active", s), "bookings");
  assert.throws(() => reduce(s, { type: "recover" }));
});

test("32 can complete only after a new 30 mandate is approved", () => {
  const s = reduce(replacement(), { type: "approval-result", result: "approved" });
  assert.equal(reduce(s, { type: "recover" }).recoveredAmount, 32);
});

test("corrupt, unsupported and promoted stored states are rejected", () => {
  for (const value of [{ ...initial, schemaVersion: 2 }, { ...initial, evidenceClass: "LIVE" },
    { ...initial, holder: "bob" }, { ...initial, activeMinimum: 1 },
    { ...initial, revision: -1 }, { ...initial, secret: "not-allowed" },
    { ...initial, recoveredAmount: 45 }, { ...active(), revoked: true }]) {
    assert.equal(isHolderFixture(value), false);
    assert.throws(() => readHolderFixture(JSON.stringify(value)));
  }
  assert.throws(() => readHolderFixture("{broken"));
});
