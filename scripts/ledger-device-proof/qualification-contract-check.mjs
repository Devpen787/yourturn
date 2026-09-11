import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { Wallet } from "ethers";

import {
  buildReviewerQualificationBundle,
  preparedQualificationIdentity,
} from "./qualification.mjs";

const wallet = Wallet.createRandom();
const signer = wallet.address;
const mandate = {
  mandateId: "mandate-qualification-fixture",
  ownerId: "fixture-owner",
  ledgerSignerAddress: signer,
  agentId: "yourturn-concierge",
  bookingTokenId: "0.0.5005",
  bookingSerial: "193",
  allowedAction: "resale",
  minimumRecoveryAtomicUnits: "40000000",
  settlementAsset: "0.0.429274",
  expiresAt: "1893456000",
  nonce: "nonce-qualification-fixture",
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
  humanSummary:
    "Allow yourturn-concierge to resell booking #193 for at least 40 USDC. Cancellation is not allowed.",
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

const identity = preparedQualificationIdentity(prepared);
const approveSignature = await wallet.signTypedData(
  identity.typed.domain,
  identity.typed.types,
  identity.typed.message
);
const interaction = {
  status: "pending",
  step: "signer.eth.steps.signTypedData",
  requiredUserInteraction: "signTypedData",
};
const completed = { status: "completed" };
const rejected = {
  status: "error",
  errorTag: "EthAppCommandError",
  errorCode: "6982",
};
const stopped = { status: "stopped" };

function makeProof({ expectation, result, states, signature = null, cancelRequested = false }) {
  return {
    schema: "yourturn-ledger-recovery-mandate-device-proof/v1",
    capturedAt: "2030-01-01T00:00:00.000Z",
    evidenceLevel: "LIVE/DEVICE",
    network: "testnet",
    mandateId: mandate.mandateId,
    mandateDigest: identity.mandateDigest,
    derivationPath: "44'/60'/0'/0/0",
    enrolledSignerAddress: signer,
    derivedDeviceAddress: signer,
    device: { modelId: "fixture-device" },
    expectation,
    result,
    addressStates: [{ status: "completed" }],
    signingStates: states,
    signature,
    cancelRequested,
    activationAttempted: false,
    legacyApprovalGrantUsed: false,
  };
}

const approve = makeProof({
  expectation: "approve",
  result: "approved",
  states: [interaction, completed],
  signature: approveSignature,
});
const reject = makeProof({
  expectation: "reject",
  result: "rejected",
  states: [interaction, rejected],
});
const cancel = makeProof({
  expectation: "cancel",
  result: "cancelled",
  states: [interaction, stopped],
  cancelRequested: true,
});

const bundle = buildReviewerQualificationBundle({
  preparedRaw: prepared,
  approveProof: approve,
  rejectProof: reject,
  cancelProof: cancel,
  tooling: {
    deviceManagementKit: "1.9.0",
    ethereumSignerKit: "1.18.0",
  },
  generatedAt: "2030-01-01T00:01:00.000Z",
});
assert.equal(bundle.deviceEvidenceLevel, "LIVE/DEVICE");
assert.equal(bundle.authorityEvidenceLevel, "CONFIGURED");
assert.equal(bundle.mandateDigest, identity.mandateDigest);
assert.equal(bundle.invariants.identicalPreparedMandate, true);
assert.equal(bundle.invariants.legacyApprovalGrantUsed, false);
assert.equal(bundle.proofs.reject.signature, null);
assert.equal(bundle.proofs.cancel.signature, null);
assert.equal(bundle.proofs.approve.signature, approveSignature);

const wrongDigestReject = structuredClone(reject);
wrongDigestReject.mandateDigest = `0x${"22".repeat(32)}`;
assert.throws(
  () =>
    buildReviewerQualificationBundle({
      preparedRaw: prepared,
      approveProof: approve,
      rejectProof: wrongDigestReject,
      cancelProof: cancel,
      tooling: {},
    }),
  /digest diverges from the identical prepared mandate/
);

const activatedReject = structuredClone(reject);
activatedReject.activationAttempted = true;
assert.throws(
  () =>
    buildReviewerQualificationBundle({
      preparedRaw: prepared,
      approveProof: approve,
      rejectProof: activatedReject,
      cancelProof: cancel,
      tooling: {},
    }),
  /must never activate authority/
);

const unsignedApprove = structuredClone(approve);
unsignedApprove.signature = null;
assert.throws(
  () =>
    buildReviewerQualificationBundle({
      preparedRaw: prepared,
      approveProof: unsignedApprove,
      rejectProof: reject,
      cancelProof: cancel,
      tooling: {},
    }),
  /completed without a signature/
);

const unrequestedCancel = structuredClone(cancel);
unrequestedCancel.cancelRequested = false;
assert.throws(
  () =>
    buildReviewerQualificationBundle({
      preparedRaw: prepared,
      approveProof: approve,
      rejectProof: reject,
      cancelProof: unrequestedCancel,
      tooling: {},
    }),
  /never invoked the DMK action cancel\(\) handle/
);

const sessionRunner = await fs.readFile(
  new URL("./qualification-session.mjs", import.meta.url),
  "utf8"
);
const captureRunner = await fs.readFile(
  new URL("./capture-prepared.mjs", import.meta.url),
  "utf8"
);
const downstreamRunner = await fs.readFile(
  new URL("./downstream-check.mjs", import.meta.url),
  "utf8"
);
assert.match(sessionRunner, /DEVICE REJECT[\s\S]*HOST CANCEL[\s\S]*DEVICE APPROVE/);
assert.match(sessionRunner, /--prepared[\s\S]*args\.prepared/g);
assert.match(captureRunner, /remote\/prod URLs are refused/);
assert.match(downstreamRunner, /remote\/prod URLs are refused/);
assert.doesNotMatch(sessionRunner, /\/api\/agent\/approval-grant/);
assert.doesNotMatch(captureRunner, /\/api\/ledger\/recovery-mandate\/activate/);
assert.doesNotMatch(downstreamRunner, /\/api\/agent\/approval-grant/);
assert.doesNotMatch(downstreamRunner, /\/api\/recovery\/confirm/);
assert.doesNotMatch(downstreamRunner, /resale-buy/);

console.log("Ledger qualification evidence contract: PASS");
console.log("- approve/reject/cancel must share the identical prepared EIP-712 digest");
console.log("- reject/cancel persist no signature and device proof never activates authority");
console.log("- cancel proof must record the DMK cancel() request plus Stopped state");
console.log("- reviewer bundle verifies the approved signature against the enrolled signer");
console.log("- downstream qualification is localhost-only and excludes recovery/fund execution routes");
