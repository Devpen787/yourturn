/**
 * Two-Run Demo Acceptance — adversarial, non-networked.
 *
 * Proves whether the intended integrated recovery flow can be demoed TWICE from
 * the reset behaviour that production actually implements today.
 *
 * EVIDENCE CLASS: FIXTURE / CI-LOCAL. No Hedera submission, no World Sandbox
 * call, no Ledger device, no network, no secrets. The device signer is an
 * ephemeral in-process random wallet.
 *
 * Exit 0 = both runs succeeded. Exit 1 = second run failed (the finding).
 * Run with:  node --experimental-transform-types scripts/demo-reliability/two-run-acceptance.mjs
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
import { createMemoryRedis, productionResetDemo } from "./memory-redis.mjs";

const USDC_32 = "32000000";
const USDC_45 = "45000000";
const TOKEN = "0.0.2001";
const SERIAL = 7;
const MAYA = "0.0.1001";
const SPENDER = "0.0.1002";
const BOB = "0.0.1003";
const AGENT = "0.0.1004";
const POLICY_ID = "studio-a-friday-yoga-v1";

/* The staged demo configuration is IDENTICAL across runs on purpose: a judge
   replays the same scripted demo, not a freshly randomised one. */
const STAGED = {
  mandateId: "demo-friday-yoga-mandate",
  nonce: "demo-mandate-nonce",
  hederaNonce: "demo-recovery-nonce",
  ownerId: "maya-keller",
  agentId: "yourturn-recovery-agent-1",
};

const log = (r, s) => console.log(`  [run ${r}] ${s}`);

function hederaNonceStore(redis) {
  return {
    async reserve({ key, fingerprint }) {
      const full = `ethonline:hedera:booking-right-nonce:${key}`;
      const existing = await redis.get(full);
      if (existing == null) { await redis.set(full, fingerprint); return "claimed"; }
      return existing === fingerprint ? "duplicate" : "conflict";
    },
  };
}
function worldNonceStore(redis) {
  return {
    async consumeOnce(nonce) {
      const full = `bookedrights:world-agentkit:nonce:${nonce}`;
      const ok = await redis.set(full, "1", { nx: true });
      return ok === "OK";
    },
  };
}

async function runDemo(redis, appState, runNo, signer) {
  const nowS = BigInt(Math.floor(Date.parse("2026-09-11T12:00:00Z") / 1000));
  const nowMs = Number(nowS) * 1000;
  const expiresAt = BigInt(Math.floor(Date.parse("2026-09-12T17:00:00Z") / 1000));

  const mandate = {
    mandateId: STAGED.mandateId,
    ownerId: STAGED.ownerId,
    ledgerSignerAddress: signer.address,
    agentId: STAGED.agentId,
    bookingTokenId: TOKEN,
    bookingSerial: BigInt(SERIAL),
    allowedAction: "RECOVER",
    minimumRecoveryAtomicUnits: BigInt(HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS),
    settlementAsset: HEDERA_TESTNET_USDC_TOKEN_ID,
    expiresAt,
    nonce: STAGED.nonce,
    cancellationAllowed: false,
    issuedAt: nowS - 60n,
  };

  // --- 1. prepare
  await storePreparedRecoveryMandate({ store: redis, mandate, ownerId: STAGED.ownerId, nowUnixSeconds: nowS });
  log(runNo, "prepared mandate stored");

  // --- 2. activate (device signature; ephemeral signer stands in for hardware)
  const typed = buildRecoveryMandateTypedData(mandate);
  const signature = await signer.signTypedData(typed.domain, typed.types, typed.value);
  const { active } = await activatePreparedRecoveryMandate({
    store: redis,
    authorityBoundaryStore: redis,
    replayStore: createRedisRecoveryMandateReplayStore(redis),
    mandateId: mandate.mandateId,
    ownerId: STAGED.ownerId,
    signature,
    revalidateMutableAuthority: async () => {},
    nowUnixSeconds: nowS,
  });
  log(runNo, `mandate ACTIVE (state=${active.state})`);

  const loaded = await loadActiveRecoveryMandate({ store: redis, mandateId: mandate.mandateId, ownerId: STAGED.ownerId });
  if (!loaded) throw new Error("active mandate not readable after activation");

  // --- 3. requester verification (World nonce is one-shot)
  const wns = worldNonceStore(redis);
  const requesterOk = await wns.consumeOnce(`requester-${STAGED.nonce}`);
  if (!requesterOk) throw new Error("world_requester_nonce_already_consumed");
  log(runNo, "requester verified (World nonce consumed)");

  // --- 4. projection (seconds -> ms; see AUTHORITY-CHAIN-MAP)
  const delegation = {
    delegationId: mandate.mandateId,
    delegatedAgentAccountId: AGENT,
    spenderAccountId: SPENDER,
    tokenId: mandate.bookingTokenId,
    serial: Number(mandate.bookingSerial),
    holderAccountId: MAYA,
    allowedActions: [mandate.allowedAction],
    minimumRecovery: {
      asset: { kind: "HTS", tokenId: mandate.settlementAsset },
      atomicUnits: mandate.minimumRecoveryAtomicUnits.toString(),
    },
    expiresAtMs: Number(mandate.expiresAt) * 1000,
    cancellationAllowed: mandate.cancellationAllowed,
    providerPolicyId: POLICY_ID,
    revokedAtMs: null,
  };
  const invocation = (atomicUnits, nonce) => ({
    agentAccountId: AGENT,
    currentHolderAccountId: MAYA,
    action: "RECOVER",
    nonce,
    providerPolicy: { id: POLICY_ID, state: "ALLOW" },
    recovery: { asset: { kind: "HTS", tokenId: HEDERA_TESTNET_USDC_TOKEN_ID }, atomicUnits },
    receiverAccountId: BOB,
  });

  // --- 5. 32 USDC must be refused with no bytes
  const store = hederaNonceStore(redis);
  const blocked = await preparePolicyAuthorizedUsdcRecovery({
    delegation, invocation: invocation(USDC_32, `${STAGED.hederaNonce}-32`), nonceStore: store, now: () => nowMs,
  });
  if (blocked.ok !== false || blocked.transactionBytesProduced !== false) throw new Error("32_usdc_was_not_refused");
  if (blocked.decision.reason !== "BELOW_MINIMUM_RECOVERY") throw new Error(`32_usdc_wrong_reason:${blocked.decision.reason}`);
  log(runNo, `32 USDC -> ${blocked.decision.outcome}/${blocked.decision.reason}, bytes=false`);

  // --- 6. 45 USDC permitted
  const allowed = await preparePolicyAuthorizedUsdcRecovery({
    delegation, invocation: invocation(USDC_45, `${STAGED.hederaNonce}-45`), nonceStore: store, now: () => nowMs,
  });
  if (allowed.ok !== true) throw new Error(`45_usdc_refused:${allowed.decision.reason}`);
  log(runNo, `45 USDC -> ${allowed.decision.outcome}, settles ${allowed.settlement.atomicUnits} to ${allowed.settlement.recipientAccountId}`);

  // --- 7. settlement representation (unsigned; never submitted here)
  const decoded = Transaction.fromBytes(Buffer.from(allowed.envelope.bytesBase64, "base64"));
  if (!(decoded instanceof TransferTransaction)) throw new Error("not_a_transfer_transaction");
  validateAtomicUsdcRecoveryTransaction(decoded, {
    bookingTokenId: TOKEN, serial: SERIAL, holderAccountId: MAYA, spenderAccountId: SPENDER,
    receiverAccountId: BOB, settlementTokenId: HEDERA_TESTNET_USDC_TOKEN_ID,
    settlementAmountAtomicUnits: USDC_45, settlementRecipientAccountId: MAYA,
    settlementDecimals: HEDERA_USDC_DECIMALS,
  });
  if (allowed.envelope.signed !== false || allowed.envelope.submitted !== false) throw new Error("harness_must_not_hold_signed_bytes");
  log(runNo, "settlement bytes valid, unsigned/unsubmitted");

  // --- 8. holder transition + receipt (product-state representation)
  appState.slots = appState.slots.map((s) => (s.serial === SERIAL ? { ...s, holder: "bob" } : s));
  appState.recoveryReceipts.push({ serial: SERIAL, recoveredAtomicUnits: USDC_45, to: MAYA, newHolder: "bob" });
  log(runNo, "holder Maya -> Bob; receipt recorded");
  return true;
}

/* ------------------------------------------------------------------ main */
const redis = createMemoryRedis();
const signer = Wallet.createRandom();
const slotsSeed = [{ serial: SERIAL, holder: "maya" }];
const appState = { slotsSeed, slots: slotsSeed.map((s) => ({ ...s })), listings: [], automationProofs: [], recoveryReceipts: [] };

console.log("RUN 1 — clean state");
await runDemo(redis, appState, 1, signer);
console.log("  run 1: PASS\n");

console.log("RESET — exactly what /api/reset-demo does today");
const reset = productionResetDemo(redis, appState);
console.log(`  cleared:   ${reset.clearedNamespaces.join(", ")}`);
console.log(`  UNTOUCHED: ${reset.untouchedNamespaces.length} key(s) survive the reset:`);
for (const k of reset.untouchedNamespaces) console.log(`      ${k}`);
console.log("");

console.log("RUN 2 — same staged demo configuration");
let run2Error = null;
try {
  await runDemo(redis, appState, 2, signer);
  console.log("  run 2: PASS\n");
} catch (e) {
  run2Error = e;
  console.log(`  run 2: FAIL -> ${e.message}\n`);
}

if (run2Error) {
  console.log("TWO-RUN ACCEPTANCE: FAIL");
  console.log(`  first blocking stale-state failure: ${run2Error.message}`);
  console.log("  This is a reproducer, not a harness defect. Reset is modelled exactly as production implements it.");
  process.exit(1);
}
console.log("TWO-RUN ACCEPTANCE: PASS (both runs succeeded from production reset behaviour)");
