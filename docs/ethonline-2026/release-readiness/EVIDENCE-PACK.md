# ETHOnline Final Evidence Pack Contract

This file defines the **shape of the final proof pack before the final proofs exist**. Empty/missing slots stay explicitly missing; they must never be filled with fixture or CI evidence under a LIVE label.

## Evidence principles

- One customer transaction, not three sponsor demos.
- Every claim points to an exact source SHA and exact evidence reference.
- Evidence classes are literal: `FIXTURE`, `CI/LOCAL`, `CI/CONFIGURED`, `LIVE/AGENTBOOK`, `LIVE/SIGNED-ROUTE`, `LIVE/TESTNET`, `LIVE/DEVICE`.
- Customer success is shown first; sponsor evidence is secondary/expandable.
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
- actual World ID Sandbox tester proof;
- actual locally signed registered-agent recovery-route execution evidence before `LIVE/SIGNED-ROUTE`;
- exact requester→delegated-agent match;
- privacy proof: `humanIdExposed:false` or equivalent public boundary;
- evidence that final authority came from the Ledger Recovery Mandate projection, not branch-local legacy approval scaffolding.

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

As of the readiness branch creation:

- Golden YT-01→08: GREEN as product truth.
- Hedera H0/H1: retain existing independently reviewed LIVE/TESTNET claims.
- Hedera H2/new NFT+USDC recovery: CI/LOCAL only; 45-USDC LIVE artifact still missing.
- World AgentBook: LIVE/AGENTBOOK.
- World signed recovery route: CI/READY, NOT LIVE.
- World Sandbox: app installed/downloaded, actual proof missing.
- Ledger: CI/CONFIGURED; SEC-LEDGER-005 still blocks device/integration qualification.
- Full Ledger→World→Hedera E2E: missing.

Any newer truth must update `manifest.json` and the relevant evidence slot together; prose alone does not upgrade evidence.
