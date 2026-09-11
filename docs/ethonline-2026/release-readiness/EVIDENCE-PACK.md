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

The current head pins the physical qualification contract at `docs/ethonline-2026/ledger/DEVICE_QUALIFICATION_RUNBOOK.md`: one identical server-prepared Recovery Mandate is intended to pass through on-device reject → host cancel → on-device approve, followed by reviewer-safe bundle checks and downstream wrong-signature/single-activation/replay checks. The contract/tooling is **CI GREEN**, but the real ceremony remains **PAUSED BY A SEPARATE DEPENDENCY/RUNTIME SECURITY HOLD**. Local public-address verification succeeded and was redacted; it is not a Recovery Mandate signature, activation, or `LIVE/DEVICE` proof.

The current local remediation candidate is **v2 `369ea0d13d84abb61bad9368ea9d96acdd2dbdfd`**, superseding `cdedb342...`. Builder report #2 comment `5637571899` claims the corrected `qualification-contract-check`, lock-enforcing helper `npm ci`, helper 0-vulnerability result and safe local battery. Those are **BUILD/LOCAL builder evidence only**: #2 comment `5637990536` confirms the exact v2 source/locks are not yet GitHub-reconstructable. Independent Security #16 comment `5638105252` additionally requires exact-source/runtime review and explicit loopback binding, or an equivalent fail-closed local transport/origin boundary with executable non-loopback denial, before physical release. It also records `ws@7.5.11` as an available 7.x security-backport candidate needing exact-lock review; protobuf/Hedera SDK residuals are runtime-present, but the critical crafted-schema RCE is not currently demonstrated reachable through the ceremony. This does not reopen SEC-LEDGER-005/006 and does not establish compromise. Do not load ceremony credentials, start the credential-bearing ceremony target, sign/activate a mandate, or present the runbook as human-ready until exact v2 source, runtime/dependency and local-transport conditions are independently cleared. Physical identical-mandate DMK approve plus reject/cancel remains RED until that clearance and a successful real session.

### 03 — World requester proof
Required:
- `LIVE/AGENTBOOK` registration/resolution evidence;
- real World ID Sandbox proof with successful World backend verification and reviewer-safe evidence;
- actual locally signed registered-agent recovery-route execution evidence before `LIVE/SIGNED-ROUTE`;
- exact requester→delegated-agent match;
- privacy proof: `humanIdExposed:false` or equivalent public boundary;
- a durable idempotent/reconcilable operation boundary proving an authenticated request cannot strand partially committed booking/Hedera effects behind a consumed replay token;
- evidence that final authority came from the Ledger Recovery Mandate projection, not branch-local legacy approval scaffolding.

Current Sandbox truth: SEC-WORLD-005 is independently **CLOSED at CI/CONFIGURED** by run `34547005448`. The required cross-device Sandbox proof is **GREEN as real non-production SANDBOX evidence** on `feature/ethonline-world-sandbox-proof@65383c83626a7121a6f47a3c88ac69b1304b363f`, with qualifying repaired-runtime proof lineage `ff0e2cd0eec1ede1d4e28c2e1a99603e7832177f` and exact-head Continuity `34549541999` SUCCESS. The exercised path was signed RP request → YourTurn desktop harness → QR/deep-link → iOS World ID Sandbox app → user acceptance/verification → proof returned to YourTurn → YourTurn backend → World `POST /api/v4/verify/{rp_id}` → success. Reviewer-visible result was `Sandbox proof verified`. No RP private key, raw proof, nullifier, connector URI, or raw World human identifier is published/committed.

PR #43 browser-Origin cleanup at `ccb07e45888a3c15ee691a5db7465029d76f4c7f`, owner Continuity `34553728277` SUCCESS, is independently **SECURITY CLEAN** for its changed guard semantics. Independent attacker `feature/ethonline-security-world-origin-regression@6e7523a4597ff3e0434758e9412c399ce8a819be`; Continuity `34558923596`, job `103137419536` — SUCCESS. Intended `localhost`/`127.0.0.1` aliases are accepted only on matching scheme + effective port; wrong scheme/port, non-loopback and suffix-confusion hosts, `Origin:null`, generic-dev/production activation, and non-loopback TCP fail closed. This does not reopen or require repeating the completed Sandbox phone proof.

Base World head `8aff17268adbad8e52b4b077c85bbe50034d6c13` is still CI-green; latest exact-head Continuity `34622414540` SUCCESS. The registered-agent recovery route remains **CI/READY, NOT LIVE/SIGNED-ROUTE**. Security has issued the explicit runtime ruling: the **local signer process is narrowly cleared only for local credential loading/signature preparation**, while the **credential-bearing target app remains HOLD**.

The target HOLD is independently justified by **SEC-WORLD-006 — MEDIUM / OPEN**. Independent attacker `feature/ethonline-security-world-hcs-partial@b6f35a78d2b1a464aab82cd5cbd91fcbec6e53a5`, Continuity `34622702126`, job `103340281661` — SUCCESS. Fault injection proves `create_listing` can persist the active listing/slot-listing state before a later signed Hedera HCS submission fails; `cancel_release` can commit the refund/NFT transfer before burn or HCS audit failure, and can commit transfer+burn before HCS audit failure. The request then rejects while durable effects remain. Because the World AgentKit replay nonce is consumed before the downstream booking operation, the same signed request cannot simply be replayed to recover from that partial commit. This is not an auth bypass or key disclosure, and it does not reopen SEC-WORLD-005, but it is an integration-blocking integrity/failure-recovery defect.

First repair `4dd5cdc8d507991464cad093b4f6492cfa87cb6f`, parent/base `8aff17268adbad8e52b4b077c85bbe50034d6c13`, exactly one commit ahead, remains **CANDIDATE/LOCAL-SYNTHETIC only** and **FAILED independent Security retest**. Builder-side synthetic tests covered listing-HCS failure, burn-after-transfer, HCS-after-transfer+burn, unknown transfer receipt and immediate concurrent retry, but #16 comment `5638843971` reproduced a lease-expiry stale-writer failure: the candidate uses a 600-second execution lease while later durable transitions are not fenced by the current lease/generation/revision; an expired worker can return after a successor reconciles/advances the operation and overwrite the successor's newer receipts/state. The independent synthetic fixture erased newer burn/audit success back to pending/running state. This establishes stale-progress clobbering; it does **not** establish a proven duplicate refund or burn.

Exact successor `0a4127a413dba7232c226454570e42b08788b7b3` now exists as a deliberately unreferenced GitHub-retrievable source handoff, parented on `4dd5cdc8...` and two commits ahead / zero behind the published World base. The exact delta is limited to `lib/store/recovery-operations.ts`, `lib/world-agentkit/recovery-saga.ts`, and `scripts/world-sec-world-006-stale-writer-regression.mjs`; it adds durable `revision`, exact-operation lease-token binding, Redis Lua atomic save fencing on current lease token + expected revision, and a focused stale-writer regression. It has zero statuses/workflow runs and remains **CANDIDATE / REVIEWABLE SOURCE / LOCAL-SYNTHETIC**, not adopted, green, or LIVE. Independent stale-writer rollover plus the original SEC-WORLD-006 partial-failure/reconcile/concurrency matrix retest is requested in #16 comment `5639446526`. The credential-bearing target remains HOLD and SEC-WORLD-006 remains OPEN until clean independent closure and separately reviewed adoption. The unpublished proof-response hardening candidate remains **LOCAL/FIXTURE** only and is a separate non-qualifying change.

### 04 — Hedera policy + settlement
Required for the canonical customer-visible Hedera proof:
- 32-USDC below-minimum BLOCK evidence with no booking/value movement;
- 45-USDC LIVE/TESTNET transaction reference;
- independent decode/review proving the exact intended booking movement + exact USDC settlement with no widening;
- receipt plus Mirror/public final-state reconciliation;
- replay/idempotency boundaries stated exactly;
- explicit 40-minimum / 45-success distinction.

**Current status: GREEN for the exact Hedera transaction-boundary claim.**

Qualified sponsor head: `feature/ethonline-hedera@411f703e164cac82b5498c1f25a2cf21af7bc4be`.

Exact evidence:
- public Hedera Testnet transaction `0.0.8504405@1789139309.785362819`;
- exact-head Continuity `34616924464` — SUCCESS;
- existing-live-proof verification `34614623240` — SUCCESS;
- independent attacker `12aafe157a3f854fd507b99439ef864060310165`;
- Security run `34617031728`, job `103321398168` — SUCCESS;
- Security artifact `10270457474`;
- disposition #16 comment `5636886313`.

The independent review re-read the public transaction and required global transfer cardinality, establishing exactly one BOOKED NFT movement (`0.0.8505698`, serial `213`, `0.0.8504300 -> 0.0.8504715`, `is_approval=true`) and exactly two fungible entries, both testnet USDC `0.0.429274`, moving exactly 45 USDC from `0.0.8504405` to `0.0.8504300`. It rejected extra NFT, extra unrelated token, wrong amount and wrong receiver variants. Final public state reconciled with serial `213` at `0.0.8504715` and the observed USDC balances `34,980,000` / `45,020,000` base units for payer/receiver respectively.

The exact **32 USDC** invocation independently returned `BLOCK / BELOW_MINIMUM_RECOVERY` with 0 nonce reservations and no `RETURN_BYTES`; the exact **45 USDC** invocation prepared successfully and its decoded bytes passed the exact NFT + USDC semantic validator.

H0/H1 retain their independently reviewed `LIVE/TESTNET` claims. H2 guarded policy/replay remains separately `CI/LOCAL + Security`; do not relabel every H2 component as LIVE merely because the settlement transaction is live.

Allowed wording is transaction-scoped only: **“On Hedera Testnet, YourTurn atomically settled the booking NFT and 45 USDC in one successful Hedera transaction.”** The entire recovery workflow is not proven atomic. The allowance setup is separate, this LIVE proof used a one-shot in-process replay store while durable Redis replay remains separately CI/security-cleared, and final Ledger→World→Hedera adversarial E2E remains RED.

### 05 — Provider / acquirer reconciliation
Required:
- Studio A provider rule exists before recovery and is load-bearing;
- Bob satisfies eligibility/payment requirements;
- Bob becomes authoritative holder;
- Bob sees a normal usable Friday Yoga booking;
- Studio A recognizes Bob for fulfilment/check-in;
- Maya no longer has the usable booking and received 45 USDC.

A Hedera transaction receipt alone does not fill this slot. XC-01 is Golden product truth, but sponsor-dependent transitions remain fixture until the final integrated runtime proves them.

### 06 — Integrated adversarial E2E
Required:
- exact integrated SHA;
- pass/block outcomes for Ledger reject/cancel, wrong World agent, World partial-commit/fault-injection recovery, 32-USDC offer, stale/revoked/expired/provider-invalid state, post-activation authority staleness, 45-USDC success and replay;
- proof that an injected failure after any durable World-protected effect is represented as partial/reconciling and can resume/reconcile idempotently without duplicate booking/value movement;
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
- Hedera H2 guarded policy/replay: `CI/LOCAL + Security` for those exact claims.
- Hedera canonical new booking NFT + 45-USDC recovery: **GREEN `LIVE/TESTNET + independent Security` at the single settlement-transaction boundary** on `411f703e164cac82b5498c1f25a2cf21af7bc4be`; tx `0.0.8504405@1789139309.785362819`; Security run `34617031728`, artifact `10270457474`.
- World AgentBook: `LIVE/AGENTBOOK`.
- World Sandbox: **GREEN real non-production SANDBOX evidence** on `65383c83626a7121a6f47a3c88ac69b1304b363f`; SEC-WORLD-005 remains closed. Do not relabel it as production identity or booking authority.
- World PR #43 loopback/browser-Origin cleanup: independently **SECURITY CLEAN** at owner `ccb07e45888a3c15ee691a5db7465029d76f4c7f`, attacker `6e7523a4597ff3e0434758e9412c399ce8a819be`, run `34558923596` SUCCESS. No repeat Sandbox phone proof is needed.
- World signed recovery route: `CI/READY`, NOT LIVE/SIGNED-ROUTE. Local signer process is narrowly cleared for credential loading/signature preparation only; the credential-bearing target app remains HOLD.
- **SEC-WORLD-006: OPEN/MEDIUM, integration-blocking.** Base attacker `b6f35a78d2b1a464aab82cd5cbd91fcbec6e53a5`, run `34622702126`, job `103340281661` proves partial commits in `create_listing` and `cancel_release` can survive later Hedera/burn/audit failure while the request fails and the World nonce is already consumed. First repair `4dd5cdc8d507991464cad093b4f6492cfa87cb6f` failed independent lease-expiry stale-writer retest in #16 comment `5638843971`. Exact successor `0a4127a413dba7232c226454570e42b08788b7b3` now exists but remains unreferenced **CANDIDATE / REVIEWABLE SOURCE / LOCAL-SYNTHETIC** with zero CI/status/workflow runs; independent stale-writer + original full-matrix retest is pending under #16 comment `5639446526`. SEC-WORLD-006 stays OPEN and no LIVE/SIGNED-ROUTE execution is authorized.
- Ledger SEC-LEDGER-005: independently **CLOSED CI/CONFIGURED**.
- Ledger SEC-LEDGER-006: independently **CLOSED CI/CONFIGURED** on owner `a1126a0e7d2e5bb679914b0409209799520f8646`; attacker `7e03f28ad0182ff1aec112a8a05ddd5a2bfcf914`; retest `34555366707` SUCCESS.
- Ledger physical qualification contract/tooling: **CI GREEN** on `7ac9e8ea3ba8a51ff3ec889774fd8f8724677b4d`, Continuity `34558524222` SUCCESS. Current v2 remediation `369ea0d13d84abb61bad9368ea9d96acdd2dbdfd` remains BUILD/LOCAL builder evidence only, is not GitHub-reconstructable (#2 comment `5637990536`), and lacks independent runtime plus loopback/local-origin clearance (#16 comment `5638105252`). Public-address verification is not mandate/device evidence.
- Ledger `LIVE/DEVICE`: RED until exact-source/runtime/transport Security clearance and real identical-mandate approve plus reject/cancel evidence are captured.
- Full Ledger→World→Hedera E2E: RED / missing; final code must preserve guarded current-authority loading, World partial-commit reconciliation/idempotency, and fail-closed stale-state semantics.

## Final submission packet readiness

- **Public README before/after: RED.** The held integration README still presents the pre-event Week 5 Hedera submission. Before lock, publish one final ETHOnline README that clearly separates the immutable baseline from the new Delegated Recovery work and links only evidence valid for the final integrated candidate.
- **Stable final integrated deployment: RED.** `https://yourturn-sage.vercel.app` is the pre-event Week 5 surface, not the final integrated ETHOnline candidate. PR #42's readiness preview also hit the Vercel free-tier daily deployment limit. Do not substitute a stale baseline URL or unqualified sponsor preview for the final stable reviewer URL.
- **Final video: RED.** No final judge-facing video is pinned yet; verify any applicable duration rule before lock.
- **Screenshots: PARTIAL.** Golden YT-01→08/XC-01 rendered product evidence exists, but final integrated sponsor-backed screenshots/receipt evidence do not.
- **Submission fields: RED.** Final project description, Continuity before/after, exactly three partner selections, repo/demo/evidence links, stable deployment URL and final media are not locked.
- **Evidence pack: RED.** Hedera's canonical 45-USDC transaction-boundary proof is filled. The pack remains RED because World SEC-WORLD-006 remains open: first repair `4dd5cdc8...` failed independent stale-writer retest and exact successor `0a4127a4...` remains unreferenced REVIEWABLE SOURCE / LOCAL-SYNTHETIC pending independent full-matrix closure/adoption; World LIVE/SIGNED-ROUTE/canonical-mandate bridge is missing; Ledger v2 `369ea0d1...` still needs exact-source/runtime/loopback clearance plus LIVE/DEVICE evidence; sponsor-backed fixture replacement and the final integrated adversarial E2E are still missing.

Any newer truth must update `manifest.json` and the relevant evidence slot together; prose alone does not upgrade evidence.