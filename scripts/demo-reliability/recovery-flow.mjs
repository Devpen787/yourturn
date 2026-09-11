/**
 * Shared, parameterised recovery flow used by the acceptance tests.
 *
 * EVIDENCE CLASS: FIXTURE / LOCAL.
 * Substitutes are named explicitly wherever they replace a real system:
 *   - `revalidateMutableAuthority` is a NO-OP callback, not real booking/policy revalidation;
 *   - the World step here is NONCE BOOKKEEPING ONLY, not cryptographic verification
 *     (see world-verifier-local.mjs for the real verifier's negative path);
 *   - holder/receipt transitions are assigned in-process AFTER unsigned, unsubmitted
 *     transaction construction. No Hedera submission occurs.
 * Nothing here is evidence of a real requester, a real settlement, or a real holder change.
 */
import { Wallet } from "ethers";
import { Transaction, TransferTransaction } from "@hiero-ledger/sdk";
import {
  storePreparedRecoveryMandate,
  activatePreparedRecoveryMandate,
  loadActiveRecoveryMandate,
} from "../../lib/ledger/recovery-mandate-state.ts";
import { createRedisRecoveryMandateReplayStore } from "../../lib/ledger/recovery-mandate-replay.ts";
import { buildRecoveryMandateTypedData } from "../../lib/ledger/recovery-mandate.ts";
import { preparePolicyAuthorizedUsdcRecovery } from "../../lib/hedera-agent-kit/policy-authorized-usdc-recovery.ts";
import {
  HEDERA_TESTNET_USDC_TOKEN_ID,
  HEDERA_USDC_DECIMALS,
  HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS,
  validateAtomicUsdcRecoveryTransaction,
} from "../../lib/hedera-agent-kit/usdc-recovery-semantics.ts";

export const TOKEN = "0.0.2001";
export const MAYA = "0.0.1001";
export const SPENDER = "0.0.1002";
export const BOB = "0.0.1003";
export const AGENT = "0.0.1004";
export const POLICY_ID = "studio-a-friday-yoga-v1";
export const USDC_32 = "32000000";
export const USDC_45 = "45000000";

/**
 * DETERMINISTIC TEST DEPENDENCY — not a product component.
 *
 * The current Security-cleared loader requires a live booking-authority
 * revalidator and deliberately rejects its absence. Supplying a no-op here
 * satisfies the contract for deterministic offline tests; it performs NO real
 * holder/status/provider-policy/listing revalidation and is not evidence that
 * revalidation occurs. The guard itself is never weakened or bypassed — see the
 * missing-context rejection assertions in assertGuardedLoaderRejectsMissingContext().
 */
export const deterministicRevalidator = async () => {};

export const quiet = () => process.env.DR_QUIET === "1";
export const say = (tag, msg) => { if (!quiet()) console.log(`  [${tag}] ${msg}`); };

/** NOT World verification. Pure one-shot bookkeeping, named so it cannot be misread. */
export function requesterNonceLedger(redis) {
  return {
    async consumeRequesterNonce(nonce) {
      return (await redis.set(`bookedrights:world-agentkit:nonce:${nonce}`, "1", { nx: true })) === "OK";
    },
  };
}

export function hederaNonceStore(redis) {
  return {
    async reserve({ key, fingerprint }) {
      const full = `ethonline:hedera:booking-right-nonce:${key}`;
      const existing = await redis.get(full);
      if (existing == null) { await redis.set(full, fingerprint); return "claimed"; }
      return existing === fingerprint ? "duplicate" : "conflict";
    },
  };
}

export function buildMandate({ signer, mandateId, mandateNonce, serial, nowS, expiresAt }) {
  return {
    mandateId, ownerId: "maya-keller", ledgerSignerAddress: signer.address,
    agentId: "yourturn-recovery-agent-1", bookingTokenId: TOKEN, bookingSerial: BigInt(serial),
    allowedAction: "RECOVER",
    minimumRecoveryAtomicUnits: BigInt(HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS),
    settlementAsset: HEDERA_TESTNET_USDC_TOKEN_ID,
    expiresAt, nonce: mandateNonce, cancellationAllowed: false, issuedAt: nowS - 60n,
  };
}

export function projectToDelegation(m) {
  return {
    delegationId: m.mandateId, delegatedAgentAccountId: AGENT, spenderAccountId: SPENDER,
    tokenId: m.bookingTokenId, serial: Number(m.bookingSerial), holderAccountId: MAYA,
    allowedActions: [m.allowedAction],
    minimumRecovery: {
      asset: { kind: "HTS", tokenId: m.settlementAsset },
      atomicUnits: m.minimumRecoveryAtomicUnits.toString(),
    },
    expiresAtMs: Number(m.expiresAt) * 1000, // seconds -> milliseconds
    cancellationAllowed: m.cancellationAllowed, providerPolicyId: POLICY_ID, revokedAtMs: null,
  };
}

/**
 * Runs one authorization + policy evaluation cycle.
 * `identities` MUST be fresh for a new demonstration and reused only to test replay.
 */
export async function runRecoveryCycle({ redis, appState, signer, identities, tag, nowS }) {
  const { mandateId, mandateNonce, requesterNonce, execNonce32, execNonce45, serial } = identities;
  const nowMs = Number(nowS) * 1000;
  const expiresAt = nowS + 86_400n;

  const mandate = buildMandate({ signer, mandateId, mandateNonce, serial, nowS, expiresAt });
  await storePreparedRecoveryMandate({ store: redis, mandate, ownerId: mandate.ownerId, nowUnixSeconds: nowS });
  say(tag, `prepared mandate ${mandateId} (serial ${serial})`);

  const typed = buildRecoveryMandateTypedData(mandate);
  const signature = await signer.signTypedData(typed.domain, typed.types, typed.value);
  await activatePreparedRecoveryMandate({
    store: redis, authorityBoundaryStore: redis,
    replayStore: createRedisRecoveryMandateReplayStore(redis),
    mandateId, ownerId: mandate.ownerId, signature,
    revalidateMutableAuthority: deterministicRevalidator,
    nowUnixSeconds: nowS,
  });
  say(tag, "mandate ACTIVE");

  // Current guarded contract: store + authorityBoundaryStore + revalidateMutableAuthority.
  const active = await loadActiveRecoveryMandate({
    store: redis,
    authorityBoundaryStore: redis,
    mandateId,
    ownerId: mandate.ownerId,
    revalidateMutableAuthority: deterministicRevalidator,
  });
  if (!active?.mandate) throw new Error("active_mandate_not_readable");

  if (!(await requesterNonceLedger(redis).consumeRequesterNonce(requesterNonce))) {
    throw new Error("requester_nonce_already_consumed");
  }
  say(tag, "requester nonce consumed (NOT cryptographic verification)");

  const delegation = projectToDelegation(mandate);
  const store = hederaNonceStore(redis);
  const inv = (units, nonce) => ({
    agentAccountId: AGENT, currentHolderAccountId: MAYA, action: "RECOVER", nonce,
    providerPolicy: { id: POLICY_ID, state: "ALLOW" },
    recovery: { asset: { kind: "HTS", tokenId: HEDERA_TESTNET_USDC_TOKEN_ID }, atomicUnits: units },
    receiverAccountId: BOB,
  });

  const blocked = await preparePolicyAuthorizedUsdcRecovery({ delegation, invocation: inv(USDC_32, execNonce32), nonceStore: store, now: () => nowMs });
  if (blocked.ok !== false || blocked.transactionBytesProduced !== false) throw new Error("32_usdc_not_refused");
  if (blocked.decision.reason !== "BELOW_MINIMUM_RECOVERY") throw new Error(`32_usdc_reason:${blocked.decision.reason}`);
  say(tag, `32 USDC -> ${blocked.decision.outcome}/${blocked.decision.reason}`);

  const allowed = await preparePolicyAuthorizedUsdcRecovery({ delegation, invocation: inv(USDC_45, execNonce45), nonceStore: store, now: () => nowMs });
  if (allowed.ok !== true) throw new Error(`45_usdc_refused:${allowed.decision.reason}`);
  say(tag, `45 USDC -> ${allowed.decision.outcome}`);

  const decoded = Transaction.fromBytes(Buffer.from(allowed.envelope.bytesBase64, "base64"));
  if (!(decoded instanceof TransferTransaction)) throw new Error("not_transfer_transaction");
  validateAtomicUsdcRecoveryTransaction(decoded, {
    bookingTokenId: TOKEN, serial, holderAccountId: MAYA, spenderAccountId: SPENDER,
    receiverAccountId: BOB, settlementTokenId: HEDERA_TESTNET_USDC_TOKEN_ID,
    settlementAmountAtomicUnits: USDC_45, settlementRecipientAccountId: MAYA,
    settlementDecimals: HEDERA_USDC_DECIMALS,
  });
  if (allowed.envelope.signed !== false || allowed.envelope.submitted !== false) throw new Error("unexpected_signed_or_submitted");
  say(tag, "bytes valid, unsigned/unsubmitted");

  // SUBSTITUTE: in-process product-state assignment. No submission occurred.
  appState.slots = appState.slots.map((s) => (s.serial === serial ? { ...s, holder: "bob" } : s));
  appState.recoveryReceipts.push({ serial, recoveredAtomicUnits: USDC_45, to: MAYA, newHolder: "bob" });
  say(tag, `holder Maya -> Bob on serial ${serial}`);
  return { mandate, signature, envelope: allowed.envelope };
}

export const freshSigner = () => Wallet.createRandom();
export function seedAppState(firstSerial = 7) {
  const slotsSeed = [{ slotId: "friday-yoga", holder: "maya" }];
  return {
    slotsSeed, nextSerial: firstSerial + slotsSeed.length, // next mint starts after the seeded serials
    slots: slotsSeed.map((s, i) => ({ ...s, serial: firstSerial + i, holder: "maya" })),
    listings: [], automationProofs: [], recoveryReceipts: [],
  };
}


/**
 * Guard-integrity coverage. The current loader MUST reject a caller that omits
 * the authority boundary store or the revalidator. These assertions exist so the
 * deterministic substitute above can never be mistaken for a weakened guard: if
 * someone relaxes the loader, this fails.
 */
export async function assertGuardedLoaderRejectsMissingContext({ redis, mandateId, ownerId }) {
  const results = [];
  const expectReject = async (label, input) => {
    try {
      await loadActiveRecoveryMandate(input);
      results.push({ label, rejected: false, detail: "loader ACCEPTED missing context" });
    } catch (e) {
      results.push({ label, rejected: true, detail: e.message });
    }
  };

  await expectReject("missing authorityBoundaryStore", {
    store: redis, mandateId, ownerId, revalidateMutableAuthority: deterministicRevalidator,
  });
  await expectReject("missing revalidateMutableAuthority", {
    store: redis, authorityBoundaryStore: redis, mandateId, ownerId,
  });
  await expectReject("revalidator is not a function", {
    store: redis, authorityBoundaryStore: redis, mandateId, ownerId,
    revalidateMutableAuthority: "not-a-function",
  });
  return results;
}
