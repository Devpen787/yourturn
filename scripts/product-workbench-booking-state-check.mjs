import assert from "node:assert/strict";
import { test } from "node:test";
import {
  INITIAL_HOLDER_FIXTURE as initial,
  continuationOf,
  isHolderFixture,
  readHolderFixture,
  reduceBookingFixture as reduce,
  reduceHolderFixture,
  resolveCompletionView,
  resolveXcStep,
} from "../app/product-preview/holder-fixture-state.ts";

function active() {
  let state = { ...initial };
  state = reduceHolderFixture(state, { type: "acknowledge", value: true });
  state = reduceHolderFixture(state, { type: "begin-approval" });
  return reduceHolderFixture(state, { type: "approval-result", result: "approved" });
}

function pendingPayment() {
  let state = active();
  state = reduce(state, { type: "check-eligibility" });
  return reduce(state, { type: "begin-payment" });
}

function bob() {
  let state = pendingPayment();
  state = reduce(state, { type: "payment-result", result: "committed" });
  state = reduce(state, { type: "begin-handoff" });
  return reduce(state, { type: "complete-handoff" });
}

test("legacy R1a states remain valid without continuation", () => {
  assert.equal(isHolderFixture(active()), true);
  assert.equal(active().continuation, undefined);
  assert.equal(continuationOf(active()).payment, "idle");
});

test("pending payment persists and route choice cannot erase it", () => {
  const state = readHolderFixture(JSON.stringify(pendingPayment()));
  assert.equal(continuationOf(state).payment, "pending");
  assert.equal(continuationOf(state).paymentAttempts, 1);
  assert.equal(resolveXcStep("xc-find", state), "paymentPending");
  assert.equal(resolveXcStep("xc-eligibility", state), "paymentPending");
});

test("duplicate begin-payment resumes the same attempt", () => {
  const state = pendingPayment();
  assert.equal(reduce(state, { type: "begin-payment" }), state);
  assert.equal(continuationOf(state).paymentAttempts, 1);
});

test("payment error can retry without creating ownership", () => {
  const first = pendingPayment();
  const failed = reduce(first, { type: "payment-result", result: "error" });
  const retry = reduce(failed, { type: "begin-payment" });
  assert.equal(retry.holder, "maya");
  assert.equal(retry.settlementCount, 0);
  assert.equal(continuationOf(retry).payment, "pending");
  assert.equal(continuationOf(retry).paymentAttempts, 2);
});

test("confirmed payment alone cannot manufacture the holder change", () => {
  let state = pendingPayment();
  state = reduce(state, { type: "payment-result", result: "committed" });
  assert.equal(state.holder, "maya");
  assert.equal(state.settlementCount, 0);
  assert.equal(resolveXcStep("xc-bob-success", state), "opportunityReady");
});

test("handoff completes once only when the same lifecycle agrees", () => {
  const state = bob();
  assert.equal(state.holder, "bob");
  assert.equal(state.recoveredAmount, 45);
  assert.equal(state.settlementCount, 1);
  assert.equal(continuationOf(state).payment, "committed");
  assert.equal(continuationOf(state).handoff, "complete");
  assert.equal(reduce(state, { type: "complete-handoff" }), state);
});

test("check-in requires the current holder and an open window", () => {
  const owned = bob();
  assert.throws(() => reduce(owned, { type: "check-in" }));
  const open = {
    ...owned,
    continuation: { ...continuationOf(owned), checkinWindow: "open" },
    revision: owned.revision + 1,
  };
  assert.equal(isHolderFixture(open), true);
  const checked = reduce(open, { type: "check-in" });
  assert.equal(continuationOf(checked).attendance, "checked-in");
  assert.equal(continuationOf(checked).attendanceCount, 1);
  assert.equal(reduce(checked, { type: "check-in" }), checked);
});

test("checked-in fact wins over a stale requested Bob location", () => {
  const owned = bob();
  const checked = {
    ...owned,
    continuation: {
      ...continuationOf(owned),
      checkinWindow: "open",
      attendance: "checked-in",
      attendanceCount: 1,
    },
    revision: owned.revision + 1,
  };
  assert.equal(isHolderFixture(checked), true);
  assert.equal(resolveCompletionView("xc2-bob-ready", checked), "xc2-bob-checked-in");
  assert.equal(resolveCompletionView("xc2-bob-not-open", checked), "xc2-bob-checked-in");
  assert.equal(resolveXcStep("xc-find", checked), "bobSuccess");
});

test("fulfilled fact survives return to provider Today", () => {
  const owned = bob();
  const fulfilled = {
    ...owned,
    continuation: {
      ...continuationOf(owned),
      checkinWindow: "open",
      attendance: "checked-in",
      attendanceCount: 1,
      fulfilment: "fulfilled",
    },
    revision: owned.revision + 1,
  };
  assert.equal(isHolderFixture(fulfilled), true);
  assert.equal(resolveCompletionView("xc2-provider-pending", fulfilled), "xc2-provider-fulfilled");
});

test("fulfilment never erases completed recovery settlement", () => {
  const owned = bob();
  const fulfilled = {
    ...owned,
    continuation: {
      ...continuationOf(owned),
      checkinWindow: "open",
      attendance: "checked-in",
      attendanceCount: 1,
      fulfilment: "fulfilled",
    },
    revision: owned.revision + 1,
  };
  assert.equal(fulfilled.holder, "bob");
  assert.equal(fulfilled.recoveredAmount, 45);
  assert.equal(fulfilled.settlementCount, 1);
});

test("invalid actor continuation combinations fail closed", () => {
  const owned = bob();
  for (const value of [
    { ...owned, continuation: { ...continuationOf(owned), payment: "pending" } },
    { ...owned, continuation: { ...continuationOf(owned), handoff: "checking" } },
    { ...owned, continuation: { ...continuationOf(owned), fulfilment: "fulfilled" } },
    { ...active(), continuation: { ...continuationOf(active()), attendance: "checked-in", attendanceCount: 1 } },
  ]) {
    assert.equal(isHolderFixture(value), false);
    assert.throws(() => readHolderFixture(JSON.stringify(value)));
  }
});
