import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { AgentMode } from "@hashgraph/hedera-agent-kit";
import { Client, PublicKey, Transaction } from "@hiero-ledger/sdk";
import { getRedis } from "../store/redis.ts";
import { BookingRightDelegationPolicy, BookingRightDelegationPolicyError } from "./booking-right-delegation-policy.ts";
import { YOURTURN_DELEGATED_RECOVERY_SETTLE_USDC_TOOL } from "./delegated-recovery-plugin.ts";
import { ExactPaymentDenied, paymentCommitmentMemo, verifyExactPaymentAuthorization, type ResolvedUsdcRecoveryState } from "./exact-payment-authorization.ts";

/** Read-only check of all existing preparation tombstones. No reservation,
 * release, refresh, expiry, signing or submission occurs in this module. */
export const PAYMENT_TOMBSTONES_MATCH_LUA = `
if #KEYS ~= 3 then return 0 end
for _, key in ipairs(KEYS) do
  if redis.call('GET', key) ~= ARGV[1] then return 0 end
end
return 1
`;
export interface PaymentTombstoneReader {
  matches(keys: string[], fingerprint: string): Promise<boolean>;
}
export class RedisPaymentTombstoneReader implements PaymentTombstoneReader {
  async matches(keys: string[], fingerprint: string): Promise<boolean> {
    try { return await getRedis().eval(PAYMENT_TOMBSTONES_MATCH_LUA, keys, [fingerprint]) === 1; }
    catch { return false; }
  }
}

export type ExternalSigningState = {
  state: ResolvedUsdcRecoveryState;
  /** Current native executor key, resolved by the trusted server, never wallet input. */
  executor: { accountId: string; publicKey: string; resolvedAtMs: number };
};
export type ExternalSigningValidationArgs = {
  phase: "BEFORE_SIGN" | "BEFORE_SUBMIT";
  operationId: string;
  transactionBytesBase64: string;
  paymentAuthorization: { signatureHex: string };
  /** Mandatory reviewed canonical resolver dependency; no demo fallback exists. */
  resolveCurrent: (operationId: string) => Promise<ExternalSigningState | null>;
  /** Trusted dependency/test seam; production defaults to read-only Redis Lua. */
  tombstones?: PaymentTombstoneReader;
  now?: () => number;
};
export type ExternalSigningValidationResult =
  | { ok: false; reason: string; transactionBytesProduced: false }
  | { ok: true; kind: "VALIDATION_ONLY"; phase: "BEFORE_SIGN" | "BEFORE_SUBMIT";
      operationId: string; transactionId: string; transactionBytesBase64: string;
      transactionBytesSha256: string; observedAtMs: number; validUntilMs: number;
      executorAccountId: string; executorPublicKey: string;
      signedByThisModule: false; submitted: false; executionPermit: false };

function requireValid(value: boolean, reason: string): asserts value {
  if (!value) throw new ExactPaymentDenied(reason);
}
function bytes(input: unknown): Buffer {
  requireValid(typeof input === "string" && input.length > 0 && input.length <= 32768 &&
    input.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(input), "TRANSACTION_BYTES_INVALID");
  const decoded = Buffer.from(input, "base64");
  requireValid(decoded.toString("base64") === input, "TRANSACTION_BYTES_INVALID");
  return decoded;
}
function facts(value: ExternalSigningState) {
  const { resolvedAtMs: _stateTime, ...state } = value.state;
  const { resolvedAtMs: _keyTime, ...executor } = value.executor;
  return { state, executor };
}

/** Validates a prepared exact body before an external signer and its returned
 * fully signed body before a later caller may submit. It does not call either.
 * Repeated validation is allowed; this is NOT an operation claim, effect fence,
 * execution permit, receipt, or consensus lock. Those remain caller duties. */
export async function validateExternalRecoverySigning(args: ExternalSigningValidationArgs): Promise<ExternalSigningValidationResult> {
  let client: Client | undefined;
  try {
    requireValid(!!args && (args.phase === "BEFORE_SIGN" || args.phase === "BEFORE_SUBMIT") &&
      typeof args.operationId === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(args.operationId) &&
      typeof args.resolveCurrent === "function", "SIGNING_CONTEXT_REQUIRED");
    const phase = args.phase, operationId = args.operationId;
    const suppliedBytes = bytes(args.transactionBytesBase64);
    const signatureHex = args.paymentAuthorization?.signatureHex;
    const resolveCurrent = args.resolveCurrent, now = args.now ?? Date.now;
    const reader = args.tombstones ?? new RedisPaymentTombstoneReader();
    // Capture callback identity so mutation of an injected object cannot change it mid-check.
    const match = reader.matches.bind(reader);
    const initial = structuredClone(await resolveCurrent(operationId));
    requireValid(initial !== null, "EXECUTION_STATE_REQUIRED");
    const start = now();
    const verified = verifyExactPaymentAuthorization(initial.state, operationId, signatureHex, start);
    const c = verified.commitment;
    const executorKey = PublicKey.fromString(initial.executor.publicKey);
    const fundingKey = PublicKey.fromString(verified.publicKey);
    requireValid(initial.executor.accountId === c.transactionFeePayerAccountId &&
      executorKey.toString() !== fundingKey.toString(), "EXECUTOR_KEY_INVALID");
    const validUntilMs = Math.min(initial.state.resolvedAtMs + 5000, initial.executor.resolvedAtMs + 5000,
      c.expiresAtMs, initial.state.delegation.expiresAtMs, initial.state.providerPolicy.validUntilMs, initial.state.quote.expiresAtMs);
    const freshness = () => {
      const time = now();
      requireValid(Number.isSafeInteger(initial.executor.resolvedAtMs) && initial.executor.resolvedAtMs >= 0 &&
        Number.isSafeInteger(time) && time >= start && time >= initial.executor.resolvedAtMs &&
        time >= initial.state.resolvedAtMs && time < validUntilMs, "SIGNING_STATE_STALE");
      return time;
    };
    freshness();
    const expected = verified.unsignedTransaction;
    const decoded = Transaction.fromBytes(suppliedBytes);
    const maps = decoded.getSignatures().getFlatSignatureList();
    requireValid(maps.length === 1, "SIGNATURE_SET_INVALID");
    if (phase === "BEFORE_SIGN") {
      requireValid(maps[0].size === 0, "UNSIGNED_PROPOSAL_REQUIRED");
      requireValid(Buffer.from(expected.toBytes()).equals(suppliedBytes), "EXACT_BODY_MISMATCH");
      expected.addSignature(fundingKey, Buffer.from(signatureHex, "hex"));
    } else {
      requireValid(maps[0].size === 2 && maps[0].get(fundingKey) !== null && maps[0].get(executorKey) !== null, "SIGNATURE_SET_INVALID");
      requireValid(Buffer.from(maps[0].get(fundingKey)!).toString("hex") === signatureHex, "PAYMENT_SIGNATURE_MISMATCH");
      // Reconstruct the complete expected wire transaction, preserving signature
      // order only. Comparing original bytes refuses changed/extra body fields,
      // extra nodes/chunks, duplicate or unknown signatures and parser loss.
      for (const [key, signature] of Array.from(maps[0])) {
        requireValid(signature.length === 64, "SIGNATURE_SET_INVALID");
        expected.addSignature(key, signature);
      }
      requireValid(Buffer.from(expected.toBytes()).equals(suppliedBytes), "EXACT_BODY_MISMATCH");
      requireValid(fundingKey.verifyTransaction(expected) && executorKey.verifyTransaction(expected), "NATIVE_SIGNATURE_INVALID");
    }
    const params = {
      tokenId: c.bookingTokenId, serial: c.serial, ownerAccountId: c.holderAccountId,
      spenderAccountId: c.transactionFeePayerAccountId, receiverAccountId: c.receiverAccountId,
      settlementTokenId: c.settlementTokenId, settlementAmountAtomicUnits: verified.sellerNetAtomicUnits,
      settlementRecipientAccountId: c.settlementRecipientAccountId, settlementDecimals: c.settlementDecimals,
    };
    client = Client.forTestnet(); // Local SDK policy context only: no operator or network calls.
    const recheck = async () => {
      freshness();
      const current = structuredClone(await resolveCurrent(operationId));
      freshness();
      requireValid(current !== null && isDeepStrictEqual(facts(current), facts(initial)), "SIGNING_STATE_CHANGED");
      verifyExactPaymentAuthorization(current.state, operationId, signatureHex, now());
      requireValid(Number.isSafeInteger(current.executor.resolvedAtMs) && current.executor.resolvedAtMs >= 0 &&
        current.executor.resolvedAtMs <= now() && now() - current.executor.resolvedAtMs < 5000, "EXECUTOR_STATE_STALE");
      // Re-run the full HAK holder policy. Its legacy-named reserve hook performs
      // ONLY a read of the three already-bound tombstones; it cannot create one.
      const policy = new BookingRightDelegationPolicy(current.state.delegation, current.state.invocation, {
        reserve: async ({ key }) => {
          const keys = [`ethonline:hedera:payment:v1:operation:${c.operationId}`,
            `ethonline:hedera:payment:v1:commitment:${c.commitmentId}`, key];
          return await match(keys, paymentCommitmentMemo(c)) === true ? "claimed" : "unavailable";
        },
      }, now);
      await policy.preToolExecutionHook({ client: client!, context: { mode: AgentMode.RETURN_BYTES, accountId: c.transactionFeePayerAccountId }, rawParams: params }, YOURTURN_DELEGATED_RECOVERY_SETTLE_USDC_TOOL);
      requireValid(policy.lastDecision?.outcome === "ALLOW", "HOLDER_POLICY_DENIED");
      freshness();
      const afterRead = structuredClone(await resolveCurrent(operationId));
      freshness();
      requireValid(afterRead !== null && isDeepStrictEqual(facts(afterRead), facts(initial)), "SIGNING_STATE_CHANGED");
      verifyExactPaymentAuthorization(afterRead.state, operationId, signatureHex, now());
      requireValid(Number.isSafeInteger(afterRead.executor.resolvedAtMs) && afterRead.executor.resolvedAtMs >= 0 &&
        afterRead.executor.resolvedAtMs <= now() && now() - afterRead.executor.resolvedAtMs < 5000, "EXECUTOR_STATE_STALE");
    };
    await recheck();
    // A second complete pass detects observed tombstone/authority changes across
    // the first pass. Persistent records are not released or rewritten here.
    await recheck();
    const output = Buffer.from(expected.toBytes());
    const observedAtMs = freshness();
    return { ok: true, kind: "VALIDATION_ONLY", phase, operationId, transactionId: c.transactionId,
      transactionBytesBase64: output.toString("base64"), transactionBytesSha256: createHash("sha256").update(output).digest("hex"),
      observedAtMs, validUntilMs, executorAccountId: initial.executor.accountId, executorPublicKey: executorKey.toString(),
      signedByThisModule: false, submitted: false, executionPermit: false };
  } catch (error) {
    return { ok: false, reason: error instanceof ExactPaymentDenied ? error.reason :
      error instanceof BookingRightDelegationPolicyError ? error.decision.reason : "SIGNING_VALIDATION_FAILED", transactionBytesProduced: false };
  } finally { client?.close(); }
}
