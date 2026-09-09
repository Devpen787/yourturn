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

export type RecoveryMandateAuthorizationExpectation = Pick<
  RecoveryMandate,
  | "mandateId"
  | "ownerId"
  | "agentId"
  | "bookingTokenId"
  | "bookingSerial"
  | "allowedAction"
  | "minimumRecoveryAtomicUnits"
  | "settlementAsset"
  | "expiresAt"
  | "nonce"
  | "cancellationAllowed"
  | "issuedAt"
>;

export type VerifyRecoveryMandateSignatureInput = {
  mandate: RecoveryMandate;
  signature: string;
  expectedSignerAddress: string;
  nowUnixSeconds?: bigint;
  maxFutureIssuedAtSkewSeconds?: number;
};

export type RecoveryMandateReplayClaim = {
  mandateId: string;
  nonce: string;
  digest: string;
  expiresAt: bigint;
  nowUnixSeconds: bigint;
};

export type RecoveryMandateReplayStore = {
  consumeOnce(input: RecoveryMandateReplayClaim): Promise<boolean>;
};

export type AuthorizeRecoveryMandateOnceInput =
  VerifyRecoveryMandateSignatureInput & {
    expected: RecoveryMandateAuthorizationExpectation;
    replayStore: RecoveryMandateReplayStore;
  };

export type VerifiedRecoveryMandate = {
  mandate: RecoveryMandate;
  digest: string;
  recoveredSignerAddress: string;
};

const BIGINT_ZERO = BigInt(0);
const BIGINT_ONE = BigInt(1);
const UINT64_MAX = (BIGINT_ONE << BigInt(64)) - BIGINT_ONE;
const UINT256_MAX = (BIGINT_ONE << BigInt(256)) - BIGINT_ONE;
const HEDERA_TOKEN_ID = /^0\.0\.[1-9]\d*$/;

function assertText(name: string, value: string, maxLength = 256): void {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new Error(`${name} must be a non-empty string <= ${maxLength} characters`);
  }
}

function assertUint(name: string, value: bigint, max: bigint): void {
  if (typeof value !== "bigint" || value < BIGINT_ZERO || value > max) {
    throw new Error(`${name} is outside its unsigned integer range`);
  }
}

function assertBoundValue<T>(
  name: keyof RecoveryMandateAuthorizationExpectation,
  actual: T,
  expected: T | undefined
): void {
  if (expected === undefined) {
    throw new Error(`Recovery mandate authorization expectation ${name} is required`);
  }
  if (actual !== expected) {
    throw new Error(`Recovery mandate ${name} mismatch`);
  }
}

function assertAuthorizationExpectation(
  mandate: RecoveryMandate,
  expected: RecoveryMandateAuthorizationExpectation
): void {
  if (!expected || typeof expected !== "object") {
    throw new Error("Recovery mandate authorization expectation is required");
  }

  assertBoundValue("mandateId", mandate.mandateId, expected.mandateId);
  assertBoundValue("ownerId", mandate.ownerId, expected.ownerId);
  assertBoundValue("agentId", mandate.agentId, expected.agentId);
  assertBoundValue(
    "bookingTokenId",
    mandate.bookingTokenId,
    expected.bookingTokenId
  );
  assertBoundValue(
    "bookingSerial",
    mandate.bookingSerial,
    expected.bookingSerial
  );
  assertBoundValue(
    "allowedAction",
    mandate.allowedAction,
    expected.allowedAction
  );
  assertBoundValue(
    "minimumRecoveryAtomicUnits",
    mandate.minimumRecoveryAtomicUnits,
    expected.minimumRecoveryAtomicUnits
  );
  assertBoundValue(
    "settlementAsset",
    mandate.settlementAsset,
    expected.settlementAsset
  );
  assertBoundValue("expiresAt", mandate.expiresAt, expected.expiresAt);
  assertBoundValue("nonce", mandate.nonce, expected.nonce);
  assertBoundValue(
    "cancellationAllowed",
    mandate.cancellationAllowed,
    expected.cancellationAllowed
  );
  assertBoundValue("issuedAt", mandate.issuedAt, expected.issuedAt);
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
  if (mandate.bookingSerial === BIGINT_ZERO) {
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

export function verifyRecoveryMandateSignature(
  input: VerifyRecoveryMandateSignatureInput
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

  return {
    mandate: value,
    digest: TypedDataEncoder.hash(domain, types, value),
    recoveredSignerAddress,
  };
}

export async function authorizeRecoveryMandateOnce(
  input: AuthorizeRecoveryMandateOnceInput
): Promise<VerifiedRecoveryMandate> {
  const nowUnixSeconds =
    input.nowUnixSeconds ?? BigInt(Math.floor(Date.now() / 1000));
  const verified = verifyRecoveryMandateSignature({
    mandate: input.mandate,
    signature: input.signature,
    expectedSignerAddress: input.expectedSignerAddress,
    nowUnixSeconds,
    maxFutureIssuedAtSkewSeconds: input.maxFutureIssuedAtSkewSeconds,
  });

  assertAuthorizationExpectation(verified.mandate, input.expected);

  const consumed = await input.replayStore.consumeOnce({
    mandateId: verified.mandate.mandateId,
    nonce: verified.mandate.nonce,
    digest: verified.digest,
    expiresAt: verified.mandate.expiresAt,
    nowUnixSeconds,
  });
  if (!consumed) {
    throw new Error("Recovery mandate has already been consumed");
  }

  return verified;
}
