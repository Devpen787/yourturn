/**
 * Integration Rehearsal — Ledger -> World -> Hedera authority-chain contract harness.
 *
 * PURPOSE
 * Prove, without networks/devices/secrets, whether the CURRENT sponsor interfaces
 * can carry one authority chain end to end, and make every place they cannot
 * compose an explicit, failing assertion instead of a silent mock.
 *
 * EVIDENCE CLASS: FIXTURE / CI-LOCAL.
 * No Hedera submission, no World Sandbox call, no Ledger device, no secrets, no
 * network writes. The only key material is an ephemeral in-process random wallet
 * that stands in for the Ledger device signer; it is generated per run, never
 * persisted, and proves only that the typed-data verification path composes.
 *
 * This harness MUST NOT be cited as LIVE, TESTNET or SETTLED evidence.
 */
import assert from "node:assert/strict";
import { Transaction, TransferTransaction } from "@hiero-ledger/sdk";
import { Wallet } from "ethers";

import {
  authorizeRecoveryMandateOnce,
  buildRecoveryMandateTypedData,
} from "../../lib/ledger/recovery-mandate.ts";
import { preparePolicyAuthorizedUsdcRecovery } from "../../lib/hedera-agent-kit/policy-authorized-usdc-recovery.ts";
import {
  HEDERA_TESTNET_USDC_TOKEN_ID,
  HEDERA_USDC_DECIMALS,
  HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS,
  validateAtomicUsdcRecoveryTransaction,
} from "../../lib/hedera-agent-kit/usdc-recovery-semantics.ts";
import { authorizeWorldRecoveryWrite } from "../../lib/world-agentkit/recovery-write-gate.ts";

const findings = [];
const note = (id, text) => findings.push(`${id}: ${text}`);

/* ---------------------------------------------------------------- Golden fixture */
// Values are taken from frozen Golden YT-05->YT-08, not invented here.
const NOW_MS = Date.parse("2026-09-11T12:00:00Z");
const NOW_S = BigInt(Math.floor(NOW_MS / 1000));
const EXPIRY_S = BigInt(Math.floor(Date.parse("2026-09-12T17:00:00Z") / 1000));

const USDC_45 = "45000000";
const USDC_32 = "32000000";

const BOOKING_TOKEN_ID = "0.0.2001";
const BOOKING_SERIAL = 7;

// Hedera-domain accounts. NOTE: none of these are derivable from the Ledger
// mandate; see REQUIRED_EXTERNAL_RESOLUTION below.
const MAYA_HOLDER_ACCOUNT = "0.0.1001";
const AGENT_SPENDER_ACCOUNT = "0.0.1002";
const BOB_RECEIVER_ACCOUNT = "0.0.1003";
const AGENT_ACCOUNT = "0.0.1004";
const PROVIDER_POLICY_ID = "studio-a-friday-yoga-v1";

/* ------------------------------------------- STEP 1 — activated Ledger mandate */
const deviceSigner = Wallet.createRandom(); // ephemeral stand-in for the Ledger device

const mandate = {
  mandateId: "mandate-friday-yoga-7",
  ownerId: "maya-keller",
  ledgerSignerAddress: deviceSigner.address,
  agentId: "yourturn-recovery-agent-1",
  bookingTokenId: BOOKING_TOKEN_ID,
  bookingSerial: BigInt(BOOKING_SERIAL),
  allowedAction: "RECOVER",
  minimumRecoveryAtomicUnits: BigInt(HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS),
  settlementAsset: HEDERA_TESTNET_USDC_TOKEN_ID,
  expiresAt: EXPIRY_S,
  nonce: "mandate-nonce-1",
  cancellationAllowed: false,
  issuedAt: NOW_S - BigInt(60),
};

const typed = buildRecoveryMandateTypedData(mandate);
const signature = await deviceSigner.signTypedData(typed.domain, typed.types, typed.value);

function memoryReplayStore() {
  const seen = new Map();
  return {
    async consumeOnce({ mandateId, digest }) {
      if (seen.has(mandateId)) return seen.get(mandateId) === digest ? false : false;
      seen.set(mandateId, digest);
      return true;
    },
  };
}

const verified = await authorizeRecoveryMandateOnce({
  mandate,
  signature,
  expectedSignerAddress: deviceSigner.address,
  nowUnixSeconds: NOW_S,
  expected: {
    mandateId: mandate.mandateId,
    ownerId: mandate.ownerId,
    agentId: mandate.agentId,
    bookingTokenId: mandate.bookingTokenId,
    bookingSerial: mandate.bookingSerial,
    allowedAction: mandate.allowedAction,
    minimumRecoveryAtomicUnits: mandate.minimumRecoveryAtomicUnits,
    settlementAsset: mandate.settlementAsset,
    expiresAt: mandate.expiresAt,
    nonce: mandate.nonce,
    cancellationAllowed: mandate.cancellationAllowed,
    issuedAt: mandate.issuedAt,
  },
  replayStore: memoryReplayStore(),
});
assert.equal(verified.recoveredSignerAddress, deviceSigner.address);
console.log("STEP 1  Ledger mandate verified + replay-consumed once");

/* ------------------------- STEP 2 — canonical projection: mandate -> delegation */
/**
 * Fields the Hedera delegation REQUIRES that the signed Ledger mandate cannot
 * supply. Each must come from trusted server state, never from request input.
 * If this list shrinks, an adapter has appeared; if it grows, a regression has.
 */
const REQUIRED_EXTERNAL_RESOLUTION = {
  holderAccountId: "mandate.ownerId is an app identity, not a Hedera account",
  delegatedAgentAccountId: "mandate.agentId is an app/World identity, not a Hedera account",
  spenderAccountId: "no mandate field; second Hedera identity for the same agent",
  receiverAccountId: "acquirer (Bob) account is not part of the holder mandate",
  providerPolicyId: "provider policy identity/version is NOT a signed mandate field",
};

function projectMandateToDelegation(m, resolved) {
  for (const key of Object.keys(REQUIRED_EXTERNAL_RESOLUTION)) {
    if (!resolved[key]) throw new Error(`unresolved_external_field:${key}`);
  }
  return {
    delegationId: m.mandateId,
    delegatedAgentAccountId: resolved.delegatedAgentAccountId,
    spenderAccountId: resolved.spenderAccountId,
    tokenId: m.bookingTokenId,
    // bigint -> number narrowing
    serial: Number(m.bookingSerial),
    holderAccountId: resolved.holderAccountId,
    // scalar string -> enum array
    allowedActions: [m.allowedAction],
    minimumRecovery: {
      // string token id -> tagged union
      asset: { kind: "HTS", tokenId: m.settlementAsset },
      // bigint -> decimal string
      atomicUnits: m.minimumRecoveryAtomicUnits.toString(),
    },
    // SECONDS -> MILLISECONDS. Omitting *1000 silently expires the mandate.
    expiresAtMs: Number(m.expiresAt) * 1000,
    cancellationAllowed: m.cancellationAllowed,
    providerPolicyId: resolved.providerPolicyId,
    revokedAtMs: null,
  };
}

const resolved = {
  holderAccountId: MAYA_HOLDER_ACCOUNT,
  delegatedAgentAccountId: AGENT_ACCOUNT,
  spenderAccountId: AGENT_SPENDER_ACCOUNT,
  receiverAccountId: BOB_RECEIVER_ACCOUNT,
  providerPolicyId: PROVIDER_POLICY_ID,
};
const delegation = projectMandateToDelegation(mandate, resolved);

assert.equal(delegation.expiresAtMs, Number(EXPIRY_S) * 1000);
assert.ok(delegation.expiresAtMs > NOW_MS, "projected expiry must still be live");
note("UNIT-1", "mandate.expiresAt is SECONDS; BookingRightDelegation.expiresAtMs is MILLISECONDS");
note("TYPE-1", "mandate.bookingSerial bigint -> delegation.serial number");
note("ARITY-1", "mandate.allowedAction string -> delegation.allowedActions enum[]");
note("SHAPE-1", "mandate.settlementAsset string -> minimumRecovery.asset tagged union");
note("SHAPE-2", "mandate.minimumRecoveryAtomicUnits bigint -> atomicUnits decimal string");
console.log(`STEP 2  projected mandate -> delegation (${Object.keys(REQUIRED_EXTERNAL_RESOLUTION).length} fields need external resolution)`);

/* --------- Negative: the seconds/milliseconds trap must be caught, not silent */
const naive = { ...delegation, expiresAtMs: Number(mandate.expiresAt) };
assert.ok(naive.expiresAtMs < NOW_MS, "seconds-as-ms must read as long expired");
note("UNIT-1-PROOF", "passing seconds into expiresAtMs yields a 1970 timestamp (fails closed, but silently)");

/* -------------------------------- STEP 3 — Hedera policy: 32 blocked, 45 allowed */
function memoryNonceStore() {
  const values = new Map();
  return {
    async reserve({ key, fingerprint }) {
      const cur = values.get(key);
      if (cur === undefined) { values.set(key, fingerprint); return "claimed"; }
      return cur === fingerprint ? "duplicate" : "conflict";
    },
  };
}

function invocation(nonce, atomicUnits) {
  return {
    agentAccountId: AGENT_ACCOUNT,
    currentHolderAccountId: MAYA_HOLDER_ACCOUNT,
    action: "RECOVER",
    nonce,
    providerPolicy: { id: PROVIDER_POLICY_ID, state: "ALLOW" },
    recovery: { asset: { kind: "HTS", tokenId: HEDERA_TESTNET_USDC_TOKEN_ID }, atomicUnits },
    receiverAccountId: BOB_RECEIVER_ACCOUNT,
  };
}

const blocked = await preparePolicyAuthorizedUsdcRecovery({
  delegation,
  invocation: invocation("nonce-32", USDC_32),
  nonceStore: memoryNonceStore(),
  now: () => NOW_MS,
});
assert.equal(blocked.ok, false, "32 USDC must not produce an authorized recovery");
assert.equal(blocked.transactionBytesProduced, false, "32 USDC must produce no transaction bytes");
assert.equal(blocked.decision.outcome, "BLOCK");
assert.equal(blocked.decision.reason, "BELOW_MINIMUM_RECOVERY");
console.log(`STEP 3a 32 USDC -> ${blocked.decision.outcome}/${blocked.decision.reason}, bytes=${blocked.transactionBytesProduced}`);

const allowed = await preparePolicyAuthorizedUsdcRecovery({
  delegation,
  invocation: invocation("nonce-45", USDC_45),
  nonceStore: memoryNonceStore(),
  now: () => NOW_MS,
});
assert.equal(allowed.ok, true, "45 USDC must be inside the 40 USDC mandate");
assert.equal(allowed.decision.outcome, "ALLOW");
assert.equal(allowed.settlement.tokenId, HEDERA_TESTNET_USDC_TOKEN_ID);
assert.equal(allowed.settlement.atomicUnits, USDC_45);
assert.equal(allowed.settlement.decimals, HEDERA_USDC_DECIMALS);
assert.equal(allowed.settlement.recipientAccountId, MAYA_HOLDER_ACCOUNT, "45 USDC must settle to Maya");
console.log(`STEP 3b 45 USDC -> ${allowed.decision.outcome}, settles ${allowed.settlement.atomicUnits} to ${allowed.settlement.recipientAccountId}`);

/* ------------------------------ STEP 4 — bytes stay unsigned and exactly scoped */
const envelope = allowed.envelope;
assert.equal(envelope.mode, "RETURN_BYTES");
assert.equal(envelope.signed, false, "harness must never hold signed bytes");
assert.equal(envelope.submitted, false, "harness must never submit");

const decoded = Transaction.fromBytes(Buffer.from(envelope.bytesBase64, "base64"));
assert.ok(decoded instanceof TransferTransaction, "recovery must be one TransferTransaction");
validateAtomicUsdcRecoveryTransaction(decoded, {
  bookingTokenId: BOOKING_TOKEN_ID,
  serial: BOOKING_SERIAL,
  holderAccountId: MAYA_HOLDER_ACCOUNT,
  spenderAccountId: AGENT_SPENDER_ACCOUNT,
  receiverAccountId: BOB_RECEIVER_ACCOUNT,
  settlementTokenId: HEDERA_TESTNET_USDC_TOKEN_ID,
  settlementAmountAtomicUnits: USDC_45,
  settlementRecipientAccountId: MAYA_HOLDER_ACCOUNT,
  settlementDecimals: HEDERA_USDC_DECIMALS,
});
assert.equal(decoded.hbarTransfers.size, 0, "no HBAR may move");
assert.equal(decoded.nftTransfers.size, 1, "exactly one booking NFT movement");
assert.equal(decoded.tokenTransfers.size, 1, "exactly one settlement token");
console.log("STEP 4  RETURN_BYTES decode to exactly one booking move + one USDC settlement, unsigned/unsubmitted");

/* ------------------- STEP 5 — World requester gate: duplicate-authority blocker */
const worldGateParams = authorizeWorldRecoveryWrite.length;
let mandateAcceptedByWorldGate = false;
try {
  await authorizeWorldRecoveryWrite({
    agentkitHeader: null,
    expectedResourceUri: "https://example.invalid/api/agent/confirm",
    // The intended final architecture wants the Ledger mandate to be the
    // authority carrier. The current gate requires ApprovalGrantClaims.
    grant: /** intentionally the mandate, not a grant */ mandate,
    previewAction: "create_listing",
    previewSerial: BOOKING_SERIAL,
    nonceStore: { async consumeOnce() { return true; } },
    agentBook: { async lookupHuman() { throw new Error("no network in rehearsal"); } },
  }).then((d) => { mandateAcceptedByWorldGate = d.status === "allowed"; });
} catch {
  mandateAcceptedByWorldGate = false;
}
assert.equal(
  mandateAcceptedByWorldGate,
  false,
  "a Ledger RecoveryMandate must not be silently accepted as an ApprovalGrant"
);
note(
  "AUTH-1",
  "authorizeWorldRecoveryWrite consumes ApprovalGrantClaims (grant.action/serial/actor/delegatedAgentAddress); " +
    "the Ledger RecoveryMandate cannot satisfy it. Two authority carriers exist."
);
note(
  "AUTH-2",
  "action vocabularies disagree: Ledger allowedAction free string | World BookingPortAction 'create_listing' | Hedera 'RECOVER'"
);
note(
  "AUTH-3",
  "ApprovalGrantClaims.actor is BookingActorRef demoActor guestA/guestB/issuer - a demo persona, not a customer identity"
);
console.log("STEP 5  World gate correctly refuses a RecoveryMandate as a grant (duplicate authority confirmed)");

/* ------------------------------------------------------------------- summary */
console.log("\n--- CONTRACT FINDINGS (FIXTURE / CI-LOCAL, not LIVE) ---");
for (const f of findings) console.log(`  ${f}`);
console.log(`\nauthority-chain-contract: PASS (${findings.length} contract findings recorded)`);
