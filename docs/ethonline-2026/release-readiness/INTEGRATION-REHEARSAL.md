# ETHOnline Integration Rehearsal

This is a **read-only merge forecast and integration plan**. It does not authorize importing any unqualified sponsor head, merging default/submission, or changing Golden behavior.

## Fixed anchors

- Foundation: `89ded956e67c343b7abefc36e33044c6064a7798`
- Current held integration: `1bf50c02dd3d925f2db03bd9ba0bbac4713c1380`
- Golden YT-01→YT-04 executable: `24bbf0d7516499069f5102ae4bf724b0cb376b94`
- Golden YT-05→YT-08 executable: `d5309a96d532ee107011c2a5cefc3000b9e4932f`
- Golden XC-01 executable: `046ad8d3cad863813dca7a3fc9cb09abaf5939e0`
- Hedera candidate head: `40890aab7729075edbf5efac5f5367f4b5a022e1`
- World base candidate head: `2ab04f4420cccc2c090cd5f5634e447d399eb139`
- World Sandbox evidence head: `65383c83626a7121a6f47a3c88ac69b1304b363f`
- Ledger candidate head: `96d513ef1286cf06192315263039d631b91a0d18`

Only exact heads that later satisfy the relevant Security/evidence gates may be integrated. These candidate SHAs are pins for rehearsal, not automatic integration approval. The World Sandbox evidence head is a proof/tooling lineage and is not itself a wholesale integration authorization.

## Git ancestry / forecast observations

Direct GitHub comparisons against the frozen foundation established the sponsor branches as additive event work and identified shared-file collision hotspots. Branch recency is never qualification. The held integration and Golden product branches are deliberately not treated as simple fast-forward sources; qualified behavior must be curated in dependency order.

## Known collision / shared-file hotspots

### `package.json`
All three sponsor branches modify `package.json` relative to foundation:

- Hedera adds sponsor proof/runtime scripts.
- World adds AgentKit/AgentBook/signed-route/Sandbox scripts and dependencies.
- Ledger adds Recovery Mandate/device scripts.

**Plan:** assemble script/dependency deltas deliberately. Never resolve by taking one branch's complete `package.json` over another. Re-run `npm ci --legacy-peer-deps`, production build and exact sponsor checks after composition.

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
3. provider policy + mandate + acquirer eligibility/payment resolve before Hedera action preparation;
4. Hedera enforces exact booking/amount/receiver/payer/replay semantics and settles/proves the result.

The World branch-local `ApprovalGrantClaims` path is not permitted to become a parallel final authority source.

## Current sponsor qualification boundaries

### Ledger
Owner `96d513ef1286cf06192315263039d631b91a0d18`; owner Continuity `34547247102` SUCCESS. Independent attacker `a0aff3978e2a8c6022bf88207174a518141c5aeb`, run `34551214063` SUCCESS, **CLOSED SEC-LEDGER-005 at CI/CONFIGURED** for the last-validation/final-write race.

The same attack opened **SEC-LEDGER-006 MEDIUM / OPEN**: after legitimate activation, a relevant later booking mutation can advance the authoritative version while `loadActiveRecoveryMandate()` still returns the captured old record as active. This blocks final downstream authority consumption until repaired/retested. It does not by itself block collecting orthogonal physical DMK approve/reject provenance. LIVE/DEVICE remains RED until that real ceremony exists.

### World
AgentBook production registration/resolution is **LIVE/AGENTBOOK**. SEC-WORLD-004 is independently closed for the current base signed-request gate. The registered-agent recovery route remains **CI/READY, NOT LIVE/SIGNED-ROUTE**.

World ID Sandbox is already **GREEN real non-production SANDBOX evidence** on `feature/ethonline-world-sandbox-proof@65383c83626a7121a6f47a3c88ac69b1304b363f`, exact-head Continuity `34549541999` SUCCESS; SEC-WORLD-005 is closed. The real iOS Proof of Human round trip returned to YourTurn and World v4 backend verification succeeded. PR #43's remaining localhost/127.0.0.1 browser-Origin cleanup does not negate that proof and must not weaken the cleared loopback boundary.

### Hedera
H0/H1 retain their independently accepted LIVE/TESTNET evidence. H2/new NFT+USDC recovery at `40890aab7729075edbf5efac5f5367f4b5a022e1` is **CI/LOCAL + Security**, while canonical 45-USDC LIVE/TESTNET evidence remains RED pending +25.02 testnet USDC to `0.0.8504405`, execution and independent exact-artifact review. No `atomic` claim until one verified transaction proves both movements.

## Golden UX integration forecast

Golden YT-05→YT-08 and XC-01 define the reviewed customer/provider/acquirer contract, not sponsor execution evidence. Sponsor wiring should replace fixture state transitions behind that contract. Do not cherry-pick later unreviewed UX head state merely because it is newer.

Use `docs/product-workbench/integration-ledger.md` as the line-by-line fixture→real interface acceptance map before calling any Golden transition integrated.

## Intended integration dependency order

1. **Hold current integration** until a coherent sponsor slice is qualified; no wholesale branch merge.
2. **Ledger downstream authority lifecycle:** repair and independently close SEC-LEDGER-006 before `mandate-active:*` is consumed as current final authority. Physical identical-mandate DMK approve/reject evidence may be collected orthogonally, but remains RED until captured.
3. **World signed requester path:** execute the real registered-agent signed route, then bind expected agent/booking/action scope to the canonical current Ledger mandate projection. Sandbox proof is already complete and must remain a separate evidence class.
4. **Hedera H2/USDC:** after external testnet liquidity exists, execute the canonical 45-USDC LIVE/TESTNET proof and independently review the exact artifact before importing that surface.
5. **Golden YT-05→YT-08 + XC-01 behavior:** wire fixture transitions to qualified runtime states using the acceptance ledger.
6. Run one integrated adversarial E2E before any submission lock.

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
- Ledger authority can activate against stale/unversioned booking state;
- an already-active Ledger mandate can be loaded/consumed after its captured authoritative state becomes stale;
- Hedera prepared/submitted semantics differ from the Golden 40-min / 32-block / 45-success contract;
- Bob/payment/provider rules are implicit or contradictory;
- a conflict resolution drops a security/evidence test;
- success UI would be shown before authoritative settlement/ownership reconciliation.
