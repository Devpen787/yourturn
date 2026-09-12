import assert from "node:assert/strict";
import { test } from "node:test";
import { bobFixture, bookingFixture } from "./product-workbench-booking-fixtures.mjs";
import { continuationOf, fulfilmentOf, isHolderFixture, readHolderFixture, reduceBookingFixture as reduce, resolveCompletionView } from "../app/product-preview/holder-fixture-state.ts";

const checked = () => bobFixture({ checkinWindow: "open", attendance: "checked-in", attendanceCount: 1 });
const pending = (response = "confirmed") => {
  const s = checked();
  s.continuation = { ...fulfilmentOf(s), fulfilmentResponse: response };
  return reduce(s, { type: "begin-fulfilment" });
};
function retained(s) {
  assert.equal(s.booking, "friday-yoga");
  assert.equal(s.holder, "bob");
  assert.equal(s.recoveredAmount, 45);
  assert.equal(s.settlementCount, 1);
  assert.equal(continuationOf(s).attendanceCount, 1);
}
const result = (s, attempt = fulfilmentOf(s).fulfilmentAttempts) => reduce(s, { type: "resolve-fulfilment", attempt });

test("v1 and holder-only recovery stay readable; fulfilment migrates in place", () => {
  const legacy = checked();
  assert.deepEqual(readHolderFixture(JSON.stringify(legacy)), legacy);
  const next = reduce(legacy, { type: "begin-fulfilment" });
  assert.equal(next.continuation.version, 2);
  assert.equal(next.continuation.fulfilmentAttempts, 1);
  assert.equal(next.continuation.fulfilmentCount, 0);
  assert.equal(next.revision, legacy.revision + 1);
  assert.deepEqual(readHolderFixture(JSON.stringify(next)), next);
  retained(next);
  const holderOnly = { ...bobFixture() }; delete holderOnly.continuation;
  assert(isHolderFixture(holderOnly));
  assert.equal(continuationOf(holderOnly).handoff, "complete");
});

test("expected attendance, wrong holder and stale read cannot start fulfilment", () => {
  for (const s of [bobFixture(), bookingFixture(), bobFixture({ attendance: "checked-in", attendanceCount: 1, holderRead: "stale" })]) {
    assert.throws(() => reduce(s, { type: "begin-fulfilment" }));
  }
});

test("check-in restrictions and attendance are independent of delivered service", () => {
  for (const checkinWindow of ["before", "closed"]) {
    const s = bobFixture({ checkinWindow });
    assert.throws(() => reduce(s, { type: "check-in" }));
    assert.equal(continuationOf(s).attendanceCount, 0);
  }
  const s = reduce(bobFixture({ checkinWindow: "open" }), { type: "check-in" });
  assert.equal(continuationOf(s).fulfilment, "none");
  assert.equal(reduce(s, { type: "check-in" }), s);
  retained(s);
});

test("pending reload and duplicate begin retain one attempt", () => {
  const s = pending();
  assert.equal(reduce(s, { type: "begin-fulfilment" }), s);
  assert.equal(s.continuation.fulfilmentAttempts, 1);
  assert.equal(resolveCompletionView("xc2-provider-fulfilled", s), "xc2-provider-fulfilment-pending");
  assert.deepEqual(readHolderFixture(JSON.stringify(s)), s);
  retained(s);
});

test("failure, retry and success keep exactly one terminal service record", () => {
  const failed = result(pending("fail-once"));
  assert.equal(failed.continuation.fulfilment, "error");
  assert.equal(failed.continuation.fulfilmentCount, 0);
  const retry = reduce(failed, { type: "begin-fulfilment" });
  assert.equal(retry.continuation.fulfilmentAttempts, 2);
  assert.equal(result(retry, 1), retry, "Late result cannot resolve a newer attempt");
  const success = result(retry);
  assert.equal(success.continuation.fulfilment, "fulfilled");
  assert.equal(success.continuation.fulfilmentCount, 1);
  assert.equal(result(success), success);
  assert.equal(reduce(success, { type: "begin-fulfilment" }), success);
  for (const s of [failed, retry, success]) retained(s);
});

test("unknown and stale results stay pending; refresh cannot fake success", () => {
  const unknown = pending("unknown");
  assert.equal(result(unknown), unknown);
  const stale = pending(); stale.continuation.holderRead = "stale";
  assert.equal(result(stale), stale);
  assert.equal(resolveCompletionView("xc2-provider-fulfilled", stale), "xc2-provider-reconcile-issue");
  retained(stale); retained(unknown);
});

test("forged success URLs do not complete attendance, service or reconciliation", () => {
  const s = bobFixture();
  assert.equal(resolveCompletionView("xc2-bob-checked-in", s), "xc2-bob-not-open");
  assert.equal(resolveCompletionView("xc2-provider-fulfilled", s), "xc2-provider-pending");
  assert.equal(resolveCompletionView("xc2-provider-history", s), "xc2-provider-pending");
  assert.throws(() => reduce(s, { type: "reconcile" }));
  assert.equal(s.settlementCount, 1);
});

test("reconciliation follows service result and remains idempotent", () => {
  const p = pending();
  assert.throws(() => reduce(p, { type: "reconcile" }));
  const s = result(p);
  const r = reduce(s, { type: "reconcile" });
  assert.equal(r.continuation.reconciliation, "complete");
  assert.equal(reduce(r, { type: "reconcile" }), r);
  assert.equal(resolveCompletionView("xc2-provider-history", r), "xc2-provider-history");
  retained(r);
});

test("Maya receipt remains available before, during and after service", () => {
  for (const s of [bobFixture(), pending(), result(pending("fail-once")), result(pending())]) {
    assert.equal(resolveCompletionView("xc2-maya-history", s), "xc2-maya-history");
    assert.equal(s.recoveredAmount, 45);
    assert.equal(s.settlementCount, 1);
  }
});

test("malformed version, counters, fields and terminal combinations fail closed", () => {
  const s = pending();
  for (const patch of [
    { version: 3 }, { fulfilmentAttempts: -1 }, { fulfilmentAttempts: 0 },
    { fulfilmentCount: 1 }, { fulfilmentResponse: "invented" },
    { fulfilment: "fulfilled", fulfilmentCount: 0 },
    { attendance: "none", attendanceCount: 0 }, { extra: true },
  ]) {
    const bad = { ...s, continuation: { ...s.continuation, ...patch } };
    assert.equal(isHolderFixture(bad), false);
    assert.throws(() => readHolderFixture(JSON.stringify(bad)));
  }
});
