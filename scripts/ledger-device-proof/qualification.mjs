import {
  TypedDataEncoder,
  getAddress,
  verifyTypedData,
} from "ethers";

import {
  assertExpectedCeremonyResult,
  validatePreparedEnvelope,
} from "./ceremony.mjs";

const PROOF_SCHEMA = "yourturn-ledger-recovery-mandate-device-proof/v1";
const BUNDLE_SCHEMA = "yourturn-ledger-recovery-mandate-qualification/v1";
const RESULT_BY_EXPECTATION = Object.freeze({
  approve: "approved",
  reject: "rejected",
  cancel: "cancelled",
});

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function requireIsoTimestamp(value, label) {
  const text = requireString(value, label);
  if (!Number.isFinite(Date.parse(text))) {
    throw new Error(`${label} must be an ISO timestamp`);
  }
  return text;
}

function ethersTypedData(typedData) {
  const { EIP712Domain: _ignored, ...types } = typedData.types;
  return { domain: typedData.domain, types, message: typedData.message };
}

function sameAddress(actual, expected, label) {
  let normalizedActual;
  let normalizedExpected;
  try {
    normalizedActual = getAddress(requireString(actual, label));
    normalizedExpected = getAddress(requireString(expected, "expected signer"));
  } catch {
    throw new Error(`${label} must be a valid EVM address`);
  }
  if (normalizedActual !== normalizedExpected) {
    throw new Error(`${label} does not match the server-enrolled signer`);
  }
  return normalizedActual;
}

function reviewerState(event) {
  if (!isObject(event)) return { status: "unknown" };
  const out = {
    status: typeof event.status === "string" ? event.status : "unknown",
  };
  if (typeof event.step === "string" && event.step) out.step = event.step;
  if (
    typeof event.requiredUserInteraction === "string" &&
    event.requiredUserInteraction
  ) {
    out.requiredUserInteraction = event.requiredUserInteraction;
  }
  if (typeof event.errorTag === "string" && event.errorTag) {
    out.errorTag = event.errorTag;
  }
  if (typeof event.errorCode === "string" && event.errorCode) {
    out.errorCode = event.errorCode.toLowerCase();
  }
  return out;
}

export function preparedQualificationIdentity(raw) {
  const prepared = validatePreparedEnvelope(raw);
  const typed = ethersTypedData(prepared.typedData);
  const mandateDigest = TypedDataEncoder.hash(
    typed.domain,
    typed.types,
    typed.message
  );
  return {
    prepared,
    typed,
    mandateDigest,
    signerAddress: getAddress(prepared.signerAddress),
  };
}

export function validateDeviceProofAgainstPrepared({
  preparedRaw,
  proofRaw,
  expectation,
}) {
  if (!Object.hasOwn(RESULT_BY_EXPECTATION, expectation)) {
    throw new Error("expectation must be approve, reject, or cancel");
  }
  if (!isObject(proofRaw)) throw new Error(`${expectation} proof must be an object`);

  const identity = preparedQualificationIdentity(preparedRaw);
  if (proofRaw.schema !== PROOF_SCHEMA) {
    throw new Error(`${expectation} proof schema is not recognized`);
  }
  if (proofRaw.evidenceLevel !== "LIVE/DEVICE") {
    throw new Error(`${expectation} proof is not LIVE/DEVICE evidence`);
  }
  if (proofRaw.expectation !== expectation) {
    throw new Error(`${expectation} proof expectation does not match its slot`);
  }
  if (proofRaw.result !== RESULT_BY_EXPECTATION[expectation]) {
    throw new Error(`${expectation} proof result does not match its expectation`);
  }
  if (proofRaw.network !== identity.prepared.network) {
    throw new Error(`${expectation} proof network diverges from prepared mandate`);
  }
  if (proofRaw.mandateId !== identity.prepared.mandateId) {
    throw new Error(`${expectation} proof mandateId diverges from prepared mandate`);
  }
  if (
    String(proofRaw.mandateDigest ?? "").toLowerCase() !==
    identity.mandateDigest.toLowerCase()
  ) {
    throw new Error(`${expectation} proof digest diverges from the identical prepared mandate`);
  }
  if (proofRaw.derivationPath !== identity.prepared.derivationPath) {
    throw new Error(`${expectation} proof derivation path diverges from prepared mandate`);
  }

  sameAddress(
    proofRaw.enrolledSignerAddress,
    identity.signerAddress,
    `${expectation} enrolled signer`
  );
  const derivedDeviceAddress = sameAddress(
    proofRaw.derivedDeviceAddress,
    identity.signerAddress,
    `${expectation} derived device address`
  );

  if (proofRaw.activationAttempted !== false) {
    throw new Error(`${expectation} device proof must never activate authority`);
  }
  if (proofRaw.legacyApprovalGrantUsed !== false) {
    throw new Error(`${expectation} device proof must never use legacy ApprovalGrant authority`);
  }
  if (!Array.isArray(proofRaw.signingStates) || proofRaw.signingStates.length === 0) {
    throw new Error(`${expectation} proof is missing observable signing states`);
  }

  const signature = proofRaw.signature ?? null;
  const cancelRequested = proofRaw.cancelRequested === true;
  const result = assertExpectedCeremonyResult({
    expectation,
    events: proofRaw.signingStates,
    signature,
    cancelRequested,
  });
  if (result !== RESULT_BY_EXPECTATION[expectation]) {
    throw new Error(`${expectation} proof failed the ceremony contract`);
  }

  if (expectation === "approve") {
    const recovered = getAddress(
      verifyTypedData(
        identity.typed.domain,
        identity.typed.types,
        identity.typed.message,
        requireString(signature, "approve signature")
      )
    );
    if (recovered !== identity.signerAddress) {
      throw new Error("approve proof signature does not recover the enrolled Ledger signer");
    }
  } else if (signature !== null) {
    throw new Error(`${expectation} proof must not persist a signature`);
  }

  return {
    expectation,
    result,
    capturedAt: requireIsoTimestamp(
      proofRaw.capturedAt,
      `${expectation} capturedAt`
    ),
    derivedDeviceAddress,
    deviceModelId:
      isObject(proofRaw.device) && typeof proofRaw.device.modelId === "string"
        ? proofRaw.device.modelId
        : null,
    signingStates: proofRaw.signingStates.map(reviewerState),
    signature: expectation === "approve" ? signature : null,
    cancelRequested,
  };
}

export function buildReviewerQualificationBundle({
  preparedRaw,
  approveProof,
  rejectProof,
  cancelProof,
  tooling,
  generatedAt = new Date().toISOString(),
}) {
  const identity = preparedQualificationIdentity(preparedRaw);
  const approve = validateDeviceProofAgainstPrepared({
    preparedRaw,
    proofRaw: approveProof,
    expectation: "approve",
  });
  const reject = validateDeviceProofAgainstPrepared({
    preparedRaw,
    proofRaw: rejectProof,
    expectation: "reject",
  });
  const cancel = validateDeviceProofAgainstPrepared({
    preparedRaw,
    proofRaw: cancelProof,
    expectation: "cancel",
  });

  const deviceAddresses = new Set([
    approve.derivedDeviceAddress,
    reject.derivedDeviceAddress,
    cancel.derivedDeviceAddress,
  ]);
  if (deviceAddresses.size !== 1) {
    throw new Error("approve/reject/cancel did not use the same enrolled Ledger address");
  }

  return {
    schema: BUNDLE_SCHEMA,
    generatedAt: requireIsoTimestamp(generatedAt, "generatedAt"),
    deviceEvidenceLevel: "LIVE/DEVICE",
    authorityEvidenceLevel: "CONFIGURED",
    network: identity.prepared.network,
    mandateId: identity.prepared.mandateId,
    mandateDigest: identity.mandateDigest,
    signerAddress: identity.signerAddress,
    derivationPath: identity.prepared.derivationPath,
    humanSummary: identity.prepared.humanSummary,
    tooling: isObject(tooling) ? tooling : {},
    proofs: {
      reject,
      cancel,
      approve,
    },
    invariants: {
      identicalPreparedMandate: true,
      sameEnrolledDeviceAddress: true,
      approveSignatureVerified: true,
      rejectProducedNoSignature: true,
      cancelProducedNoSignature: true,
      deviceProofNeverActivatedAuthority: true,
      legacyApprovalGrantUsed: false,
    },
    claimBoundary:
      "LIVE/DEVICE proves that one identical off-chain YourTurn Recovery Mandate was approved, rejected, and host-cancelled through Ledger DMK Ethereum signTypedData. Authority activation remains separate and must pass the server-controlled one-shot Recovery Mandate path; this does not claim Ledger signed a Hedera HTS transaction.",
  };
}
