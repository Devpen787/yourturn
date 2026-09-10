const REQUIRED_METHOD = "@ledgerhq/device-signer-kit-ethereum signTypedData";
const REQUIRED_PATH = "44'/60'/0'/0/0";
const REQUIRED_DOMAIN = Object.freeze({
  name: "YourTurn Recovery Mandate",
  version: "1",
  chainId: 296,
});
const REQUIRED_DOMAIN_TYPES = Object.freeze([
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "salt", type: "bytes32" },
]);
const REQUIRED_MANDATE_TYPES = Object.freeze([
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
]);

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function normalizeAddress(value, label) {
  const address = requireString(value, label);
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error(`${label} must be an EVM address`);
  }
  return address.toLowerCase();
}

function stringifyScalar(value) {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return typeof value === "string" ? value : "";
}

function assertExactTypeArray(actual, expected, label) {
  if (!Array.isArray(actual) || JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} diverges from the canonical Recovery Mandate schema`);
  }
}

export function validatePreparedEnvelope(raw) {
  if (!isObject(raw) || raw.ok !== true) {
    throw new Error("prepared envelope must be a successful prepare response");
  }
  if (raw.evidenceLevel !== "CONFIGURED") {
    throw new Error("prepared envelope must still be CONFIGURED before device proof");
  }

  const mandateId = requireString(raw.mandateId, "mandateId");
  const network = requireString(raw.network, "network");
  if (network !== "testnet") {
    throw new Error("device proof is locked to the ETHOnline Hedera testnet path");
  }
  if (!isObject(raw.ledger)) throw new Error("ledger envelope is required");
  if (raw.ledger.method !== REQUIRED_METHOD) {
    throw new Error(`ledger.method must be ${REQUIRED_METHOD}`);
  }
  if (raw.ledger.derivationPath !== REQUIRED_PATH) {
    throw new Error(`ledger.derivationPath must be ${REQUIRED_PATH}`);
  }

  const signerAddress = normalizeAddress(
    raw.ledger.signerAddress,
    "ledger.signerAddress"
  );
  if (raw.ledger.signerSource !== "server_enrollment") {
    throw new Error("ledger signer must come from server_enrollment");
  }

  const typedData = raw.ledger.typedData;
  if (!isObject(typedData)) throw new Error("ledger.typedData is required");
  if (typedData.primaryType !== "RecoveryMandate") {
    throw new Error("typed data primaryType must be RecoveryMandate");
  }
  if (!isObject(typedData.domain) || !isObject(typedData.types) || !isObject(typedData.message)) {
    throw new Error("typed data domain/types/message are required");
  }
  if (
    typedData.domain.name !== REQUIRED_DOMAIN.name ||
    typedData.domain.version !== REQUIRED_DOMAIN.version ||
    Number(typedData.domain.chainId) !== REQUIRED_DOMAIN.chainId ||
    !/^0x[0-9a-fA-F]{64}$/.test(String(typedData.domain.salt ?? "")) ||
    Object.keys(typedData.domain).sort().join(",") !== "chainId,name,salt,version"
  ) {
    throw new Error("typed data domain diverges from the canonical Recovery Mandate domain");
  }
  assertExactTypeArray(
    typedData.types.EIP712Domain,
    REQUIRED_DOMAIN_TYPES,
    "typed data EIP712Domain"
  );
  assertExactTypeArray(
    typedData.types.RecoveryMandate,
    REQUIRED_MANDATE_TYPES,
    "typed data RecoveryMandate"
  );
  if (Object.keys(typedData.types).sort().join(",") !== "EIP712Domain,RecoveryMandate") {
    throw new Error("typed data contains unexpected type definitions");
  }

  const message = typedData.message;
  if (message.mandateId !== mandateId) {
    throw new Error("outer mandateId must equal the signed message mandateId");
  }
  const messageSigner = normalizeAddress(
    message.ledgerSignerAddress,
    "typedData.message.ledgerSignerAddress"
  );
  if (messageSigner !== signerAddress) {
    throw new Error("server-enrolled signer must equal the signer bound inside EIP-712");
  }

  const outerMandate = raw.mandate;
  if (!isObject(outerMandate)) throw new Error("mandate snapshot is required");
  for (const { name: key } of REQUIRED_MANDATE_TYPES) {
    if (stringifyScalar(outerMandate[key]) !== stringifyScalar(message[key])) {
      throw new Error(`mandate snapshot diverges from signed typed data at ${key}`);
    }
  }
  if (
    Object.keys(message).sort().join(",") !==
      REQUIRED_MANDATE_TYPES.map(({ name }) => name).sort().join(",")
  ) {
    throw new Error("typed data message contains unexpected Recovery Mandate fields");
  }

  if (message.allowedAction !== "resale") {
    throw new Error("device ceremony only accepts the narrow resale action");
  }
  if (message.cancellationAllowed !== false) {
    throw new Error("device ceremony requires cancellationAllowed=false");
  }
  if (!/^[1-9]\d*$/.test(String(message.minimumRecoveryAtomicUnits))) {
    throw new Error("minimumRecoveryAtomicUnits must be positive");
  }
  if (!/^[1-9]\d*$/.test(String(message.bookingSerial))) {
    throw new Error("bookingSerial must be positive");
  }

  return {
    network,
    mandateId,
    signerAddress,
    derivationPath: REQUIRED_PATH,
    humanSummary: requireString(raw.humanSummary, "humanSummary"),
    typedData,
  };
}

export function sanitizeDeviceState(state) {
  if (!isObject(state)) return { status: "unknown" };
  const status = stringifyScalar(state.status) || "unknown";
  const intermediate = isObject(state.intermediateValue)
    ? state.intermediateValue
    : {};
  const out = { status };
  if (intermediate.step) out.step = stringifyScalar(intermediate.step);
  if (intermediate.requiredUserInteraction) {
    out.requiredUserInteraction = stringifyScalar(
      intermediate.requiredUserInteraction
    );
  }
  if (status.toLowerCase().includes("error") && isObject(state.error)) {
    if (state.error._tag) out.errorTag = stringifyScalar(state.error._tag);
    if (state.error.errorCode) {
      out.errorCode = stringifyScalar(state.error.errorCode).toLowerCase();
    }
    if (state.error.message) out.errorMessage = stringifyScalar(state.error.message);
  }
  return out;
}

export function isUserRejectedState(state) {
  const sanitized = sanitizeDeviceState(state);
  return sanitized.errorCode === "6982";
}

export function sawTypedDataInteraction(events) {
  return events.some(
    (event) =>
      event?.step === "signer.eth.steps.signTypedData" &&
      typeof event?.requiredUserInteraction === "string" &&
      event.requiredUserInteraction.length > 0
  );
}

export function sawStoppedState(events) {
  return events.some(
    (event) => String(event?.status ?? "").toLowerCase() === "stopped"
  );
}

export function assertExpectedCeremonyResult({
  expectation,
  events,
  signature,
  cancelRequested = false,
}) {
  if (!["approve", "reject", "cancel"].includes(expectation)) {
    throw new Error("expectation must be approve, reject, or cancel");
  }
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error("no Ledger device states were observed");
  }
  if (!sawTypedDataInteraction(events)) {
    throw new Error("typed-data user interaction was never observed on device");
  }

  const rejected = events.some(
    (event) => String(event?.errorCode ?? "").toLowerCase() === "6982"
  );
  const stopped = sawStoppedState(events);
  const hasSignature = Boolean(signature);

  if (expectation === "approve") {
    if (!hasSignature) throw new Error("approve ceremony completed without a signature");
    if (rejected || stopped || cancelRequested) {
      throw new Error("approve ceremony also contained reject/cancel state");
    }
    return "approved";
  }

  if (hasSignature) {
    throw new Error(`${expectation} ceremony produced a signature; fail closed`);
  }
  if (expectation === "reject") {
    if (!rejected) throw new Error("reject ceremony did not return Ledger user-cancel code 6982");
    if (stopped || cancelRequested) {
      throw new Error("reject ceremony also contained host-cancel state");
    }
    return "rejected";
  }
  if (!cancelRequested) {
    throw new Error("cancel ceremony never invoked the DMK action cancel() handle");
  }
  if (rejected) {
    throw new Error("cancel ceremony observed device rejection instead of DMK cancellation");
  }
  if (!stopped) {
    throw new Error("cancel ceremony did not observe the DMK Stopped terminal state");
  }
  return "cancelled";
}

export const LEDGER_DEVICE_PROOF_CONTRACT = Object.freeze({
  method: REQUIRED_METHOD,
  derivationPath: REQUIRED_PATH,
  rejectErrorCode: "6982",
  cancelTerminalStatus: "Stopped",
});
