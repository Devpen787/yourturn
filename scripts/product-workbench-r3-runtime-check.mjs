import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { bookingFixture, bobFixture } from "./product-workbench-booking-fixtures.mjs";
import { R3_PROVIDER_INITIAL, reduceR3ProviderState, readR3ProviderState } from "../app/product-preview/r3-provider-state.ts";

const source = new URL("../app/product-preview/provider-runtime.ts", import.meta.url);
let code = stripTypeScriptTypes(await readFile(source, "utf8"));
for (const name of ["holder-fixture-state", "r3-provider-state"]) code = code.replaceAll(`"./${name}"`, JSON.stringify(new URL(`../app/product-preview/${name}.ts`, import.meta.url).href));
const { assertPublishedProviderAction: guard, providerCheckinWindow: windowOf, scenarioMinute } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
const initial = structuredClone(R3_PROVIDER_INITIAL);
const raw = (s) => JSON.stringify(s);
const publish = (changes) => {
  let s = structuredClone(initial);
  for (const [field, value] of Object.entries(changes)) s = reduceR3ProviderState(s, { type: "edit", field, value });
  return reduceR3ProviderState(s, { type: "save" });
};
const state = bookingFixture();
assert.equal(scenarioMinute(state), 1020);
guard(state, null, { type: "begin-payment" });
const moved = publish({ startTime: "19:00", capacity: "14", transferCutoff: "18:30" });
guard(state, raw(moved), { type: "complete-handoff" });
assert.equal(windowOf(bobFixture({ checkinWindow: "open" }), moved.published), "before");
assert.equal(windowOf(bobFixture({ checkinWindow: "open" }), initial.published), "open");
const closed = publish({ transferCutoff: "16:59" });
for (const type of ["check-eligibility", "begin-payment", "payment-result", "begin-handoff", "complete-handoff", "recover"]) assert.throws(() => guard(state, raw(closed), { type }), /Published Studio A/);
assert.throws(() => guard(state, raw(publish({ transferCutoff: "17:00" })), { type: "begin-payment" }));
assert.throws(() => guard(state, raw(publish({ eligibilityRule: "Recovery paused" })), { type: "recover" }));
const unsupported = publish({ eligibilityRule: "Everybody can buy" });
assert.equal(unsupported.lastSave, "error"); assert.deepEqual(unsupported.published, initial.published);
assert.equal(publish({ startTime: "17:00", transferCutoff: "18:00" }).lastSave, "error");
assert.throws(() => guard(state, "bad-json", { type: "recover" }));
assert.throws(() => readR3ProviderState(raw({ ...initial, published: { ...initial.published, eligibilityRule: "Unknown condition" } })));
assert.throws(() => guard(bobFixture({ checkinWindow: "open" }), raw(moved), { type: "check-in" }));
guard(bobFixture({ checkinWindow: "open" }), raw(initial), { type: "check-in" });
// Fee/cutoff changes cannot roll back an already completed booking/receipt.
guard(bobFixture(), raw(closed), { type: "complete-handoff" });
assert.deepEqual(state, bookingFixture(), "Provider guard mutated holder authority");
console.log("PASS R3 published provider runtime: cutoff/action rechecks, unsupported policy, fixed clock, check-in and no holder mutation");
