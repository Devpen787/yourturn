# ETHOnline Integration Rehearsal

This is a **read-only merge forecast and integration plan**. It does not authorize importing any unqualified sponsor head, merging default/submission, or changing Golden behavior.

## Fixed anchors

- Foundation: `89ded956e67c343b7abefc36e33044c6064a7798`
- Current held integration: `1bf50c02dd3d925f2db03bd9ba0bbac4713c1380`
- Golden YT-01→YT-04 executable: `24bbf0d7516499069f5102ae4bf724b0cb376b94`
- Golden YT-05→YT-08 executable: `d5309a96d532ee107011c2a5cefc3000b9e4932f`
- Golden XC-01 executable: `046ad8d3cad863813dca7a3fc9cb09abaf5939e0`
- Hedera qualified downstream head: `411f703e164cac82b5498c1f25a2cf21af7bc4be`
- World base candidate head: `8aff17268adbad8e52b4b077c85bbe50034d6c13`
- World Sandbox evidence head: `65383c83626a7121a6f47a3c88ac69b1304b363f`
- World Sandbox cleanup head: `ccb07e45888a3c15ee691a5db7465029d76f4c7f`
- Ledger candidate head: `7ac9e8ea3ba8a51ff3ec889774fd8f8724677b4d`

Only exact heads that satisfy the relevant Security/evidence gates may become load-bearing in the integrated candidate. These SHAs are pins for rehearsal, not wholesale merge authorization. The World Sandbox evidence head is a proof/tooling lineage and is not itself a wholesale integration authorization.

## Git ancestry / forecast observations

Direct GitHub comparisons against the frozen foundation established the sponsor branches as additive event work and identified shared-file collision hotspots. Branch recency is never qualification. The held integration and Golden product branches are deliberately not treated as simple fast-forward sources; qualified behavior must be curated in dependency order.

## Known collision / shared-file hotspots

### `package.json`
All three sponsor branches modify `package.json` relative to foundation:

- Hedera adds sponsor proof/runtime scripts.
- World adds AgentKit/AgentBook/signed-route/Sandbox scripts and dependencies.
- Ledger adds Recovery Mandate/device scripts.

**Plan:** assemble script/dependency deltas deliberately. Never resolve by taking one branch's complete `package.json` over another. Re-run `npm ci --legacy-peer-deps`, production build and exact sponsor checks after composition. Dependency/security disposition is now itself a gating concern for the Ledger device runtime; green lifecycle CI cannot be treated as blanket runtime-dependency clearance.

### `package-lock.json`
World modifies the lockfile; other sponsor branches may depend on the existing locked Hedera/Hiero stack.

**Plan:** regenerate/resolve only from the deliberate final `package.json` dependency set. Treat a large lockfile rewrite as build evidence requiring exact-head CI, not clerical conflict resolution.

### `.github/workflows/ethonline-ci.yml`
Hedera, World and Ledger each modify the shared Continuity workflow.

**Plan:** compose required checks into one final gate. Do not let a conflict resolution silently drop another sponsor's security/contract tests. Final gate should run the union of qualified checks, plus submission readiness preflight.

### `docs/ethonline-2026/progress.md`
All sponsor lanes modify this progress file.

**Plan:** do not use it as an executable integration source. Reconcile evidence truth after behavior is integrated; never let documentation conflict resolution drive code selection.

### Existing product/runtime seams
World modifies `app/api/agent/confirm/route.ts`; Ledger adds `app/api/ledger/recovery-mandate/*`; Hedera adds policy/RETURN_BYTES/settlement libraries. These do not currently collide at file level, but they **must collide semantically** in the final authority chain.

The integration contract is:

1. canonical active Ledger Recovery Mandate projection is the holder-authority source and must itself be current/fail-closed against mutable authoritative state;
2. World verifies that the signed requester is the exact human-backed delegated agent bound to that mandate;
3. World/booking execution uses a durable idempotent/reconcilable operation boundary so downstream partial effects cannot be stranded behind a consumed World replay token;
4. provider policy + mandate + acquirer eligibility/payment resolve before Hedera action preparation;
5. Hedera enforces exact booking/amount/receiver/payer/replay semantics and settles/proves the result.

The World branch-local `ApprovalGrantClaims` path is not permitted to become a parallel final authority source.

## Current sponsor qualification boundaries

### Ledger
Current branch `feature/ethonline-ledger@7ac9e8ea3ba8a51ff3ec889774fd8f8724677b4d`; exact-head Continuity `34558524222` SUCCESS. SEC-LEDGER-005 remains independently CLOSED at CI/CONFIGURED.

SEC-LEDGER-006 is independently **CLOSED at CI/CONFIGURED** on the Security-accepted owner `a1126a0e7d2e5bb679914b0409209799520f8646` by attacker `feature/ethonline-security-ledger-006-retest@7e03f28ad0182ff1aec112a8a05ddd5a2bfcf914`, run `34555366707`, job `103126811462` — SUCCESS. The guarded active-authority loader compares the captured stable even authority-state version with current authoritative state, revalidates current holder/status/provider-policy/listing predicates, rechecks the version after live validation, rejects odd/in-flight or missing-context state, and preserves one-shot replay. A raw `mandate-active:*` record is never sufficient authority.

The current branch also pins the physical qualification ceremony in `docs/ethonline-2026/ledger/DEVICE_QUALIFICATION_RUNBOOK.md`: the same server-prepared Recovery Mandate is intended to pass through device reject → host cancel → device approve, reviewer-safe evidence collection, then downstream wrong-signature/single-activation/replay checks. The contract is **CI GREEN**, but the physical session is **not currently human-ready**. Security #16 retains a precautionary dependency signing/app-start hold. The local remediation candidate `cdedb3422230bd568bd18c499556c09a0607e0dc` is builder-reported tested but is still not remotely reconstructable in GitHub, so the exact candidate cannot yet receive independent runtime clearance. A local public-address verification succeeded but created no mandate signature, activation, or DEVICE provenance. This separate hold does not reopen SEC-LEDGER-005/006 and does not prove compromise. Do not load ceremony credentials, start the ceremony app, sign/activate a mandate, or run the physical ceremony until bounded dependency triage/remediation and independent Security acceptance explicitly reopen an exact runtime graph. Physical identical-mandate DMK approve + reject/cancel remains RED. Final integrated code must preserve `loadActiveRecoveryMandate()` or an equivalent atomic guarded boundary.

### World
AgentBook production registration/resolution is **LIVE/AGENTBOOK**. SEC-WORLD-004 is independently closed for the current signed-request gate. Base World head `8aff17268adbad8e52b4b077c85bbe50034d6c13`; latest exact-head Continuity `34622414540` SUCCESS. The registered-agent recovery route remains **CI/READY, NOT LIVE/SIGNED-ROUTE**.

World ID Sandbox is **GREEN real non-production SANDBOX evidence** on `feature/ethonline-world-sandbox-proof@65383c83626a7121a6f47a3c88ac69b1304b363f`, exact-head Continuity `34549541999` SUCCESS; SEC-WORLD-005 remains closed. The real iOS Proof of Human round trip returned to YourTurn and World v4 backend verification succeeded.

PR #43 browser-Origin cleanup at `ccb07e45888a3c15ee691a5db7465029d76f4c7f`, owner Continuity `34553728277` SUCCESS, has passed bounded independent Security regression. Attacker `feature/ethonline-security-world-origin-regression@6e7523a4597ff3e0434758e9412c399ce8a819be`; Continuity `34558923596`, job `103137419536` — SUCCESS/CLEAN. Intended `localhost`/`127.0.0.1` aliases work only on matching scheme/effective port, while wrong scheme/port/non-loopback/suffix-confusion/`Origin:null`, generic-dev/production activation and non-loopback TCP fail closed. The completed Sandbox proof remains valid and does not need to be repeated.

**SEC-WORLD-006 is OPEN/MEDIUM and integration-blocking.** Independent attacker `feature/ethonline-security-world-hcs-partial@b6f35a78d2b1a464aab82cd5cbd91fcbec6e53a5`, Continuity `34622702126`, job `103340281661` — SUCCESS. Fault injection demonstrates two partial-commit classes on the current World-protected target path:

- `create_listing` can persist active listing/slot-listing state before the later signed Hedera HCS lifecycle event fails;
- `cancel_release` can commit refund/NFT transfer before a later burn or HCS audit fails, and can commit transfer+burn before HCS audit failure.

In those cases the API rejects after durable effects already exist. The World AgentKit nonce is consumed before the downstream booking operation, so the same signed request cannot be replayed as a recovery mechanism. Security therefore requires a durable idempotent recovery-operation/saga (or equivalent outbox/resume boundary) with step receipts and safe reconcile/resume semantics before this target can be cleared.

Security's explicit runtime ruling is now split: the **World local signer process is narrowly cleared for local credential loading/signature preparation only**; the **credential-bearing target app remains HOLD** because it reaches booking mutations plus `@hashgraph/sdk`/signed HTS-HCS behavior and is independently blocked by SEC-WORLD-006. This narrow signer clearance does not authorize a real signed mutation and creates no LIVE/SIGNED-ROUTE evidence. A bounded proof-response hardening candidate remains LOCAL/FIXTURE and unpublished; it cannot close SEC-WORLD-006 or upgrade the route until adopted/reviewed.

### Hedera
Hedera is now the **qualified downstream sponsor checkpoint** at `feature/ethonline-hedera@411f703e164cac82b5498c1f25a2cf21af7bc4be`.

Evidence boundary:

- H0: independently accepted `LIVE/TESTNET`.
- H1 `RETURN_BYTES`: independently accepted `LIVE/TESTNET`.
- H2 guarded policy/replay: remains `CI/LOCAL + Security` for those exact claims.
- Canonical new customer-visible booking NFT + 45-USDC settlement: **LIVE/TESTNET + independent Security at the single Hedera settlement-transaction boundary**.

Exact settlement evidence:

- public transaction `0.0.8504405@1789139309.785362819`;
- exact-head Continuity `34616924464` SUCCESS;
- existing-live-proof verification `34614623240` SUCCESS;
- independent attacker `12aafe157a3f854fd507b99439ef864060310165`;
- Security run `34617031728`, job `103321398168` SUCCESS;
- Security artifact `10270457474`;
- disposition #16 comment `5636886313`.

Independent review established exactly one BOOKED NFT transfer (`0.0.8505698`, serial `213`, `0.0.8504300 -> 0.0.8504715`) and exactly 45 testnet USDC (`0.0.429274`) moved from `0.0.8504405` to `0.0.8504300`, with no widened transfer side effects. The exact 32-USDC path remains blocked before mutation with 0 nonce reservations/no `RETURN_BYTES`.

Transaction-scoped atomic wording is permitted only for that one Hedera settlement transaction. Do not widen it to the entire recovery workflow. Final integrated Ledger→World→Hedera E2E remains outstanding.

## Golden UX integration forecast

Golden YT-05→YT-08 and XC-01 define the reviewed customer/provider/acquirer contract, not sponsor execution evidence. Sponsor wiring should replace fixture state transitions behind that contract. Do not cherry-pick later unreviewed UX head state merely because it is newer.

Use `docs/product-workbench/integration-ledger.md` as the line-by-line fixture→real interface acceptance map before calling any Golden transition integrated.

## Intended integration dependency order

1. **Hold current integration** until a coherent upstream authority slice is qualified; no wholesale branch merge.
2. **Ledger authority consumption:** software/security lifecycle is closed at CI/CONFIGURED, but first resolve the separate dependency-security hold and obtain independent Security acceptance of the exact runtime graph. Only then capture real identical-mandate DMK approve + reject/cancel evidence; when integration is authorized, preserve the guarded current-authority loader rather than raw active-state reads.
3. **World signed requester + execution path:** Sandbox is already complete and the local signer is narrowly cleared for preparation only. First repair SEC-WORLD-006 with a durable idempotent/reconcilable operation boundary and obtain independent retest/closure. Then adopt/review the bounded proof-response hardening. Only after the credential-bearing target is explicitly cleared may one real registered-agent signed mutation be executed, and final expected agent/booking/action scope must bind to the canonical current Ledger mandate projection.
4. **Hedera settlement layer:** the canonical 45-USDC transaction-boundary proof is already qualified. Do not rerun or spend merely for readiness. Once upstream Ledger→World authority becomes qualified, consume the pinned `411f703e...` downstream code/evidence checkpoint while preserving exact 40-min / 32-block / 45-success semantics and the narrow atomicity claim boundary.
5. **Golden YT-05→YT-08 + XC-01 behavior:** wire fixture transitions to qualified runtime states using the acceptance ledger.
6. Run one integrated adversarial E2E, including injected World partial-failure/reconcile cases, before any submission lock.

Independent sponsor proof work may proceed in parallel where safe; the order above governs when authority becomes load-bearing in the integrated candidate.

## Required checks after each curated import

- production build;
- existing continuity baseline guard;
- all sponsor-specific checks for imported surfaces;
- `npm run submission:preflight`;
- no Golden SHA/contract drift;
- no evidence-class promotion from fixture/CI to LIVE without an exact evidence reference;
- no mainnet/production target enabled;
- no secret values in logs/artifacts.

## Stop conditions

Stop integration and route the mismatch before proceeding if any of these occurs:

- sponsor code requires changing frozen Golden customer behavior;
- World needs a second independent holder authorization source;
- World can return a clean failure after durable listing/token/audit effects, or consumes replay before an operation can be safely resumed/reconciled;
- Ledger authority can activate against stale/unversioned booking state;
- integrated code bypasses the Security-cleared guarded current-authority loader or can consume an already-active mandate after its captured authoritative state becomes stale;
- Ledger device runtime/dependency graph is not independently cleared for the exact signing path;
- Hedera prepared/submitted semantics differ from the Golden 40-min / 32-block / 45-success contract or widen beyond the independently qualified transaction shape;
- Bob/payment/provider rules are implicit or contradictory;
- a conflict resolution drops a security/evidence test;
- success UI would be shown before authoritative settlement/ownership reconciliation.
