# ETHOnline Final Evidence Pack Contract

This file defines the **shape of the final proof pack before all final proofs exist**. Empty/missing slots stay explicitly missing; they must never be filled with fixture or CI evidence under a LIVE label.

## Evidence principles

- One customer transaction, not three sponsor demos.
- Every claim points to an exact source SHA and exact evidence reference.
- Evidence classes are literal: `FIXTURE`, `CI/LOCAL`, `CI/CONFIGURED`, `LIVE/AGENTBOOK`, `SANDBOX`, `LIVE/SIGNED-ROUTE`, `LIVE/TESTNET`, `LIVE/DEVICE`.
- Customer success is shown first; sponsor evidence is secondary/expandable.
- Exactly three partner tracks remain in scope unless deliberately changed: Hedera Continuity, World AgentKit Continuity, Ledger Continuity.
- No private key, raw AgentKit signature/header, raw World human id/proof, recovery phrase, device secret, admin secret, Redis credential, or environment dump.

## Pack index

### 00 — Provenance
Required:
- immutable pre-event baseline SHA;
- frozen foundation SHA;
- final integrated candidate SHA;
- exact Golden YT-01→04, YT-05→08 and XC-01 SHAs;
- exact qualified Hedera / World / Ledger SHAs;
- final `manifest.json` snapshot.

### 01 — Golden customer journey
Required:
- reviewed desktop/mobile Golden evidence for YT-01→08 and XC-01;
- human Golden records/approval evidence;
- explicit note that Golden freezes behavior/presentation, not sponsor evidence class.

Current Golden truth:
- YT-01→04: `24bbf0d7516499069f5102ae4bf724b0cb376b94`;
- YT-05→08: `d5309a96d532ee107011c2a5cefc3000b9e4932f`;
- XC-01: `046ad8d3cad863813dca7a3fc9cb09abaf5939e0`.

### 02 — Ledger authorization
Required before `LIVE/DEVICE`:
- exact Recovery Mandate fields/hash sufficient to prove sameness without secret leakage;
- real device approve evidence;
- separate real reject/cancel evidence on the identical ceremony contract;
- proof that the hardware result is bound to that exact mandate;
- no substitution of CI ceremony checks for physical provenance.

Required before an active Ledger mandate becomes **load-bearing downstream authority**:
- the Security-accepted current-authority lifecycle boundary must remain intact in the exact integrated code;
- the loaded/consumed active record must match the current stable authority-state version and current mutable holder/status/listing/provider-policy predicates, with a stable-version recheck after live validation;
- stale, in-flight, revoked, missing-context or out-of-scope state must fail closed;
- downstream code must use `loadActiveRecoveryMandate()` or an equivalent atomic guarded boundary, never raw `mandate-active:*` as sufficient authority.

Current Ledger branch is `feature/ethonline-ledger@7ac9e8ea3ba8a51ff3ec889774fd8f8724677b4d`, exact-head Continuity `34558524222` SUCCESS. The Security-accepted authority lifecycle remains the independently reviewed SEC-LEDGER-005/006 lineage: SEC-LEDGER-006 was closed on owner `a1126a0e7d2e5bb679914b0409209799520f8646` by attacker `feature/ethonline-security-ledger-006-retest@7e03f28ad0182ff1aec112a8a05ddd5a2bfcf914`, run `34555366707`, job `103126811462` — SUCCESS; SEC-LEDGER-005 remains independently closed. The independent retest proves fresh authority loads only through current live validation; a later serialized mutation making the captured version stale is rejected even while the raw active record remains physically present; mutation during validation, odd/in-flight version, missing authority/live context, and stale holder/status/provider-policy/listing all fail closed; one-shot replay remains consumed.

The current head adds a pinned physical qualification contract at `docs/ethonline-2026/ledger/DEVICE_QUALIFICATION_RUNBOOK.md`: one identical server-prepared Recovery Mandate is taken through on-device reject → host cancel → on-device approve, followed by reviewer-safe bundle checks and downstream wrong-signature/single-activation/replay checks. This is **CI GREEN / READY FOR HUMAN DEVICE SESSION**, not `LIVE/DEVICE` evidence. It performs no recovery execution or fund movement. Physical identical-mandate DMK approve plus reject/cancel remains RED until the real session succeeds, and final integration must preserve the guarded boundary.

### 03 — World requester proof
Required:
- `LIVE/AGENTBOOK` registration/resolution evidence;
- real World ID Sandbox proof with successful World backend verification and reviewer-safe evidence;
- actual locally signed registered-agent recovery-route execution evidence before `LIVE/SIGNED-ROUTE`;
- exact requester→delegated-agent match;
- privacy proof: `humanIdExposed:false` or equivalent public boundary;
- evidence that final authority came from the Ledger Recovery Mandate projection, not branch-local legacy approval scaffolding.

Current Sandbox truth: SEC-WORLD-005 is independently **CLOSED at CI/CONFIGURED** by run `34547005448`. The required cross-device Sandbox proof is **GREEN as real non-production SANDBOX evidence** on `feature/ethonline-world-sandbox-proof@65383c83626a7121a6f47a3c88ac69b1304b363f`, with qualifying repaired-runtime proof lineage `ff0e2cd0eec1ede1d4e28c2e1a99603e7832177f` and exact-head Continuity `34549541999` SUCCESS. The exercised path was signed RP request → YourTurn desktop harness → QR/deep-link → iOS World ID Sandbox app → user acceptance/verification → proof returned to YourTurn → YourTurn backend → World `POST /api/v4/verify/{rp_id}` → success. Reviewer-visible result was `Sandbox proof verified`. No RP private key, raw proof, nullifier, connector URI, or raw World human identifier is published/committed.

PR #43 browser-Origin cleanup at `ccb07e45888a3c15ee691a5db7465029d76f4c7f`, owner Continuity `34553728277` SUCCESS, is now independently **SECURITY CLEAN** for its changed guard semantics. Independent attacker `feature/ethonline-security-world-origin-regression@6e7523a4597ff3e0434758e9412c399ce8a819be`; Continuity `34558923596`, job `103137419536` — SUCCESS. Intended `localhost`/`127.0.0.1` aliases are accepted only on matching scheme + effective port; wrong scheme/port, non-loopback and suffix-confusion hosts, `Origin:null`, generic-dev/production activation, and non-loopback TCP fail closed. This does not reopen or require repeating the completed Sandbox phone proof. Base World head `8aff17268adbad8e52b4b077c85bbe50034d6c13`, Continuity `34554016785` SUCCESS, provides the non-secret signed-route preflight; the registered-agent recovery route remains `CI/READY, NOT LIVE/SIGNED-ROUTE` and RED for real execution.

### 04 — Hedera policy + settlement
Required:
- 32-USDC below-minimum BLOCK evidence with no booking/value movement;
- 45-USDC LIVE/TESTNET transaction reference;
- independent decode/review proving the exact intended booking movement + exact USDC settlement with no widening;
- receipt plus Mirror/HashScan/public final-state reconciliation;
- replay/idempotency evidence;
- explicit 40-minimum / 45-success distinction.

Current H2/new NFT+USDC recovery remains `CI/LOCAL + Security`; canonical 45-USDC `LIVE/TESTNET` evidence is RED pending +25.02 testnet USDC to `0.0.8504405`, execution of the existing canonical workflow, and independent review of that exact artifact. H0/H1 retain their previously accepted LIVE/TESTNET evidence. Do not call the combined customer recovery `atomic` until one actual independently reviewed Hedera transaction proves both movements.

### 05 — Provider / acquirer reconciliation
Required:
- Studio A provider rule exists before recovery and is load-bearing;
- Bob satisfies eligibility/payment requirements;
- Bob becomes authoritative holder;
- Bob sees a normal usable Friday Yoga booking;
- Studio A recognizes Bob for fulfilment/check-in;
- Maya no longer has the usable booking and received 45 USDC.

A token/transaction receipt alone does not fill this slot. XC-01 is Golden product truth, but sponsor-dependent transitions remain fixture until the final integrated runtime proves them.

### 06 — Integrated adversarial E2E
Required:
- exact integrated SHA;
- pass/block outcomes for Ledger reject/cancel, wrong World agent, 32-USDC offer, stale/revoked/expired/provider-invalid state, post-activation authority staleness, 45-USDC success and replay;
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

- Golden YT-01→08 and XC-01: GREEN as human-approved product truth.
- Hedera H0/H1: retain existing independently reviewed `LIVE/TESTNET` claims.
- Hedera H2/new NFT+USDC recovery: `CI/LOCAL + Security`; canonical 45-USDC `LIVE/TESTNET` artifact remains RED pending the external testnet-liquidity prerequisite and exact-artifact review.
- World AgentBook: `LIVE/AGENTBOOK`.
- World Sandbox: **GREEN real non-production SANDBOX evidence** on `65383c83626a7121a6f47a3c88ac69b1304b363f`; SEC-WORLD-005 remains closed. Do not relabel it as production identity or booking authority.
- World PR #43 loopback/browser-Origin cleanup: independently **SECURITY CLEAN** at owner `ccb07e45888a3c15ee691a5db7465029d76f4c7f`, attacker `6e7523a4597ff3e0434758e9412c399ce8a819be`, run `34558923596` SUCCESS. No repeat Sandbox phone proof is needed.
- World signed recovery route: `CI/READY`, NOT LIVE/SIGNED-ROUTE; real registered-agent execution remains RED.
- Ledger SEC-LEDGER-005: independently **CLOSED CI/CONFIGURED**.
- Ledger SEC-LEDGER-006: independently **CLOSED CI/CONFIGURED** on owner `a1126a0e7d2e5bb679914b0409209799520f8646`; attacker `7e03f28ad0182ff1aec112a8a05ddd5a2bfcf914`; retest `34555366707` SUCCESS.
- Ledger physical qualification tooling/runbook: **CI GREEN / human-ready** on `7ac9e8ea3ba8a51ff3ec889774fd8f8724677b4d`, Continuity `34558524222` SUCCESS.
- Ledger `LIVE/DEVICE`: RED until real identical-mandate approve plus reject/cancel evidence is captured.
- Full Ledger→World→Hedera E2E: RED / missing; final code must preserve guarded current-authority loading and fail-closed stale-state semantics.

## Final submission packet readiness

- **Public README before/after: RED.** The held integration README still presents the pre-event Week 5 Hedera submission. Before lock, publish one final ETHOnline README that clearly separates the immutable baseline from the new Delegated Recovery work and links only evidence valid for the final integrated candidate.
- **Stable final integrated deployment: RED.** `https://yourturn-sage.vercel.app` is the pre-event Week 5 surface, not the final integrated ETHOnline candidate. PR #42's readiness preview also hit the Vercel free-tier daily deployment limit. Do not substitute a stale baseline URL or unqualified sponsor preview for the final stable reviewer URL.
- **Final video: RED.** No final judge-facing video is pinned yet; verify any applicable duration rule before lock.
- **Screenshots: PARTIAL.** Golden YT-01→08/XC-01 rendered product evidence exists, but final integrated sponsor-backed screenshots/receipt evidence do not.
- **Submission fields: RED.** Final project description, Continuity before/after, exactly three partner selections, repo/demo/evidence links, stable deployment URL and final media are not locked.
- **Evidence pack: RED.** The contract exists, but Hedera 45-USDC LIVE evidence, World signed-route/canonical-mandate bridge, Ledger LIVE/DEVICE evidence, sponsor-backed fixture replacement and the final integrated adversarial E2E are still missing.

Any newer truth must update `manifest.json` and the relevant evidence slot together; prose alone does not upgrade evidence.
