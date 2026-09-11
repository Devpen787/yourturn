/**
 * Per-namespace stale-state isolation.
 *
 * For each ETHOnline state namespace: run demo 1, apply the reset that
 * production actually implements, then clear every OTHER demo namespace and
 * leave exactly this one behind. Whatever run 2 does is attributable to that
 * namespace alone.
 *
 * Non-networked. FIXTURE / CI-LOCAL. Proposes no reset implementation.
 */
process.env.DR_QUIET = "1";
import { Wallet } from "ethers";
import { runDemo, createMemoryRedis, productionResetDemo } from "./flow.mjs";

const NAMESPACES = [
  "bookedrights:ledger:mandate-prepared",
  "bookedrights:ledger:mandate-active",
  "bookedrights:ledger:mandate-consumed",
  "bookedrights:ledger:authority-version",
  "bookedrights:world-agentkit:nonce",
  "ethonline:hedera:booking-right-nonce",
];

const signer = Wallet.createRandom();
const seed = () => {
  const slotsSeed = [{ serial: 7, holder: "maya" }];
  return { slotsSeed, slots: slotsSeed.map(s=>({...s})), listings: [], automationProofs: [], recoveryReceipts: [] };
};

async function trial(keepNamespace) {
  const redis = createMemoryRedis();
  const appState = seed();
  await runDemo(redis, appState, 1, signer);
  productionResetDemo(redis, appState);
  // clear every demo namespace EXCEPT the one under test
  for (const k of redis.keys("")) {
    const isDemoNs = NAMESPACES.some((n) => k.startsWith(n));
    const isKept = keepNamespace && k.startsWith(keepNamespace);
    if (isDemoNs && !isKept) redis.rawDelete(k);
  }
  try { await runDemo(redis, appState, 2, signer); return { blocked: false }; }
  catch (e) { return { blocked: true, error: e.message }; }
}

console.log("=== control: all ETHOnline namespaces cleared after production reset ===");
const control = await trial(null);
console.log(control.blocked ? `  run 2 STILL FAILS: ${control.error}` : "  run 2 PASSES -> these namespaces are the only blockers\n");

console.log("=== per-namespace isolation (leave exactly one behind) ===");
const rows = [];
for (const ns of NAMESPACES) {
  const r = await trial(ns);
  rows.push({ ns, ...r });
  console.log(`  ${r.blocked ? "BLOCKS " : "harmless"}  ${ns}`);
  if (r.blocked) console.log(`              -> "${r.error}"`);
}

console.log("\n--- SUMMARY ---");
const blockers = rows.filter(r => r.blocked);
console.log(`  blocking namespaces:  ${blockers.length}/${NAMESPACES.length}`);
for (const b of blockers) console.log(`    ${b.ns}`);
const harmless = rows.filter(r => !r.blocked);
if (harmless.length) { console.log(`  non-blocking (still should be scoped for truthfulness):`); for (const h of harmless) console.log(`    ${h.ns}`); }
process.exit(blockers.length === 0 ? 0 : 1);
