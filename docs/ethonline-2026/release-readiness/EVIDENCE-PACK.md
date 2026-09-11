# ETHOnline Final Evidence Pack Contract

This file defines the **shape of the final proof pack before the final proofs exist**. Empty/missing slots stay explicitly missing; they must never be filled with fixture or CI evidence under a LIVE label.

## Evidence principles

- One customer transaction, not three sponsor demos.
- Every claim points to an exact source SHA and exact evidence reference.
- Evidence classes are literal: `FIXTURE`, `CI/LOCAL`, `CI/CONFIGURED`, `LIVE/AGENTBOOK`, `LIVE/SIGNED-ROUTE`, `LIVE/TESTNET`, `LIVE/DEVICE`.
- Customer success is shown first; sponsor evidence is secondary/expandable.
- Exactly three partner tracks remain in scope unless deliberately changed: Hedera Continuity, World AgentKit Continuity, Ledger Continuity.
- No private key, raw AgentKit signature/header, raw World human id/proof, recovery phrase, device secret, admin secret, Redis credential, or environment dump.

## Pack index

### 00 — Provenance
Required:
- immutable pre-event baseline SHA;
- frozen foundation SHA;
- final integrated candidate SHA;
- exact Golden YT-01→04 and YT-05→08 SHAs;
- exact qualified Hedera / World / Ledger SHAs;
- final `manifest.json` snapshot.

### 01 — Golden customer journey
Required:
- reviewed desktop/mobile Golden evidence for YT-01→08;
- human Golden records;
- explicit note that Golden freezes behavior/presentation, not sponsor evidence class.

### 02 — Ledger authorization
Required before `LIVE/DEVICE`:
- exact Recovery Mandate fields/hash sufficient to prove sameness without secret leakage;
- real device approve evidence;
- separate real reject/cancel evidence on the identical ceremony contract;
- SEC-LEDGER-005 independent closure evidence;
- proof that stale/revoked/out-of-scope state cannot become usable authority.

If device proof is absent, label the slot RED/NOT PROVEN. Never substitute CI ceremony checks.

### 03 — World requester proof
Required:
- `LIVE/AGENTBOOK` registration/resolution evidence;
- actual World ID Sandbox tester proof **only after the Sandbox transport boundary is Security-cleared**;
- actual locally signed registered-agent recovery-route execution evidence before `LIVE/SIGNED-ROUTE`;
- exact requester→delegated-agent match;
- privacy proof: `humanIdExposed:false` or equivalent public boundary;
- evidence that final authority came from the Ledger Recovery Mandate projection, not branch-local legacy approval scaffolding.

Current Sandbox boundary: draft PR #43 / candidate `403f2dcb1e185455b5fb09e76caab1e40f7d0ebc` is `CI/CONFIGURED` only and **SANDBOX RED**. SEC-WORLD-005 is `OPEN/MEDIUM`; independent run `34538944271` reproduced actual non-loopback reachability under the supported default dev launch. The phone proof is deferred until the supported launch is transport-bound to loopback, the API fails closed outside intended development mode, and Security independently closes the repair.

### 04 — Hedera policy + settlement
Required:
- 32-USDC below-minimum BLOCK evidence with no booking/value movement;
- 45-USDC LIVE/TESTNET transaction reference;
- independent decode/review proving the exact intended booking movement + exact USDC settlement with no widening;
- receipt plus Mirror/HashScan/public final-state reconciliation;
- replay/idempotency evidence;
- explicit 40-minimum / 45-success distinction.

Do not call the combined customer recovery `atomic` until one actual independently reviewed Hedera transaction proves both movements.

### 05 — Provider / acquirer reconciliation
Required:
- Studio A provider rule exists before recovery and is load-bearing;
- Bob satisfies eligibility/payment requirements;
- Bob becomes authoritative holder;
- Bob sees a normal usable Friday Yoga booking;
- Studio A recognizes Bob for fulfilment/check-in;
- Maya no longer has the usable booking and received 45 USDC.

A token/transaction receipt alone does not fill this slot.

### 06 — Integrated adversarial E2E
Required:
- exact integrated SHA;
- pass/block outcomes for Ledger reject/cancel, wrong World agent, 32-USDC offer, stale/revoked/expired/provider-invalid state, 45-USDC success and replay;
- one sanitized machine-readable summary;
- links/references to the exact supporting evidence above.

### 07 — Demo receipt
Judge-facing order:

1. **You recovered 45 USDC**
2. Friday Yoga moved from Maya to Bob and is usable.
3. Studio A recognizes Bob.
4. Expand technical proof:
   - Authorized by Ledger
   - Exact human-backed delegated requester verified by World
   - Rules enforced and settlement proven on Hedera

The receipt should bind all three sponsor proofs to the same booking/recovery execution, not present independent examples.

## Evidence status template

For each slot record:

- `status`: RED / YELLOW / GREEN
- `evidenceClass`
- `sourceSha`
- `runOrArtifact`
- `publicRefs`
- `reviewedBy`
- `claimBoundary`
- `redactionsChecked`

## Current known truth

- Golden YT-01→08: GREEN as product truth.
- Hedera H0/H1: retain existing independently reviewed `LIVE/TESTNET` claims.
- Hedera H2/new NFT+USDC recovery: `CI/LOCAL + Security`; canonical 45-USDC `LIVE/TESTNET` artifact remains RED pending the external testnet-liquidity prerequisite and exact-artifact review.
- World AgentBook: `LIVE/AGENTBOOK`.
- World signed recovery route: `CI/READY`, NOT LIVE.
- World Sandbox: PR #43 candidate `403f2dcb1e185455b5fb09e76caab1e40f7d0ebc` is `CI/CONFIGURED`; SEC-WORLD-005 is OPEN/MEDIUM; actual Sandbox proof remains RED and the phone round trip is deferred until Security closure.
- Ledger: `CI/CONFIGURED`; SEC-LEDGER-005 remains OPEN/MEDIUM and blocks `LIVE/DEVICE` evidence.
- XC-01: non-submission-critical `REVISE`; exact candidate `eb3bcdb84ff95352adf1d0c387996f9a4692c52f` must make Bob's successful holder state transition the product shell from `Find a spot` to `My bookings`, then be re-rendered and re-reviewed before any advancement.
- Full Ledger→World→Hedera E2E: RED / missing.

## Final submission packet readiness

- **Public README before/after: RED.** The held integration README still presents the pre-event Week 5 Hedera submission. Before lock, publish one final ETHOnline README that clearly separates the immutable baseline from the new Delegated Recovery work and links only evidence valid for the final integrated candidate.
- **Stable final integrated deployment: RED.** `https://yourturn-sage.vercel.app` is the pre-event Week 5 surface, not the final integrated ETHOnline candidate. PR #42's readiness preview also hit the Vercel free-tier daily deployment limit. Do not substitute a stale baseline URL or unqualified sponsor preview for the final stable reviewer URL.
- **Final video: RED.** No final judge-facing video is pinned yet; verify any applicable duration rule before lock.
- **Screenshots: PARTIAL.** Golden YT-01→08 rendered evidence exists, but final integrated sponsor-backed screenshots/receipt evidence do not.
- **Submission fields: RED.** Final project description, Continuity before/after, exactly three partner selections, repo/demo/evidence links, stable deployment URL and final media are not locked.
- **Evidence pack: RED.** The contract exists, but Hedera 45-USDC LIVE evidence, World Sandbox/signed-route evidence, Ledger SEC-005/device evidence and the final integrated adversarial E2E are still missing.

Any newer truth must update `manifest.json` and the relevant evidence slot together; prose alone does not upgrade evidence.
