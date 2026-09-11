/**
 * Logging / privacy attack on failure paths.
 *
 * Drives real sponsor failure paths with deliberately FAKE, non-secret fixtures
 * and scans everything written to stdout/stderr plus every thrown message and
 * returned decision for material that must never be emitted.
 *
 * Non-networked. FIXTURE / CI-LOCAL. No real secrets are used or printed.
 */
import { Wallet } from "ethers";
import { verifyRecoveryMandateSignature } from "../../lib/ledger/recovery-mandate.ts";
import { authorizeWorldRecoveryWrite } from "../../lib/world-agentkit/recovery-write-gate.ts";
import { preparePolicyAuthorizedUsdcRecovery } from "../../lib/hedera-agent-kit/policy-authorized-usdc-recovery.ts";
import { HEDERA_TESTNET_USDC_TOKEN_ID, HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS } from "../../lib/hedera-agent-kit/usdc-recovery-semantics.ts";

// Obvious fakes. None of these is a real credential.
const FAKE = {
  agentPrivKeyish: "0x" + "ab".repeat(32),
  agentAddress: "0x" + "cd".repeat(20),
  worldHumanId: "world-human-FAKE-NULLIFIER-0123456789abcdef",
  agentkitHeader: "AgentKit sig=FAKEHEADERSIGNATUREVALUE0123456789abcdefghijkl",
  approvalSecretish: "FAKE-APPROVAL-SECRET-VALUE-0123456789",
  hederaPrivKeyish: "302e020100300506032b657004220420" + "ef".repeat(16),
};

const FORBIDDEN = [
  { label: "Ledger signature material",  re: /0x[0-9a-fA-F]{130}/ },
  { label: "generic private key blob",   re: /302e020100300506032b657004220420[0-9a-fA-F]{32,}/ },
  { label: "World raw human id/nullifier", re: /world-human-[A-Za-z0-9-]+/ },
  { label: "AgentKit signed header",     re: /AgentKit\s+sig=/i },
  { label: "approval/replay secret",     re: /FAKE-APPROVAL-SECRET/ },
  { label: "raw EVM private-key-shaped", re: /0x(?:[0-9a-fA-F]{64})\b/ },
];

const captured = [];
const origLog = console.log, origErr = console.error, origWarn = console.warn;
const cap = (fn) => (...a) => { captured.push(a.map(String).join(" ")); fn(...a); };
console.log = cap(origLog); console.error = cap(origErr); console.warn = cap(origWarn);

async function attempt(name, fn) {
  try { const r = await fn(); captured.push(`[${name}] resolved: ${JSON.stringify(r)}`); }
  catch (e) { captured.push(`[${name}] threw: ${e?.message ?? e}`); captured.push(`[${name}] stack: ${e?.stack ?? ""}`); }
}

// 1. Ledger: signature verification failure with a wrong signer
await attempt("ledger-bad-signature", async () => {
  const w = Wallet.createRandom();
  const mandate = {
    mandateId:"m1", ownerId:"maya", ledgerSignerAddress:w.address, agentId:"a1",
    bookingTokenId:"0.0.2001", bookingSerial:7n, allowedAction:"RECOVER",
    minimumRecoveryAtomicUnits:BigInt(HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS),
    settlementAsset:HEDERA_TESTNET_USDC_TOKEN_ID,
    expiresAt:BigInt(Math.floor(Date.now()/1000)+3600), nonce:"n1",
    cancellationAllowed:false, issuedAt:BigInt(Math.floor(Date.now()/1000)-60),
  };
  return verifyRecoveryMandateSignature({
    mandate, signature:"0x"+"11".repeat(65), expectedSignerAddress:w.address,
  });
});

// 2. World: gate failures carrying a fake signed header and fake human id
for (const [label, grant] of [
  ["world-missing-agent", { kind:"booked-rights-approval-grant", grantId:"g", action:"create_listing", serial:7, actor:{kind:"demoActor",id:"guestA"}, approvedBy:"x", approvedAt:"", expiresAt:"", source:"agent" }],
  ["world-bad-agent-addr", { kind:"booked-rights-approval-grant", grantId:"g", action:"create_listing", serial:7, actor:{kind:"demoActor",id:"guestA"}, delegatedAgentAddress:FAKE.worldHumanId, approvedBy:"x", approvedAt:"", expiresAt:"", source:"agent" }],
  ["world-verify-throws",  { kind:"booked-rights-approval-grant", grantId:"g", action:"create_listing", serial:7, actor:{kind:"demoActor",id:"guestA"}, delegatedAgentAddress:FAKE.agentAddress, approvedBy:"x", approvedAt:"", expiresAt:"", source:"agent" }],
]) {
  await attempt(label, () => authorizeWorldRecoveryWrite({
    agentkitHeader: FAKE.agentkitHeader,
    expectedResourceUri: "https://example.invalid/api/agent/confirm",
    grant, previewAction:"create_listing", previewSerial:7,
    nonceStore:{ async consumeOnce(){ return true; } },
    agentBook:{ async lookupHuman(){ throw new Error(`agentbook lookup failed for ${FAKE.worldHumanId}`); } },
  }));
}

// 3. Hedera: policy block + malformed delegation
await attempt("hedera-below-minimum", () => preparePolicyAuthorizedUsdcRecovery({
  delegation:{ delegationId:"d", delegatedAgentAccountId:"0.0.1004", spenderAccountId:"0.0.1002",
    tokenId:"0.0.2001", serial:7, holderAccountId:"0.0.1001", allowedActions:["RECOVER"],
    minimumRecovery:{asset:{kind:"HTS",tokenId:HEDERA_TESTNET_USDC_TOKEN_ID},atomicUnits:HEDERA_USDC_MIN_RECOVERY_ATOMIC_UNITS},
    expiresAtMs:Date.now()+3600000, cancellationAllowed:false, providerPolicyId:"p", revokedAtMs:null },
  invocation:{ agentAccountId:"0.0.1004", currentHolderAccountId:"0.0.1001", action:"RECOVER", nonce:"n",
    providerPolicy:{id:"p",state:"ALLOW"},
    recovery:{asset:{kind:"HTS",tokenId:HEDERA_TESTNET_USDC_TOKEN_ID},atomicUnits:"32000000"},
    receiverAccountId:"0.0.1003" },
  nonceStore:{ async reserve(){ return "claimed"; } },
}));

console.log = origLog; console.error = origErr; console.warn = origWarn;

const blob = captured.join("\n");
console.log(`\ncaptured ${captured.length} output/throw fragments from failure paths\n`);
let leaks = 0;
for (const f of FORBIDDEN) {
  const m = blob.match(f.re);
  if (m) { leaks += 1; console.log(`  LEAK  ${f.label}: matched ${String(m[0]).slice(0,24)}...`); }
  else console.log(`  clean ${f.label}`);
}
console.log(`\nprivacy scan: ${leaks === 0 ? "PASS" : "FAIL"} (${leaks} leak class(es))`);
process.exit(leaks === 0 ? 0 : 1);
