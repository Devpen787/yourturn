import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { createPublicEnrollmentRegistry, type PublicEnrollmentManifest } from "../policy/public-enrollment-registry.ts";
import { loadPublishedProviderPolicy } from "../policy/published-provider-policy.ts";
import { readCurrentRecoveryChain, type CurrentChainReaderOptions } from "./current-chain-reader.ts";
import { paymentCommitmentSchema, type ResolvedUsdcRecoveryState } from "./exact-payment-authorization.ts";
import { resolveRecoveryRoyalty } from "./recovery-royalty.ts";

const INT64 = BigInt("9223372036854775807");
const label = z.string().regex(/^[A-Za-z0-9._:@-]{1,128}$/);
const operationId = z.string().regex(/^[A-Za-z0-9._:-]{1,128}$/);
const entity = z.string().regex(/^0\.0\.[1-9][0-9]{0,18}$/).refine(v => BigInt(v.slice(4)) <= INT64);
const units = z.string().regex(/^[1-9][0-9]{0,18}$/).refine(v => BigInt(v) <= INT64);
const version = z.string().regex(/^[1-9][0-9]{0,18}$/).refine(v => BigInt(v) <= INT64);
const time = z.number().int().positive().max(8640000000000000);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const projectionSchema = z.object({
  authority: z.literal("ledger-recovery-mandate"), mandateId: label, mandateDigest: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  mandateGeneration: z.number().int().positive().safe(), bookingAuthorityVersion: z.number().int().nonnegative().safe().refine(v => v % 2 === 0),
  ownerId: label, holderAccountId: entity, bookingTokenId: entity, bookingSerial: z.number().int().positive().safe(),
  internalAgentId: label, worldRequester: z.string().regex(/^0x[0-9a-f]{40}$/).refine(v => v !== "0x" + "0".repeat(40)),
  hederaExecutorAccountId: entity, bindingVersion: version, resourceUri: z.string().max(2048), operationId,
  signedAction: z.literal("resale"), executionAction: z.literal("RECOVER"), minimumRecoveryAtomicUnits: units,
  settlementTokenId: z.literal("0.0.429274"), settlementDecimals: z.literal(6), expiresAtUnixSeconds: units,
  expiresAtMs: time, cancellationAllowed: z.literal(false),
}).strict();
const quoteSchema = z.object({ id: operationId, hash, expiresAtMs: time }).strict();
const paymentRecordSchema = z.object({
  schemaVersion: z.literal(1), version, ownerId: label, operationId, providerId: operationId,
  quote: quoteSchema, commitment: paymentCommitmentSchema, revokedAtMs: time.nullable(),
}).strict();
const eligibilitySchema = z.object({
  schemaVersion: z.literal(1), version, ownerId: label, operationId,
  tokenId: entity, serial: z.number().int().positive().safe(), holderAccountId: entity, buyerAccountId: entity,
  status: z.literal("HELD"), acquirerEligible: z.literal(true), validUntilMs: time,
}).strict();
export type CurrentRecoveryPaymentRecord = z.infer<typeof paymentRecordSchema>;
export type CurrentRecoveryEligibility = z.infer<typeof eligibilitySchema>;
export class CanonicalRecoveryStateDenied extends Error {
  constructor(public readonly code: string) { super(code); this.name = "CanonicalRecoveryStateDenied"; }
}
function requireState(ok: unknown, code: string): asserts ok { if (!ok) throw new CanonicalRecoveryStateDenied(code); }
function freeze<T>(v: T): T {
  if (v && typeof v === "object") { for (const item of Object.values(v)) freeze(item); Object.freeze(v); }
  return v;
}
function stableJson(v: unknown): string {
  if (Array.isArray(v)) return "[" + v.map(stableJson).join(",") + "]";
  if (v !== null && typeof v === "object") return "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + stableJson((v as Record<string, unknown>)[k])).join(",") + "}";
  return JSON.stringify(v);
}

/** Trusted server construction only. This factory has no HTTP/config loader or
 * fallback records. Callback results are independently schema/scope checked;
 * callbacks remain responsible for real current authority/lifecycle reads.
 * A guarded owned-operation callback must retain its captured stable projection
 * fields while validating the actual owned odd version, never disguise it.
 */
export function createCanonicalRecoveryStateResolver(dependencies: {
  publicEnrollmentManifest: PublicEnrollmentManifest;
  resolveCanonicalAuthority: (operationId: string) => Promise<unknown>;
  readCurrentPayment: (operationId: string) => Promise<unknown>;
  readCurrentEligibility: (operationId: string) => Promise<unknown>;
  /** Test seams only. Runtime uses production Redis and fixed-origin fetch. */
  policyStore?: Parameters<typeof loadPublishedProviderPolicy>[0]["store"];
  chainOptions?: CurrentChainReaderOptions;
  now?: () => number;
}) {
  requireState(dependencies && [dependencies.resolveCanonicalAuthority, dependencies.readCurrentPayment, dependencies.readCurrentEligibility].every(v => typeof v === "function"), "TRUSTED_DEPENDENCIES_REQUIRED");
  const { resolveCanonicalAuthority, readCurrentPayment, readCurrentEligibility, policyStore } = dependencies;
  const now = dependencies.now ?? Date.now;
  const registry = createPublicEnrollmentRegistry(dependencies.publicEnrollmentManifest, { now });
  const chainOptions = { fetch: dependencies.chainOptions?.fetch, now };
  return Object.freeze({
    async resolve(rawOperationId: string) {
      const selectedOperationId = operationId.parse(rawOperationId), started = now();
      requireState(Number.isSafeInteger(started) && started > 0, "INVALID_CLOCK");
      const current = () => { const n = now(); requireState(Number.isSafeInteger(n) && n >= started && n - started <= 5000, "RESOLUTION_WINDOW_EXPIRED"); return n; };
      let timeout: ReturnType<typeof setTimeout>;
      const expired = new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new CanonicalRecoveryStateDenied("RESOLUTION_TIMEOUT")), 5000); });
      // Callback timeouts cannot cancel third-party work; this resolver is read-only
      // and no late result is returned after the bounded outer promise rejects.
      const work = async () => {
        async function control() {
          current();
          const [rawAuthority, rawPayment, rawEligibility] = await Promise.all([
            resolveCanonicalAuthority(selectedOperationId).then(v => structuredClone(v)),
            readCurrentPayment(selectedOperationId).then(v => structuredClone(v)),
            readCurrentEligibility(selectedOperationId).then(v => structuredClone(v)),
          ]);
          const authority = projectionSchema.parse(rawAuthority), payment = paymentRecordSchema.parse(rawPayment), eligibility = eligibilitySchema.parse(rawEligibility);
          const c = payment.commitment;
          requireState(c.domain === "yourturn:hedera:testnet:exact-payment:v2", "V2_PAYMENT_REQUIRED");
          requireState(authority.operationId === selectedOperationId && payment.operationId === selectedOperationId && c.operationId === selectedOperationId && eligibility.operationId === selectedOperationId, "OPERATION_MISMATCH");
          requireState(BigInt(authority.expiresAtUnixSeconds) * BigInt(1000) === BigInt(authority.expiresAtMs), "AUTHORITY_TIME_MISMATCH");
          const agent = await registry.resolveAgent({ ownerId: authority.ownerId, internalAgentId: authority.internalAgentId });
          requireState(agent, "AGENT_ENROLLMENT_REQUIRED");
          requireState(agent.version === authority.bindingVersion && agent.holderAccountId === authority.holderAccountId && agent.worldRequester === authority.worldRequester && agent.hederaExecutorAccountId === authority.hederaExecutorAccountId && agent.resourceUri === authority.resourceUri, "AGENT_ENROLLMENT_MISMATCH");
          requireState(payment.ownerId === authority.ownerId && eligibility.ownerId === authority.ownerId && c.delegationId === authority.mandateId && c.bookingTokenId === authority.bookingTokenId && c.serial === authority.bookingSerial && eligibility.tokenId === authority.bookingTokenId && eligibility.serial === authority.bookingSerial, "AUTHORITY_SCOPE_MISMATCH");
          requireState(c.holderAccountId === authority.holderAccountId && eligibility.holderAccountId === authority.holderAccountId && c.delegatedAgentAccountId === authority.hederaExecutorAccountId && c.transactionFeePayerAccountId === authority.hederaExecutorAccountId && c.settlementRecipientAccountId === authority.holderAccountId, "AUTHORITY_ROLE_MISMATCH");
          requireState(c.settlementSourceAccountId === c.receiverAccountId && eligibility.buyerAccountId === c.receiverAccountId && new Set([c.holderAccountId, c.receiverAccountId, c.delegatedAgentAccountId]).size === 3, "BOB_SELF_FUNDING_REQUIRED");
          requireState(c.quoteId === payment.quote.id && c.quoteHash === payment.quote.hash && c.providerPolicyId === payment.providerId && payment.revokedAtMs === null, "PAYMENT_RECORD_MISMATCH");
          const policy = await loadPublishedProviderPolicy({ scope: { providerId: payment.providerId, tokenId: authority.bookingTokenId, serial: authority.bookingSerial }, resolveEnrollment: registry.resolveProvider, store: policyStore, now });
          requireState(policy.state === "ALLOW" && c.providerPolicyVersion === String(policy.version), "PROVIDER_POLICY_DENIED_OR_CHANGED");
          const n = current();
          const validUntilMs = Math.min(policy.validUntilMs, policy.transferCutoffMs);
          requireState(n < Math.min(authority.expiresAtMs, eligibility.validUntilMs, payment.quote.expiresAtMs, validUntilMs, c.expiresAtMs, agent.expiresAtMs), "CURRENT_FACTS_EXPIRED");
          const startMs = Number(c.transactionId.split("@")[1].split(".")[0]) * 1000;
          requireState(Number.isSafeInteger(startMs) && c.transactionId.split("@")[0] === c.transactionFeePayerAccountId && startMs <= n && startMs + c.transactionValidDurationSeconds * 1000 === c.expiresAtMs && c.expiresAtMs <= Math.min(authority.expiresAtMs, eligibility.validUntilMs, payment.quote.expiresAtMs, validUntilMs, agent.expiresAtMs), "PAYMENT_VALIDITY_MISMATCH");
          return { authority, payment, eligibility, agent, policy, validUntilMs };
        }
        const first = await control(), a = first.authority, c = first.payment.commitment;
        const chain = await readCurrentRecoveryChain({ bookingTokenId: a.bookingTokenId, serial: a.bookingSerial, holderAccountId: a.holderAccountId,
          fundingAccountId: c.settlementSourceAccountId, receiverAccountId: c.receiverAccountId, executorAccountId: a.hederaExecutorAccountId,
          settlementTokenId: a.settlementTokenId, requiredFundingAtomicUnits: c.settlementAmountAtomicUnits }, chainOptions);
        requireState(chain.fundingAccount.publicKey && chain.executor.publicKey, "CURRENT_NATIVE_PUBLIC_KEYS_REQUIRED");
        const economics = resolveRecoveryRoyalty({ grossAtomicUnits: c.settlementAmountAtomicUnits, holderAccountId: a.holderAccountId, buyerAccountId: c.receiverAccountId,
          bookingTokenId: a.bookingTokenId, policy: first.policy.royalty, metadata: chain.tokens.booking.feeMetadata });
        requireState(c.domain === "yourturn:hedera:testnet:exact-payment:v2" && isDeepStrictEqual(c.economics, economics), "PAYMENT_ECONOMICS_MISMATCH");
        requireState(BigInt(economics.sellerNetAtomicUnits) >= BigInt(a.minimumRecoveryAtomicUnits) && (first.policy.minimumRecoveryAtomicUnits === null || BigInt(economics.sellerNetAtomicUnits) >= BigInt(first.policy.minimumRecoveryAtomicUnits)), "SELLER_NET_BELOW_MINIMUM");
        const final = await control();
        requireState(isDeepStrictEqual(first, final), "CURRENT_CONTROL_FACTS_CHANGED");
        const resolvedAtMs = current();
        const state: ResolvedUsdcRecoveryState = {
          resolvedAtMs,
          delegation: { delegationId: a.mandateId, delegatedAgentAccountId: a.hederaExecutorAccountId, spenderAccountId: a.hederaExecutorAccountId,
            tokenId: a.bookingTokenId, serial: a.bookingSerial, holderAccountId: a.holderAccountId, allowedActions: ["RECOVER"],
            minimumRecovery: { asset: { kind: "HTS", tokenId: a.settlementTokenId }, atomicUnits: a.minimumRecoveryAtomicUnits }, expiresAtMs: a.expiresAtMs,
            cancellationAllowed: false, providerPolicyId: first.policy.providerId, revokedAtMs: null },
          invocation: { agentAccountId: a.hederaExecutorAccountId, currentHolderAccountId: chain.bookingAllowance.ownerAccountId, action: "RECOVER", nonce: selectedOperationId,
            providerPolicy: { id: first.policy.providerId, state: first.policy.state }, recovery: { asset: { kind: "HTS", tokenId: a.settlementTokenId }, atomicUnits: economics.sellerNetAtomicUnits }, receiverAccountId: c.receiverAccountId },
          buyerAccountId: c.receiverAccountId, commitment: c, quote: first.payment.quote,
          providerPolicy: { id: first.policy.providerId, version: String(first.policy.version), state: first.policy.state, validUntilMs: first.validUntilMs, minimumRecoveryAtomicUnits: first.policy.minimumRecoveryAtomicUnits, royalty: first.policy.royalty },
          fundingAccount: { accountId: chain.fundingAccount.accountId, publicKey: chain.fundingAccount.publicKey, tokenId: a.settlementTokenId, decimals: 6, availableAtomicUnits: chain.relationships.fundingUsdc.balanceAtomicUnits },
          tokens: { booking: { tokenId: a.bookingTokenId, customFeeCount: chain.tokens.booking.customFeeCount, feeScheduleKey: null, feeMetadata: chain.tokens.booking.feeMetadata },
            settlement: { tokenId: a.settlementTokenId, customFeeCount: chain.tokens.settlement.customFeeCount, feeScheduleKey: null } },
          bookingAllowance: chain.bookingAllowance, paymentRevokedAtMs: first.payment.revokedAtMs,
        };
        const { resolvedAtMs: _timestamp, ...stableState } = state;
        const intent = { domain: "yourturn:canonical-recovery-intent:v1", authority: a, agentEnrollment: first.agent, providerPolicy: first.policy,
          paymentRecord: first.payment, eligibility: first.eligibility, state: stableState, executorPublicKey: chain.executor.publicKey };
        const intentHash = createHash("sha256").update(stableJson(intent)).digest("hex");
        current();
        return freeze({ state, intent, intentHash, executorPublicKey: chain.executor.publicKey,
          evidence: { source: chain.kind, consensusSynchronous: false as const, resolvedAtMs, readStartedAtMs: started,
            chainStartedAtMs: chain.startedAtMs, chainCompletedAtMs: chain.completedAtMs, indexWatermarks: chain.indexWatermarks, observations: chain.observations },
          executionPermission: false as const });
      };
      try { return await Promise.race([work(), expired]); } finally { clearTimeout(timeout!); }
    },
  });
}
