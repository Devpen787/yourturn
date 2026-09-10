# ETHOnline Integration Rehearsal

This is a **read-only merge forecast and integration plan**. It does not authorize importing any unqualified sponsor head, merging default/submission, or changing Golden behavior.

## Fixed anchors

- Foundation: `89ded956e67c343b7abefc36e33044c6064a7798`
- Current held integration: `1bf50c02dd3d925f2db03bd9ba0bbac4713c1380`
- Golden YT-01→YT-04 executable: `24bbf0d7516499069f5102ae4bf724b0cb376b94`
- Golden YT-05→YT-08 executable: `d5309a96d532ee107011c2a5cefc3000b9e4932f`
- Hedera candidate head: `40890aab7729075edbf5efac5f5367f4b5a022e1`
- World candidate head: `2ab04f4420cccc2c090cd5f5634e447d399eb139`
- Ledger candidate head: `dfb3fec6328c5db22aa6b6eb222b5e0a57f3b54a`

Only exact heads that later satisfy the relevant Security/evidence gates may be integrated. These candidate SHAs are pins for rehearsal, not automatic integration approval.

## Git ancestry / forecast observations

Direct GitHub comparisons against the frozen foundation show:

- Hedera: 45 commits ahead of foundation.
- World: 35 commits ahead of foundation.
- Ledger: 40 commits ahead of foundation.
- Golden YT-05→YT-08 and held integration are **diverged**, with foundation as merge base. Therefore the Golden executable must not be treated as a simple fast-forward onto integration.

This reinforces the existing policy: integrate curated, qualified behavior in dependency order rather than merging sponsor/UX branches wholesale.

## Known collision / shared-file hotspots

### `package.json`
All three sponsor branches modify `package.json` relative to foundation:

- Hedera adds sponsor proof/runtime scripts.
- World adds AgentKit/AgentBook/signed-route scripts and dependencies.
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

1. active Ledger Recovery Mandate is the holder-authority source;
2. World verifies that the signed requester is the exact human-backed delegated agent bound to that mandate;
3. provider policy + mandate + acquirer eligibility/payment resolve before Hedera action preparation;
4. Hedera enforces exact booking/amount/receiver/payer/replay semantics and settles/proves the result.

The World branch-local `ApprovalGrantClaims` path is not permitted to become a parallel final authority source.

## Golden UX integration forecast

The Golden YT-05→YT-08 executable changes/adds, relative to held integration, the canonical `/product-preview`, shared landing/header presentation, product-workbench docs, visual workflow and visual-check script.

**Integration rule:** Golden behavior/presentation is the customer contract. Sponsor wiring should replace fixture state transitions behind that contract. Do not cherry-pick later unreviewed UX head state merely because it is newer.

Use `docs/product-workbench/integration-ledger.md` as the line-by-line fixture→real interface acceptance map before calling any Golden transition integrated.

## Intended integration dependency order

1. **Hold current integration** until one coherent sponsor slice is qualified.
2. **Hedera H2/USDC** only after 45-USDC LIVE/TESTNET proof + independent exact-artifact review.
3. **Ledger runtime authority** only after SEC-LEDGER-005 closes; device evidence remains a separate qualification gate.
4. **World signed requester path** only after actual signed-route execution + Sandbox proof and after its authority source is mapped to canonical Ledger mandate state.
5. **Golden YT-05→YT-08 behavior** wired to real states using the acceptance ledger; fixture labels/evidence remain until each transition's real proof exists.
6. **XC-01 acquirer/provider slice** only as needed to complete `provider rules ∩ holder mandate ∩ acquirer eligibility/payment` and Bob/Studio-A reconciliation.
7. Run one integrated adversarial E2E before any submission lock.

This order may be adjusted only if a newly qualified dependency requires it; branch recency alone is not a reason.

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
- Hedera prepared/submitted semantics differ from the Golden 40-min / 32-block / 45-success contract;
- Bob/payment/provider rules are implicit or contradictory;
- a conflict resolution drops a security/evidence test;
- success UI would be shown before authoritative settlement/ownership reconciliation.
