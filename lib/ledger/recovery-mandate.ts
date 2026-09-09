import {
  getAddress,
  keccak256,
  toUtf8Bytes,
  TypedDataEncoder,
  verifyTypedData,
} from "ethers";

export const RECOVERY_MANDATE_DOMAIN = {
  name: "YourTurn Recovery Mandate",
  version: "1",
  chainId: 296,
  salt: keccak256(toUtf8Bytes("yourturn:ethonline-2026:recovery-mandate:v1")),
};

export const RECOVERY_MANDATE_TYPES = {
  RecoveryMandate: [
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
  ],
};

export type RecoveryMandate = {
  mandateId: string;
  ownerId: string;
  ledgerSignerAddress: string;
  agentId: string;
  bookingTokenId: string;
  bookingSerial: bigint;
  allowedAction: string;
  minimumRecoveryAtomicUnits: bigint;
  settlementAsset: string;
  expiresAt: bigint;
  nonce: string;
  cancellationAllowed: boolean;
  issuedAt: bigint;
};

export type RecoveryMandateExpectation = Partial<
  Pick<
    RecoveryMandate,
    | "ownerId"
    | "agentId"
    | "bookingTokenId"
    | "bookingSerial"
    | "allowedAction"
    | "minimumRecoveryAtomicUnits"
    | "settlementAsset"
    | "cancellationAllowed"
  >
>;

export type VerifyRecoveryMandateInput = {
  mandate: RecoveryMandate;
  signature: string;
  expectedSignerAddress: string;
  expected?: RecoveryMandateExpectation;
  consumedMandateIds?: ReadonlySet<string>;
  consumedNonces?: ReadonlySet<string>;
  nowUnixSeconds?: bigint;
  maxFutureIssuedAtSkewSeconds?: number;
};

export type VerifiedRecoveryMandate = {
  mandate: RecoveryMandate;
  digest: string;
  recoveredSignerAddress: string;
};

const UINT64_MAX = (1n << 64n) - 1n;
const UINT256_MAX = (1n << 256n) - 1n;
const HEDERA_TOKEN_ID = /^0\.0\.[1-9]\d*$/;

function assertText(name: string, value: string, maxLength = 256): void {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new Error(`${name} must be a non-empty string <= ${maxLength} characters`);
  }
}

function assertUint(name: string, value: bigint, max: bigint): void {
  if (typeof value !== "bigint" || value < 0n || value > max) {
    throw new Error(`${name} is outside its unsigned integer range`);
  }
}

function assertExpectedValue<T>(
  name: string,
  actual: T,
  expected: T | undefined
): void {
  if (expected !== undefined && actual !== expected) {
    throw new Error(`Recovery mandate ${name} mismatch`);
  }
}

export function validateRecoveryMandate(mandate: RecoveryMandate): RecoveryMandate {
  assertText("mandateId", mandate.mandateId, 128);
  assertText("ownerId", mandate.ownerId);
  assertText("agentId", mandate.agentId);
  assertText("allowedAction", mandate.allowedAction, 64);
  assertText("nonce", mandate.nonce, 128);

  if (!HEDERA_TOKEN_ID.test(mandate.bookingTokenId)) {
    throw new Error("bookingTokenId must be a canonical Hedera token id");
  }
  if (!HEDERA_TOKEN_ID.test(mandate.settlementAsset)) {
    throw new Error("settlementAsset must be a canonical Hedera token id");
  }

  mandate.ledgerSignerAddress = getAddress(mandate.ledgerSignerAddress);

  assertUint("bookingSerial", mandate.bookingSerial, UINT64_MAX);
  if (mandate.bookingSerial === 0n) {
    throw new Error("bookingSerial must be greater than zero");
  }
  assertUint(
    "minimumRecoveryAtomicUnits",
    mandate.minimumRecoveryAtomicUnits,
    UINT256_MAX
  );
  assertUint("expiresAt", mandate.expiresAt, UINT64_MAX);
  assertUint("issuedAt", mandate.issuedAt, UINT64_MAX);

  if (mandate.expiresAt <= mandate.issuedAt) {
    throw new Error("Recovery mandate must expire after it is issued");
  }

  return mandate;
}

export function buildRecoveryMandateTypedData(mandate: RecoveryMandate) {
  const value = validateRecoveryMandate({ ...mandate });
  return {
    domain: RECOVERY_MANDATE_DOMAIN,
    types: RECOVERY_MANDATE_TYPES,
    value,
  };
}

export function hashRecoveryMandate(mandate: RecoveryMandate): string {
  const { domain, types, value } = buildRecoveryMandateTypedData(mandate);
  return TypedDataEncoder.hash(domain, types, value);
}

export function verifyRecoveryMandateAuthorization(
  input: VerifyRecoveryMandateInput
): VerifiedRecoveryMandate {
  const { domain, types, value } = buildRecoveryMandateTypedData(input.mandate);
  const nowUnixSeconds =
    input.nowUnixSeconds ?? BigInt(Math.floor(Date.now() / 1000));
  const maxFutureIssuedAtSkewSeconds = input.maxFutureIssuedAtSkewSeconds ?? 300;

  if (
    !Number.isInteger(maxFutureIssuedAtSkewSeconds) ||
    maxFutureIssuedAtSkewSeconds < 0 ||
    maxFutureIssuedAtSkewSeconds > 3600
  ) {
    throw new Error("maxFutureIssuedAtSkewSeconds must be an integer from 0 to 3600");
  }

  if (value.expiresAt <= nowUnixSeconds) {
    throw new Error("Recovery mandate has expired");
  }
  if (
    value.issuedAt >
    nowUnixSeconds + BigInt(maxFutureIssuedAtSkewSeconds)
  ) {
    throw new Error("Recovery mandate issuedAt is too far in the future");
  }
  if (input.consumedMandateIds?.has(value.mandateId)) {
    throw new Error("Recovery mandate id has already been consumed or revoked");
  }
  if (input.consumedNonces?.has(value.nonce)) {
    throw new Error("Recovery mandate nonce has already been consumed");
  }

  const expectedSignerAddress = getAddress(input.expectedSignerAddress);
  if (getAddress(value.ledgerSignerAddress) !== expectedSignerAddress) {
    throw new Error("Recovery mandate signer is not the enrolled Ledger address");
  }

  const recoveredSignerAddress = getAddress(
    verifyTypedData(domain, types, value, input.signature)
  );
  if (recoveredSignerAddress !== expectedSignerAddress) {
    throw new Error("Recovery mandate signature signer mismatch");
  }

  const expected = input.expected ?? {};
  assertExpectedValue("ownerId", value.ownerId, expected.ownerId);
  assertExpectedValue("agentId", value.agentId, expected.agentId);
  assertExpectedValue(
    "bookingTokenId",
    value.bookingTokenId,
    expected.bookingTokenId
  );
  assertExpectedValue(
    "bookingSerial",
    value.bookingSerial,
    expected.bookingSerial
  );
  assertExpectedValue(
    "allowedAction",
    value.allowedAction,
    expected.allowedAction
  );
  assertExpectedValue(
    "minimumRecoveryAtomicUnits",
    value.minimumRecoveryAtomicUnits,
    expected.minimumRecoveryAtomicUnits
  );
  assertExpectedValue(
    "settlementAsset",
    value.settlementAsset,
    expected.settlementAsset
  );
  assertExpectedValue(
    "cancellationAllowed",
    value.cancellationAllowed,
    expected.cancellationAllowed
  );

  return {
    mandate: value,
    digest: TypedDataEncoder.hash(domain, types, value),
    recoveredSignerAddress,
  };
}
