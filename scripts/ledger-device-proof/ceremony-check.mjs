import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  assertExpectedCeremonyResult,
  isUserRejectedState,
  sanitizeDeviceState,
  sawCompletedState,
  sawStoppedState,
  validatePreparedEnvelope,
} from "./ceremony.mjs";

const signer = "0x1111111111111111111111111111111111111111";
const mandate = {
  mandateId: "mandate-1",
  ownerId: "0.0.1001",
  ledgerSignerAddress: signer,
  agentId: "yourturn-concierge",
  bookingTokenId: "0.0.5005",
  bookingSerial: "193",
  allowedAction: "resale",
  minimumRecoveryAtomicUnits: "40000000",
  settlementAsset: "0.0.456858",
  expiresAt: "1893456000",
  nonce: "nonce-1",
  cancellationAllowed: false,
  issuedAt: "1893450000",
};
const recoveryMandateTypes = [
  { name: "mandateId", type: "string" },
  { name: "ownerId", type: "string" },
  { name: "ledgerSignerAddress", type: "address" },
  { name: "agentId", type: "string" },
  { name: "bookingTokenId", type: "string" },
  { name: "bookingSerial", type: "uint64" },
  { name: "allowedAction", type: "string" },
  { name: "minimumRecoveryAtomicUnits", type: "uint256" },
  { name: "settlementAsset", type: "string" },
  { name: "expiresAt", type: "uint64" },
  { name: "nonce", type: "string" },
  { name: "cancellationAllowed", type: "bool" },
  { name: "issuedAt", type: "uint64" },
];
const prepared = {
  ok: true,
  evidenceLevel: "CONFIGURED",
  network: "testnet",
  mandateId: mandate.mandateId,
  humanSummary: "Recover serial 193 only for at least 40 USDC before expiry.",
  mandate,
  ledger: {
    signerAddress: signer,
    signerSource: "server_enrollment",
    derivationPath: "44'/60'/0'/0/0",
    method: "@ledgerhq/device-signer-kit-ethereum signTypedData",
    typedData: {
      domain: {
        name: "YourTurn Recovery Mandate",
        version: "1",
        chainId: 296,
        salt: "0x1111111111111111111111111111111111111111111111111111111111111111",
      },
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "salt", type: "bytes32" },
        ],
        RecoveryMandate: recoveryMandateTypes,
      },
      primaryType: "RecoveryMandate",
      message: { ...mandate },
    },
  },
};

const normalized = validatePreparedEnvelope(prepared);
assert.equal(normalized.mandateId, "mandate-1");
assert.equal(normalized.signerAddress, signer);

for (const [label, mutate, expected] of [
  ["client signer substitution", (v) => (v.ledger.signerAddress = "0x2222222222222222222222222222222222222222"), /server-enrolled signer/],
  ["serial mutation", (v) => (v.mandate.bookingSerial = "194"), /bookingSerial/],
  ["minimum mutation", (v) => (v.mandate.minimumRecoveryAtomicUnits = "32000000"), /minimumRecoveryAtomicUnits/],
  ["action expansion", (v) => (v.ledger.typedData.message.allowedAction = "transfer"), /allowedAction/],
  ["cancellation expansion", (v) => (v.ledger.typedData.message.cancellationAllowed = true), /cancellationAllowed/],
  ["domain mutation", (v) => (v.ledger.typedData.domain.chainId = 1), /canonical Recovery Mandate domain/],
  ["type mutation", (v) => (v.ledger.typedData.types.RecoveryMandate[5].type = "string"), /canonical Recovery Mandate schema/],
  ["non-configured input", (v) => (v.evidenceLevel = "LIVE\/DEVICE"), /must still be CONFIGURED/],
]) {
  const copy = structuredClone(prepared);
  mutate(copy);
  assert.throws(() => validatePreparedEnvelope(copy), expected, label);
}

const interaction = sanitizeDeviceState({
  status: "pending",
  intermediateValue: {
    step: "signer.eth.steps.signTypedData",
    requiredUserInteraction: "signTypedData",
  },
});
const rejected = sanitizeDeviceState({
  status: "error",
  error: {
    _tag: "EthAppCommandError",
    errorCode: "6982",
    message: "Security status not satisfied (Canceled by user)",
  },
});
const stopped = sanitizeDeviceState({ status: "stopped" });
const completed = sanitizeDeviceState({ status: "completed" });
assert.equal(isUserRejectedState({ status: "error", error: { errorCode: "6982" } }), true);
assert.equal(sawStoppedState([interaction, stopped]), true);
assert.equal(sawStoppedState([interaction]), false);
assert.equal(sawCompletedState([interaction, completed]), true);
assert.equal(sawCompletedState([interaction]), false);
assert.equal(
  assertExpectedCeremonyResult({
    expectation: "approve",
    events: [interaction, completed],
    signature: "0xhardware-signature",
  }),
  "approved"
);
assert.equal(
  assertExpectedCeremonyResult({
    expectation: "reject",
    events: [interaction, rejected],
    signature: null,
  }),
  "rejected"
);
assert.equal(
  assertExpectedCeremonyResult({
    expectation: "cancel",
    events: [interaction, stopped],
    signature: null,
    cancelRequested: true,
  }),
  "cancelled"
);
assert.throws(
  () =>
    assertExpectedCeremonyResult({
      expectation: "approve",
      events: [interaction],
      signature: "0xunexpected",
    }),
  /did not observe the DMK Completed terminal state/
);
assert.throws(
  () =>
    assertExpectedCeremonyResult({
      expectation: "cancel",
      events: [interaction],
      signature: null,
      cancelRequested: true,
    }),
  /did not observe the DMK Stopped terminal state/
);
assert.throws(
  () =>
    assertExpectedCeremonyResult({
      expectation: "cancel",
      events: [interaction, stopped, completed],
      signature: null,
      cancelRequested: true,
    }),
  /also completed the signing action; fail closed/
);
assert.throws(
  () =>
    assertExpectedCeremonyResult({
      expectation: "cancel",
      events: [interaction, rejected],
      signature: null,
      cancelRequested: true,
    }),
  /observed device rejection instead of DMK cancellation/
);
assert.throws(
  () =>
    assertExpectedCeremonyResult({
      expectation: "reject",
      events: [interaction, rejected, completed],
      signature: null,
    }),
  /also contained completed\/host-cancel state/
);
assert.throws(
  () =>
    assertExpectedCeremonyResult({
      expectation: "reject",
      events: [interaction, completed],
      signature: "0xunexpected",
    }),
  /produced a signature; fail closed/
);
assert.throws(
  () =>
    assertExpectedCeremonyResult({
      expectation: "approve",
      events: [completed],
      signature: "0xsignature",
    }),
  /typed-data user interaction was never observed/
);

const runner = await fs.readFile(new URL("./device-proof.mjs", import.meta.url), "utf8");
assert.match(runner, /SignerEthBuilder/);
assert.match(runner, /signTypedData/);
assert.match(runner, /nodeHidTransportFactory/);
assert.match(runner, /action\.cancel\(\)/);
assert.doesNotMatch(runner, /hw-app-/);
assert.doesNotMatch(runner, /\/api\/agent\/approval-grant/);
assert.doesNotMatch(runner, /fetch\s*\(/);

const devicePackage = JSON.parse(
  await fs.readFile(new URL("./package.json", import.meta.url), "utf8")
);
assert.equal(devicePackage.dependencies["@ledgerhq/device-management-kit"], "1.9.0");
assert.equal(devicePackage.dependencies["@ledgerhq/device-signer-kit-ethereum"], "1.18.0");
assert.equal(devicePackage.dependencies["@ledgerhq/device-transport-kit-node-hid"], "1.0.1");
assert.equal(devicePackage.dependencies["@ledgerhq/context-module"], "2.5.0");
assert.equal(devicePackage.dependencies.rxjs, "7.8.2");

console.log("Ledger DMK device ceremony contract: PASS");
console.log("- exact domain/type/message semantics fail closed on mutation");
console.log("- approve requires typed-data interaction + exclusive Completed terminal state + signature");
console.log("- reject requires Ledger ETH error 6982 and no completed/host-cancel state");
console.log("- cancel requires DMK cancel() + exclusive Stopped terminal state and persists no signature");
console.log("- runner contains no activation/fetch path and no legacy hw-app dependency");
