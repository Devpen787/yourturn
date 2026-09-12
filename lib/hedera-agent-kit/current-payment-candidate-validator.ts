import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import {
  resolveCanonicalRecoveryProjection,
  type RecoveryAgentBinding,
} from "../ledger/canonical-recovery-projection.ts";
import {
  createPublicEnrollmentRegistry,
  type PublicEnrollmentManifest,
} from "../policy/public-enrollment-registry.ts";
import { loadPublishedProviderPolicy } from "../policy/published-provider-policy.ts";
import {
  currentPaymentCandidateDigest,
  type AuthenticatedPaymentPublisher,
  type CurrentPaymentCandidateValidation,
} from "./current-payment-record.ts";
import {
  readCurrentRecoveryChain,
  type CurrentChainReaderOptions,
} from "./current-chain-reader.ts";
import type {
  CurrentRecoveryEligibility,
  CurrentRecoveryPaymentRecord,
} from "./canonical-recovery-state.ts";
import { resolveRecoveryRoyalty } from "./recovery-royalty.ts";

const INT64 = BigInt("9223372036854775807");
const label = z.string().regex(/^[A-Za-z0-9._:@-]{1,128}$/);
const operationId = z.string().regex(/^[A-Za-z0-9._:-]{1,128}$/);
const entity = z.string().regex(/^0\.0\.[1-9][0-9]{0,18}$/)
  .refine(value => BigInt(value.slice(4)) <= INT64);
const version = z.string().regex(/^[1-9][0-9]{0,18}$/)
  .refine(value => BigInt(value) <= INT64);
const time = z.number().int().positive().max(8640000000000000);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const eligibilitySchema = z.object({
  schemaVersion: z.literal(1),
  version,
  ownerId: label,
  operationId: z.string().regex(/^[A-Za-z0-9._:-]{1,128}$/),
  tokenId: entity,
  serial: z.number().int().positive().safe(),
  holderAccountId: entity,
  buyerAccountId: entity,
  status: z.literal("HELD"),
  acquirerEligible: z.literal(true),
  validUntilMs: time,
}).strict();
const publisherSchema = z.object({ publisherId: label, ownerId: label }).strict();

type AuthorityInput = Parameters<typeof resolveCanonicalRecoveryProjection>[0]["authority"];
type ProviderStore = Parameters<typeof loadPublishedProviderPolicy>[0]["store"];
type SemanticChainRead = Pick<Awaited<ReturnType<typeof readCurrentRecoveryChain>>,
  "selection" | "fundingAccount" | "holder" | "executor" | "tokens" |
  "bookingAllowance" | "nftModifiedTimestamp" | "relationships">;

export type CurrentPaymentCandidateValidatorDependencies = {
  /** Owner-reviewed server configuration. There is no request-body or env fallback. */
  publicEnrollmentManifest: PublicEnrollmentManifest;
  /** Guarded stable Ledger source, including its mandatory mutable-state revalidation. */
  authority: AuthorityInput;
  /** Server-selected operation identity; never accepted from request authority. */
  operationId: string;
  /** Mandatory current business eligibility source. */
  readCurrentEligibility: (operationId: string) => Promise<unknown>;
  /** Test seams only. Runtime defaults use the production policy store and fixed Mirror origin. */
  policyStore?: ProviderStore;
  chainOptions?: CurrentChainReaderOptions;
  now?: () => number;
};

export class CurrentPaymentCandidateDenied extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "CurrentPaymentCandidateDenied";
  }
}

function requireCandidate(condition: unknown, code: string): asserts condition {
  if (!condition) throw new CurrentPaymentCandidateDenied(code);
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key =>
      `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function semanticChain(read: Awaited<ReturnType<typeof readCurrentRecoveryChain>>): SemanticChainRead {
  const { selection, fundingAccount, holder, executor, tokens, bookingAllowance, nftModifiedTimestamp, relationships } = read;
  return { selection, fundingAccount, holder, executor, tokens, bookingAllowance, nftModifiedTimestamp, relationships };
}

/**
 * Construct the trusted callback consumed by publishCurrentPaymentRecord.
 *
 * This validates only a proposed immutable record. It does not write a record,
 * claim an operation, prepare bytes, grant execution permission, sign, submit,
 * or infer eligibility from public chain state.
 */
export function createCurrentPaymentCandidateValidator(
  dependencies: CurrentPaymentCandidateValidatorDependencies,
) {
  requireCandidate(dependencies && typeof dependencies === "object", "TRUSTED_DEPENDENCIES_REQUIRED");
  requireCandidate(typeof dependencies.readCurrentEligibility === "function", "CURRENT_ELIGIBILITY_READER_REQUIRED");
  requireCandidate(dependencies.authority && typeof dependencies.authority === "object", "GUARDED_LEDGER_AUTHORITY_REQUIRED");
  requireCandidate(typeof dependencies.authority.revalidateMutableAuthority === "function", "GUARDED_LEDGER_AUTHORITY_REQUIRED");

  let manifest: PublicEnrollmentManifest;
  try { manifest = freeze(structuredClone(dependencies.publicEnrollmentManifest)); }
  catch { throw new CurrentPaymentCandidateDenied("PUBLIC_ENROLLMENT_MANIFEST_INVALID"); }
  const now = dependencies.now ?? Date.now;
  requireCandidate(typeof now === "function", "INVALID_CLOCK");
  // Construction validates the complete immutable manifest before any candidate
  // can select an operation, owner, provider, account, or public key.
  const registry = createPublicEnrollmentRegistry(manifest, { now });
  const authority: AuthorityInput = Object.freeze({
    store: dependencies.authority.store,
    authorityBoundaryStore: dependencies.authority.authorityBoundaryStore,
    mandateId: label.parse(dependencies.authority.mandateId),
    ownerId: label.parse(dependencies.authority.ownerId),
    revalidateMutableAuthority: dependencies.authority.revalidateMutableAuthority,
  });
  const readEligibility = dependencies.readCurrentEligibility;
  const selectedOperationId = operationId.parse(dependencies.operationId);
  const policyStore = dependencies.policyStore;
  const chainOptions = { fetch: dependencies.chainOptions?.fetch, now };

  return async function validateCurrentPaymentCandidate(input: {
    publisher: Readonly<AuthenticatedPaymentPublisher>;
    candidate: Readonly<CurrentRecoveryPaymentRecord>;
    candidateDigest: string;
  }): Promise<CurrentPaymentCandidateValidation> {
    const publisher = freeze(publisherSchema.parse(structuredClone(input.publisher)));
    const candidate = freeze(structuredClone(input.candidate)) as CurrentRecoveryPaymentRecord;
    let digest: string;
    try { digest = currentPaymentCandidateDigest(candidate); }
    catch { throw new CurrentPaymentCandidateDenied("PAYMENT_CANDIDATE_INVALID"); }
    requireCandidate(hash.safeParse(input.candidateDigest).success && input.candidateDigest === digest, "PAYMENT_CANDIDATE_DIGEST_MISMATCH");
    requireCandidate(publisher.ownerId === authority.ownerId, "AUTHENTICATED_OWNER_MISMATCH");
    requireCandidate(candidate.operationId === selectedOperationId && candidate.commitment.operationId === selectedOperationId,
      "PAYMENT_OPERATION_MISMATCH");

    const startedAtMs = now();
    requireCandidate(time.safeParse(startedAtMs).success, "INVALID_CLOCK");
    let ended = false;
    let lastObservedAtMs = startedAtMs;
    const current = () => {
      const value = now();
      requireCandidate(!ended && time.safeParse(value).success && value >= lastObservedAtMs && value - startedAtMs < 5000,
        "CANDIDATE_VALIDATION_WINDOW_EXPIRED");
      lastObservedAtMs = value;
      return value;
    };
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        ended = true;
        reject(new CurrentPaymentCandidateDenied("CANDIDATE_VALIDATION_TIMEOUT"));
      }, 5000);
    });

    const work = async () => {
      async function control() {
        const observedAtMs = current();
        const projection = await resolveCanonicalRecoveryProjection({
          authority,
          operationId: selectedOperationId,
          resolveAgentBinding: async (ownerId, internalAgentId): Promise<RecoveryAgentBinding | null> => {
            const enrolled = await registry.resolveAgent({ ownerId, internalAgentId });
            if (!enrolled) return null;
            return {
              version: enrolled.version,
              ownerId: enrolled.ownerId,
              holderAccountId: enrolled.holderAccountId,
              internalAgentId: enrolled.internalAgentId,
              worldRequester: enrolled.worldRequester,
              hederaExecutorAccountId: enrolled.hederaExecutorAccountId,
              resourceUri: enrolled.resourceUri,
            };
          },
        });
        current();
        const providerEnrollment = manifest.records.find(record =>
          record.kind === "provider" && record.tokenId === projection.bookingTokenId && record.serial === projection.bookingSerial
        );
        requireCandidate(providerEnrollment?.kind === "provider", "PROVIDER_ENROLLMENT_REQUIRED");
        const [agentEnrollment, rawEligibility] = await Promise.all([
          registry.resolveAgent({ ownerId: projection.ownerId, internalAgentId: projection.internalAgentId }),
          readEligibility(projection.operationId).then(value => structuredClone(value)),
        ]);
        requireCandidate(agentEnrollment, "AGENT_ENROLLMENT_REQUIRED");
        const eligibility = eligibilitySchema.parse(rawEligibility) as CurrentRecoveryEligibility;
        const policy = await loadPublishedProviderPolicy({
          scope: {
            providerId: providerEnrollment.providerId,
            tokenId: projection.bookingTokenId,
            serial: projection.bookingSerial,
          },
          resolveEnrollment: registry.resolveProvider,
          store: policyStore,
          now,
        });
        const c = candidate.commitment;
        requireCandidate(candidate.ownerId === projection.ownerId && publisher.ownerId === projection.ownerId,
          "PAYMENT_OWNER_MISMATCH");
        requireCandidate(publisher.publisherId === providerEnrollment.issuerId,
          "PAYMENT_PUBLISHER_NOT_PROVIDER_ISSUER");
        requireCandidate(candidate.operationId === projection.operationId && c.operationId === projection.operationId,
          "PAYMENT_OPERATION_MISMATCH");
        requireCandidate(candidate.providerId === providerEnrollment.providerId && c.providerPolicyId === providerEnrollment.providerId &&
          policy.providerId === providerEnrollment.providerId, "PAYMENT_PROVIDER_MISMATCH");
        requireCandidate(candidate.quote.id === c.quoteId && candidate.quote.hash === c.quoteHash,
          "PAYMENT_QUOTE_MISMATCH");
        requireCandidate(c.domain === "yourturn:hedera:testnet:exact-payment:v2" && c.providerPolicyVersion === String(policy.version),
          "CURRENT_V2_PROVIDER_POLICY_REQUIRED");
        requireCandidate(policy.state === "ALLOW", "PROVIDER_POLICY_DENIED");
        requireCandidate(c.delegationId === projection.mandateId && c.bookingTokenId === projection.bookingTokenId &&
          c.serial === projection.bookingSerial, "PAYMENT_BOOKING_OR_MANDATE_MISMATCH");
        requireCandidate(c.holderAccountId === projection.holderAccountId &&
          c.delegatedAgentAccountId === projection.hederaExecutorAccountId &&
          c.transactionFeePayerAccountId === projection.hederaExecutorAccountId &&
          c.settlementRecipientAccountId === projection.holderAccountId,
          "PAYMENT_AUTHORITY_ROLE_MISMATCH");
        requireCandidate(c.settlementSourceAccountId === c.receiverAccountId &&
          new Set([c.holderAccountId, c.receiverAccountId, c.delegatedAgentAccountId]).size === 3,
          "BOB_SELF_FUNDING_REQUIRED");
        requireCandidate(c.settlementTokenId === projection.settlementTokenId && c.settlementDecimals === projection.settlementDecimals,
          "PAYMENT_ASSET_MISMATCH");
        requireCandidate(eligibility.ownerId === projection.ownerId && eligibility.operationId === projection.operationId &&
          eligibility.tokenId === projection.bookingTokenId && eligibility.serial === projection.bookingSerial &&
          eligibility.holderAccountId === projection.holderAccountId && eligibility.buyerAccountId === c.receiverAccountId &&
          eligibility.status === "HELD" && eligibility.acquirerEligible === true,
          "CURRENT_ELIGIBILITY_MISMATCH");

        const transactionMatch = /^0\.0\.([1-9][0-9]{0,18})@([0-9]+)\.([0-9]{9})$/.exec(c.transactionId);
        requireCandidate(transactionMatch && `0.0.${transactionMatch[1]}` === c.transactionFeePayerAccountId &&
          transactionMatch[3] === "000000000", "EXACT_NATIVE_TRANSACTION_START_REQUIRED");
        const startMs = BigInt(transactionMatch![2]) * BigInt(1000);
        requireCandidate(startMs > BigInt(0) && startMs <= BigInt(Number.MAX_SAFE_INTEGER) &&
          Number(startMs) <= observedAtMs &&
          startMs + BigInt(c.transactionValidDurationSeconds) * BigInt(1000) === BigInt(c.expiresAtMs),
          "PAYMENT_VALIDITY_MISMATCH");

        const validUntilMs = Math.min(
          projection.expiresAtMs,
          agentEnrollment.expiresAtMs,
          providerEnrollment.expiresAtMs,
          manifest.expiresAtMs,
          eligibility.validUntilMs,
          policy.transferCutoffMs,
          policy.validUntilMs,
          candidate.quote.expiresAtMs,
          c.expiresAtMs,
        );
        requireCandidate(observedAtMs < validUntilMs && c.expiresAtMs <= validUntilMs,
          "PAYMENT_OR_AUTHORITY_EXPIRES_TOO_SOON");
        return freeze({ projection, agentEnrollment, providerEnrollment, eligibility, policy, validUntilMs });
      }

      const first = await control();
      const c = candidate.commitment;
      const selection = {
        bookingTokenId: first.projection.bookingTokenId,
        serial: first.projection.bookingSerial,
        holderAccountId: first.projection.holderAccountId,
        fundingAccountId: c.settlementSourceAccountId,
        receiverAccountId: c.receiverAccountId,
        executorAccountId: first.projection.hederaExecutorAccountId,
        settlementTokenId: first.projection.settlementTokenId,
        requiredFundingAtomicUnits: c.settlementAmountAtomicUnits,
      };
      const firstChain = await readCurrentRecoveryChain(selection, chainOptions);
      current();
      const secondChain = await readCurrentRecoveryChain(selection, chainOptions);
      current();
      const firstFacts = semanticChain(firstChain), secondFacts = semanticChain(secondChain);
      requireCandidate(isDeepStrictEqual(firstFacts, secondFacts), "CHAIN_FACTS_CHANGED_BETWEEN_READS");
      requireCandidate(secondChain.indexWatermarks.before.indexedAtLeastThroughMs >= firstChain.indexWatermarks.after.indexedAtLeastThroughMs,
        "CHAIN_INDEX_REGRESSED_BETWEEN_READS");
      requireCandidate(firstFacts.fundingAccount.publicKey && firstFacts.executor.publicKey,
        "CURRENT_NATIVE_PUBLIC_KEYS_REQUIRED");
      requireCandidate(firstFacts.fundingAccount.accountId === c.settlementSourceAccountId &&
        firstFacts.executor.accountId === c.transactionFeePayerAccountId,
        "CURRENT_NATIVE_PAYER_MISMATCH");
      requireCandidate(c.domain === "yourturn:hedera:testnet:exact-payment:v2", "V2_PAYMENT_REQUIRED");

      let economics;
      try {
        economics = resolveRecoveryRoyalty({
          grossAtomicUnits: c.settlementAmountAtomicUnits,
          holderAccountId: first.projection.holderAccountId,
          buyerAccountId: c.receiverAccountId,
          bookingTokenId: first.projection.bookingTokenId,
          policy: first.policy.royalty,
          metadata: firstFacts.tokens.booking.feeMetadata,
        });
      } catch {
        throw new CurrentPaymentCandidateDenied("PAYMENT_ROYALTY_POLICY_OR_METADATA_INVALID");
      }
      requireCandidate(isDeepStrictEqual(economics, c.economics), "PAYMENT_ECONOMICS_MISMATCH");
      requireCandidate(BigInt(economics.sellerNetAtomicUnits) >= BigInt(first.projection.minimumRecoveryAtomicUnits) &&
        (first.policy.minimumRecoveryAtomicUnits === null ||
          BigInt(economics.sellerNetAtomicUnits) >= BigInt(first.policy.minimumRecoveryAtomicUnits)),
        "SELLER_NET_BELOW_MINIMUM");

      const final = await control();
      requireCandidate(isDeepStrictEqual(first, final), "CURRENT_CONTROL_FACTS_CHANGED");
      current();
      const authorityFingerprint = createHash("sha256").update(stableJson({
        domain: "yourturn:current-payment-candidate-validation:v1",
        candidateDigest: digest,
        publisher,
        projection: first.projection,
        agentEnrollment: first.agentEnrollment,
        providerEnrollment: first.providerEnrollment,
        providerPolicy: first.policy,
        eligibility: first.eligibility,
        chain: firstFacts,
      })).digest("hex");
      return freeze({ authorityFingerprint, validUntilMs: first.validUntilMs });
    };

    try { return await Promise.race([work(), timeout]); }
    finally { ended = true; clearTimeout(timer!); }
  };
}
