import assert from "node:assert/strict";
import {
  R3_PROVIDER_INITIAL,
  providerDraftIsDirty,
  reduceR3ProviderState,
  validateProviderDraft,
} from "../app/product-preview/r3-provider-state.ts";

const original = structuredClone(R3_PROVIDER_INITIAL);
assert.deepEqual(validateProviderDraft(original.draft), []);
assert.equal(providerDraftIsDirty(original), false);

let invalid = reduceR3ProviderState(original, { type: "edit", field: "capacity", value: "0" });
assert.equal(providerDraftIsDirty(invalid), true);
const invalidPublished = structuredClone(invalid.published);
invalid = reduceR3ProviderState(invalid, { type: "save" });
assert.equal(invalid.lastSave, "error");
assert.match(invalid.lastError, /Capacity/);
assert.deepEqual(invalid.published, invalidPublished, "Invalid draft mutated published truth");

let draft = reduceR3ProviderState(original, { type: "edit", field: "capacity", value: "14" });
draft = reduceR3ProviderState(draft, { type: "edit", field: "transferCutoff", value: "17:20" });
assert.equal(draft.published.capacity, 12);
assert.equal(draft.published.transferCutoff, "17:30");
assert.equal(providerDraftIsDirty(draft), true);

let failed = reduceR3ProviderState(draft, { type: "arm-save-failure" });
const beforeFailure = structuredClone(failed.published);
failed = reduceR3ProviderState(failed, { type: "save" });
assert.equal(failed.lastSave, "error");
assert.equal(failed.saveMode, "normal");
assert.deepEqual(failed.published, beforeFailure, "Save failure mutated published truth");

const saved = reduceR3ProviderState(failed, { type: "save" });
assert.equal(saved.lastSave, "saved");
assert.equal(saved.published.sessionTitle, "Friday Yoga");
assert.equal(saved.published.capacity, 14);
assert.equal(saved.published.transferCutoff, "17:20");
assert.equal(providerDraftIsDirty(saved), false);

const changedIdentity = reduceR3ProviderState(saved, { type: "edit", field: "sessionTitle", value: "Saturday Yoga" });
assert(validateProviderDraft(changedIdentity.draft).some((e) => e.includes("Friday Yoga")));
assert.deepEqual(reduceR3ProviderState(changedIdentity, { type: "save" }).published, saved.published);

console.log("R3 provider fixture invariants: PASS");
console.log("- invalid drafts cannot mutate published/runtime truth");
console.log("- save failure is fail-closed and one-shot without changing published truth");
console.log("- valid draft publishes only after explicit save");
console.log("- Friday Yoga identity remains fixed while operational provider inputs are editable");
