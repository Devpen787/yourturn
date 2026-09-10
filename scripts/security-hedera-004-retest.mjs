import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Status } from "@hiero-ledger/sdk";
import {
  hasExactExpectedHederaStatus,
  hederaErrorStatus,
} from "./hedera-return-bytes-status-guard.mjs";

const expected = Status.SpenderDoesNotHaveAllowance.toString();
assert.equal(expected, "SPENDER_DOES_NOT_HAVE_ALLOWANCE");

// Original SEC-HEDERA-004 path: a successful receipt is converted into a local
// mismatch Error whose text contains the expected denial. It must not qualify.
const unexpectedSuccess = new Error(
  `expected ${expected}, got successful receipt ${Status.Success.toString()}`
);
assert.equal(hederaErrorStatus(unexpectedSuccess), null);
assert.equal(hasExactExpectedHederaStatus(unexpectedSuccess, expected), false);

// Message poisoning must not matter, even when a real-but-different SDK status
// is present on the error-shaped object.
const poisonedWrongStatus = {
  status: Status.InvalidSignature,
  message: `upstream text contains ${expected}`,
};
assert.equal(hederaErrorStatus(poisonedWrongStatus), "INVALID_SIGNATURE");
assert.equal(hasExactExpectedHederaStatus(poisonedWrongStatus, expected), false);

// A genuine exact Hedera status remains accepted.
const exactDenial = {
  status: Status.SpenderDoesNotHaveAllowance,
  message: "receipt status-bearing denial",
};
assert.equal(hederaErrorStatus(exactDenial), expected);
assert.equal(hasExactExpectedHederaStatus(exactDenial, expected), true);

// SUCCESS and absent expected-status flags must never be interpreted as denial.
assert.equal(
  hasExactExpectedHederaStatus({ status: Status.Success }, expected),
  false
);
assert.equal(hasExactExpectedHederaStatus(exactDenial, null), false);

// Confirm the production signer routes its catch classification through the
// exact-status guard and has not retained the vulnerable substring fallback.
const signerSource = readFileSync(
  new URL("./hedera-return-bytes-external-signer.mjs", import.meta.url),
  "utf8"
);
assert.match(
  signerSource,
  /if \(hasExactExpectedHederaStatus\(error, expectedStatus\)\)/
);
assert.equal(signerSource.includes("message.includes(expectedStatus)"), false);

console.log(
  JSON.stringify(
    {
      ok: true,
      objective: "SEC-HEDERA-004 independent retest",
      exactSdkStatusAccepted: true,
      unexpectedSuccessRejected: true,
      poisonedMessageRejected: true,
      wrongSdkStatusRejected: true,
      noExpectedStatusRejected: true,
      productionCatchUsesExactStatusGuard: true,
      networkSubmission: false,
      fundsSpent: false,
    },
    null,
    2
  )
);
