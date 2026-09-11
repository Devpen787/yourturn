# Product Workbench Handoff

## Current objective — #44 UX integrity completion

Branch: `ux/yourturn-product-workbench`. Candidate route: `/product-preview`.
Read `completion-contract.md`, build issue #44, latest independent Product Reviewer #34, and exact branch CI before acting. Do not return to old architecture-only, XC-01 header or receipt-copy tasks.

## Latest executable increment — R1a holder repair

Exact executable: **`8632b81a10f4501db7914b653da493966b04e250`**.

Devinson explicitly approved proceeding after the R0 evidence: **“I approve - please keep going.”** The permission is for the bounded engineering successor, not an independent reviewer verdict, Golden freeze, extension of the earlier temporary freeze delegation, or sponsor/release authority. #34 has not been impersonated or bypassed for final adoption.

Implemented:
- holder-only versioned fixture facts are stored independently of URL location;
- Maya's completed recovery survives header/body return, reload, Back and Forward;
- active and pending recovery remain visible in bookings/detail, with an explicit resume path;
- initial/replacement approval, rejection and cancellation retain their existing authority semantics; duplicate fixture completion is idempotent;
- a forged/stale holder success or approval URL cannot create facts;
- unavailable/corrupt/failed browser storage fails closed instead of restoring a fictitious owned booking;
- preview actor names are visible on mobile; preview navigation targets are at least 44px.

Implementation and scope details: `r1a-holder-repair.md`. The holder adapter is **not** a live authority source, complete multi-actor scenario, or cross-tab race solution. Bob/provider fixture clients are still unchanged and are not yet projections of this store. Extend the coherent model in subsequent R1 work; do not introduce another independent actor-specific success store.

## Exact verification

- Continuity `34611662531`: **SUCCESS**, including production build.
- Visual `34611656533`: **FAILURE only at the retained R0 integrity step**.
- Production build/start, all four existing segment suites, 19 holder model tests and all **12 R1a browser executions**: **PASS**.
- Unchanged R0 suite: **16 PASS / 16 FAIL**, improved from **5 PASS / 27 FAIL**. These are viewport executions, not counts of unique defects. No setup/runtime/evidence errors or console errors in the two new browser reports.
- Artifact `product-workbench-rendered-evidence` / **`10267984840`**, bound to exact `8632b81...`.
- Verified ZIP SHA256: `18fdc26b0a4ec0a3e6825d145e3dcab9f83f0327058a315e5171b2cc9a78f139`.
- 218 PNGs: 142 segment checkpoints, 64 R0 before/after images, 12 R1a images; exact-head JSON under `integrity/` and `holder-navigation/`.
- Builder inspected actual selected desktop/mobile recovered, active, pending-resumed, error and entry images. This is not independent #34 clearance of the whole artifact.

The 11 newly passing R0 executions are Maya recovered-header, active-header, recovery reload, authorization Back/Forward at both widths, plus three visible mobile identities. Remaining 16 failures are Bob payment reload/history, Bob check-in header return, provider fulfilment header return, and B1–B4 at both widths. No expected-failure waiver or `continue-on-error` was added.

## Next concrete work

1. Finish R1 by making Bob payment/ownership/check-in and provider attendance/fulfilment persistent independent of locations, with correct history and resume. Derive role-specific screens from one coherent fixture lifecycle; the holder repair alone is not a shared-booking proof.
2. Consume any concrete #34 findings on R1a, preserving the passing holder tests and original authority assertions. Do not reimplement the old fixed Maya blocker or widen into a new journey family.
3. Then B1–B4, R3 functional requested scope and R4 single-seed cross-actor evidence, as specified in `completion-contract.md`.
4. R5 still requires all material gates passing, independent exact-head PNG/interaction review and valid human approval before freeze. No new Golden record has been created.

## Historical Golden records

YT-01→04 `24bbf0d7516499069f5102ae4bf724b0cb376b94`; YT-05→08 `d5309a96d532ee107011c2a5cefc3000b9e4932f`; XC-01 `046ad8d3cad863813dca7a3fc9cb09abaf5939e0`. Their files under `golden/` are unchanged. The R1a executable is an explicitly bounded successor candidate, not a silent historical rewrite. XC-02/XC-03 remain fixture segments, not a frozen connected product.

## Binding and execution boundaries

Preserve YourTurn visual language, `/product-preview`, Friday Yoga scope, 40-USDC minimum / 32 blocked / 45 recovered, frozen expiry/no-cancel terms, replacement reject/cancel preserving existing authority, and `provider rules ∩ holder mandate ∩ acquirer eligibility/payment`. Provider policy is pre-defined/load-bearing, without per-recovery staff approval.

Use `DESIGN.md`, `GLOSSARY.md`, `CRAFT.md`, `invariants.md`, `review-checklist.md`, stakeholder docs and `integration-ledger.md`. Attendance, service fulfilment and recovery settlement are separate facts. Browser fixture state is never live authorization. Sponsor/security readiness stays independently owned by #5/#7/#8/#16.

GitHub Actions is the verified full-app browser/build environment. Local model/type/syntax tests also ran; local full-app clone remains unavailable due DNS. No unattended schedule, background worker acknowledgment, deployment, spending, secret action, sponsor/backend semantic change or self-certified Golden is claimed.
