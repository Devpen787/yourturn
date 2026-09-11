/**
 * Interruption / retry attack matrix.
 *
 * Aborts the recovery flow at each materially dangerous point, then asks what
 * the NEXT demo run sees if the presenter simply retries (no reset), and what
 * it sees after the reset production actually implements.
 *
 * Classification:
 *   SAFE RETRY             - retry works with no operator action
 *   REQUIRES RESET         - retry fails; a demo-scoped reset fixes it
 *   REQUIRES RECONCILIATION- state is split across systems; reset alone is wrong
 *   DEMO-BLOCKING          - neither retry nor today's reset recovers it
 *
 * Non-networked. FIXTURE / CI-LOCAL.
 */
process.env.DR_QUIET = "1";
import { Wallet } from "ethers";
import { Transaction, TransferTransaction } from "@hiero-ledger/sdk";
import { storePreparedRecoveryMandate, activatePreparedRecoveryMandate } from "../../lib/ledger/recovery-mandate-state.ts";
import { createRedisRecoveryMandateReplayStore } from "../../lib/ledger/recovery-mandate-replay.ts";
import { buildRecoveryMandateTypedData } from "../../lib/ledger/recovery-mandate.ts";
import { preparePolicyAuthorizedUsdcRecovery } from "../../lib/hedera-agent-kit/policy-authorized-usdc-recovery.ts";
import { HEDERA_TESTNET_USDC_TOKEN_ID, HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS } from "../../lib/hedera-agent-kit/usdc-recovery-semantics.ts";
import { createMemoryRedis, productionResetDemo } from "./memory-redis.mjs";
import { runDemo } from "./flow.mjs";

const T="0.0.2001", S=7, MAYA="0.0.1001", SP="0.0.1002", BOB="0.0.1003", AG="0.0.1004", POL="studio-a-friday-yoga-v1";
const U32="32000000", U45="45000000";
const nowS = BigInt(Math.floor(Date.parse("2026-09-11T12:00:00Z")/1000));
const nowMs = Number(nowS)*1000;
const signer = Wallet.createRandom();

const mandateFor = () => ({
  mandateId:"demo-friday-yoga-mandate", ownerId:"maya-keller", ledgerSignerAddress:signer.address,
  agentId:"yourturn-recovery-agent-1", bookingTokenId:T, bookingSerial:BigInt(S), allowedAction:"RECOVER",
  minimumRecoveryAtomicUnits:BigInt(HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS), settlementAsset:HEDERA_TESTNET_USDC_TOKEN_ID,
  expiresAt:BigInt(Math.floor(Date.parse("2026-09-12T17:00:00Z")/1000)), nonce:"demo-mandate-nonce",
  cancellationAllowed:false, issuedAt:nowS-60n,
});
const delegationFor = (m) => ({
  delegationId:m.mandateId, delegatedAgentAccountId:AG, spenderAccountId:SP, tokenId:m.bookingTokenId,
  serial:Number(m.bookingSerial), holderAccountId:MAYA, allowedActions:[m.allowedAction],
  minimumRecovery:{asset:{kind:"HTS",tokenId:m.settlementAsset},atomicUnits:m.minimumRecoveryAtomicUnits.toString()},
  expiresAtMs:Number(m.expiresAt)*1000, cancellationAllowed:m.cancellationAllowed, providerPolicyId:POL, revokedAtMs:null,
});
const inv = (units,nonce)=>({agentAccountId:AG,currentHolderAccountId:MAYA,action:"RECOVER",nonce,
  providerPolicy:{id:POL,state:"ALLOW"},recovery:{asset:{kind:"HTS",tokenId:HEDERA_TESTNET_USDC_TOKEN_ID},atomicUnits:units},receiverAccountId:BOB});
const hStore=(r)=>({async reserve({key,fingerprint}){const f=`ethonline:hedera:booking-right-nonce:${key}`;const e=await r.get(f);
  if(e==null){await r.set(f,fingerprint);return "claimed";}return e===fingerprint?"duplicate":"conflict";}});
const wStore=(r)=>({async consumeOnce(n){return (await r.set(`bookedrights:world-agentkit:nonce:${n}`,"1",{nx:true}))==="OK";}});

/** Drive the flow, aborting immediately after `stopAfter`. */
async function partial(redis, appState, stopAfter) {
  const m = mandateFor();
  await storePreparedRecoveryMandate({store:redis,mandate:m,ownerId:m.ownerId,nowUnixSeconds:nowS});
  if (stopAfter==="prepare") return;
  const typed = buildRecoveryMandateTypedData(m);
  const sig = await signer.signTypedData(typed.domain,typed.types,typed.value);
  await activatePreparedRecoveryMandate({store:redis,authorityBoundaryStore:redis,
    replayStore:createRedisRecoveryMandateReplayStore(redis),mandateId:m.mandateId,ownerId:m.ownerId,
    signature:sig,revalidateMutableAuthority:async()=>{},nowUnixSeconds:nowS});
  if (stopAfter==="activation"||stopAfter==="replay-consumed") return;
  if (!(await wStore(redis).consumeOnce(`requester-${m.nonce}`))) throw new Error("world nonce already consumed");
  if (stopAfter==="world-verified") return;
  const d = delegationFor(m); const st = hStore(redis);
  const b = await preparePolicyAuthorizedUsdcRecovery({delegation:d,invocation:inv(U32,"demo-recovery-nonce-32"),nonceStore:st,now:()=>nowMs});
  if (b.ok!==false) throw new Error("32 not refused");
  if (stopAfter==="32-rejected") return;
  const a = await preparePolicyAuthorizedUsdcRecovery({delegation:d,invocation:inv(U45,"demo-recovery-nonce-45"),nonceStore:st,now:()=>nowMs});
  if (a.ok!==true) throw new Error(`45 refused:${a.decision.reason}`);
  if (stopAfter==="45-approved"||stopAfter==="return-bytes") return;
  // represent settlement + holder change without any network call
  appState.slots = appState.slots.map(s=>s.serial===S?{...s,holder:"bob"}:s);
  if (stopAfter==="holder-changed") return;
  appState.recoveryReceipts.push({serial:S,recoveredAtomicUnits:U45,to:MAYA,newHolder:"bob"});
}

const POINTS = [
  ["activation",      "after Ledger mandate activation"],
  ["replay-consumed", "after mandate replay consumption"],
  ["world-verified",  "after World requester verification, before product mutation"],
  ["32-rejected",     "after 32-USDC rejection"],
  ["45-approved",     "after 45-USDC policy approval, before Hedera submission"],
  ["return-bytes",    "after RETURN_BYTES construction, before signing/submission"],
  ["holder-changed",  "after holder transition, before UI/receipt reconciliation"],
  ["settled-no-receipt","after settlement succeeds but receipt update fails"],
];

const seed = () => { const s=[{serial:S,holder:"maya"}]; return {slotsSeed:s,slots:s.map(x=>({...x})),listings:[],automationProofs:[],recoveryReceipts:[]}; };

/** HARNESS-ONLY hypothetical: what a demo-scoped reset WOULD clear.
 *  This is not a proposed implementation and is never applied to product code.
 *  It exists to reveal residual risk that survives even after the reset is fixed. */
const SCOPED_NS = ["bookedrights:ledger:mandate-prepared","bookedrights:ledger:mandate-active",
  "bookedrights:ledger:mandate-consumed","bookedrights:ledger:authority-version",
  "bookedrights:world-agentkit:nonce","ethonline:hedera:booking-right-nonce"];
function hypotheticalScopedReset(redis, appState) {
  productionResetDemo(redis, appState);
  for (const k of redis.keys("")) if (SCOPED_NS.some(n=>k.startsWith(n))) redis.rawDelete(k);
}

console.log("point                                                        retry(no reset)    prod reset         scoped reset*      class");
console.log("-".repeat(132));
const rows=[];
for (const [key,label] of POINTS) {
  // A: interrupt, then retry with NO reset
  let redis=createMemoryRedis(), app=seed();
  try { await partial(redis,app,key); } catch {}
  if (key==="settled-no-receipt"){ app.slots=app.slots.map(s=>s.serial===S?{...s,holder:"bob"}:s); }
  let retry="PASS"; try { await runDemo(redis,app,2,signer); } catch(e){ retry=`FAIL(${e.message.slice(0,26)})`; }

  // B: interrupt, apply production reset, then retry
  let redis2=createMemoryRedis(), app2=seed();
  try { await partial(redis2,app2,key); } catch {}
  if (key==="settled-no-receipt"){ app2.slots=app2.slots.map(s=>s.serial===S?{...s,holder:"bob"}:s); }
  productionResetDemo(redis2,app2);
  let afterReset="PASS"; try { await runDemo(redis2,app2,2,signer); } catch(e){ afterReset=`FAIL(${e.message.slice(0,26)})`; }

  // C: interrupt, apply the hypothetical scoped reset, then retry
  let redis3=createMemoryRedis(), app3=seed();
  try { await partial(redis3,app3,key); } catch {}
  if (key==="settled-no-receipt"){ app3.slots=app3.slots.map(s=>s.serial===S?{...s,holder:"bob"}:s); }
  hypotheticalScopedReset(redis3,app3);
  let afterScoped="PASS"; try { await runDemo(redis3,app3,2,signer); } catch(e){ afterScoped=`FAIL(${e.message.slice(0,22)})`; }

  // product/holder state split from authority state = reconciliation, not reset
  const splitState = (key==="holder-changed"||key==="settled-no-receipt");
  let cls;
  if (retry==="PASS") cls="SAFE RETRY";
  else if (afterReset==="PASS") cls = splitState?"REQUIRES RECONCILIATION":"REQUIRES RESET";
  else if (afterScoped==="PASS") cls = splitState?"REQUIRES RECONCILIATION":"REQUIRES RESET (scoped reset not yet implemented)";
  else cls="DEMO-BLOCKING";
  rows.push({label,retry,afterReset,afterScoped,cls});
  console.log(`${label.padEnd(60)} ${retry.padEnd(18)} ${afterReset.padEnd(18)} ${afterScoped.padEnd(18)} ${cls}`);
}
console.log("\n* scoped reset is a HARNESS-ONLY hypothetical, not implemented in product code.");
console.log("  'prod reset' uses ONLY what /api/reset-demo clears today.");
const blocking=rows.filter(r=>r.cls==="DEMO-BLOCKING").length;
console.log(`DEMO-BLOCKING interruption points: ${blocking}/${rows.length}`);
process.exit(blocking===0?0:1);
