import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {assertExpectedCeremonyResult} from "../../../../scripts/ledger-device-proof/ceremony.mjs";
const bytes=readFileSync(new URL("reject-failure-6985.json",import.meta.url));
const sha256=createHash("sha256").update(bytes).digest("hex");
assert.equal(sha256,"74aa44db804109c01a4515ae74e9c941cb283ecaaddcf6ee6f2776f40269affa");
const record=JSON.parse(bytes);
assert.throws(()=>assertExpectedCeremonyResult({expectation:"reject",events:record.signingStates,
  signature:record.signature,cancelRequested:record.cancelRequested}),/no Ledger device states were observed/);
console.log(JSON.stringify({sha256,bytes:bytes.length,evidenceClass:"HISTORICAL_FAILURE_SUMMARY",
  checkerResult:"REJECTED: no Ledger device states were observed",deviceQualified:false,
  assertion:"Missing events remain missing; summary booleans were not converted into device observations."},null,2));
