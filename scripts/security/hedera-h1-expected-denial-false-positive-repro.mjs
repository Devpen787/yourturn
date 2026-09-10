import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sourcePath = "scripts/hedera-return-bytes-external-signer.mjs";
const source = readFileSync(sourcePath, "utf8");

// Tie this reproducer to the exact production control flow we are attacking.
assert.match(
  source,
  /throw new Error\(`expected \$\{expectedStatus\}, got successful receipt \$\{status\}`\)/,
  "production signer no longer throws the expected-status text on unexpected success"
);
assert.match(
  source,
  /status === expectedStatus \|\| message\.includes\(expectedStatus\)/,
  "production signer no longer accepts message substring as expected denial"
);

const expectedStatus = "SPENDER_DOES_NOT_HAVE_ALLOWANCE";
const actualReceiptStatus = "SUCCESS";

// Reachable production path:
// 1. getReceipt() returns SUCCESS;
// 2. because --expect-status was supplied, production throws this local Error;
// 3. errorStatus(local Error) is null;
// 4. catch accepts message.includes(expectedStatus) and emits ok:true expected_denial.
const locallyThrownMessage = `expected ${expectedStatus}, got successful receipt ${actualReceiptStatus}`;
const caughtStatus = null;
const acceptedAsExpectedDenial = Boolean(
  expectedStatus &&
    (caughtStatus === expectedStatus || locallyThrownMessage.includes(expectedStatus))
);

assert.equal(actualReceiptStatus, "SUCCESS");
assert.equal(caughtStatus, null);
assert.equal(
  acceptedAsExpectedDenial,
  true,
  "vulnerability no longer reproduces; expected-success mismatch should not be accepted as denial"
);

console.log(
  JSON.stringify(
    {
      reproduced: true,
      sourcePath,
      expectedStatus,
      actualReceiptStatus,
      caughtStatus,
      locallyThrownMessage,
      productionCatchWouldMarkExpectedDenial: acceptedAsExpectedDenial,
      impact:
        "A successful transaction can be reclassified as an expected denial solely because the locally-thrown mismatch message contains the expected status string.",
    },
    null,
    2
  )
);
