# UX integrity completion contract — #44

Active build issue: #44. Independent reviewer: #34. Draft PR: #33.
Branch: `ux/yourturn-product-workbench`. Single candidate route: `/product-preview`.

## Authority and scope

Devinson asked to put the work on track to meet the completion milestones and prove it finished after the whole-product audit. After the R0 baseline was actually executed, he explicitly said **“I approve - please keep going.”** This supplies permission to build the bounded engineering successor, including R1a holder navigation, rather than remaining in the initial R0-only wait. It does **not** supply a Product Reviewer verdict, Golden freeze, deployment, sponsor transaction, or extension of the earlier time-limited delegated freeze approval.

Historical Golden records remain immutable. The changed runtime is a successor candidate, not approved replacement Golden truth. #34 independently evaluates the concrete defects, successor implementation and remaining product decisions; the builder must not invent that disposition or grant whole-product clearance. A broad redesign, new journey family, or second prototype is not an acceptable repair.

Evidence basis:
- user-supplied *YourTurn Experience Integrity Report*, audited `252ba96e135dffabc80c499076f03c5e76cc10b7`, pp. 5–9, 11–15;
- subsequent source/test comparison at `4468de0d0a72c7ac14513122c4d16657490f1645` in #44;
- original segment proof: Continuity `34551695637`, Visual `34551693262`, artifact `10181148190` (142 PNG checkpoints);
- executed R0 baseline at `ea465f80c52762e51a582594cb82d71be74afea3`: 5 PASS / 27 FAIL;
- R1a exact repair and evidence in `r1a-holder-repair.md`, `handoff.md` and #44. R1 remains partially complete, not closed.

Green segment checks are real but do not establish whole-product integrity. A reproduced product failure requires the test to reach its stated precondition and then fail the product assertion. SETUP_ERROR, RUNTIME_ERROR and EVIDENCE_ERROR are separate failures, not defect confirmations.

## Finish line

One booking, one lifecycle, coherent actor-specific projections. All primary actions fulfil their labels or state a real restriction. Header, body, reload and browser history preserve known ownership, mandate, payment, attendance and fulfilment facts. A route selects a location, never authority or a completed action.

**UX-complete is different from integrated/live.** A persistent fixture-only scenario can demonstrate UX behaviour. It cannot authorize a real booking mutation or satisfy Ledger/World/Hedera qualification. Production owners and replacement evidence remain in `integration-ledger.md`; live integration remains a separate release gate.

## Milestones and closure evidence

| ID | Owner / dependency | Required deliverable | Closure evidence |
| --- | --- | --- | --- |
| R0 | UX Workbench; first | Executable baseline for navigation, visible identity, four bridge/action gaps; positive control | Exact-head production build, all existing segment suites, paired Chromium before/after PNGs and `integrity/results.json`; distinguish reproduced FAIL from setup/tool failures |
| R1 | UX Workbench; R0 + explicit human proceeding approval; independent #34 review before adoption | One state-safe navigation contract, independent fixture lifecycle state, pending/resume semantics, visible mobile identity | R0 navigation failures turn PASS on unchanged acceptance; model + browser tests cover header/body/reload/Back/Forward, no stale-success URL can create ownership or authority |
| R2 | UX Workbench; R1 | Four complete bridges/actions B1–B4 | Actual user controls traverse each bridge; check-in window enforced; fulfilment action has pending/result/error; terminal states have truthful exits |
| R3 | UX Workbench; R1, reuse prior product work | Requested provider/customer scope made functional | Editable provider/session/rule inputs, validation and preserved drafts; Bob bookings list; coherent entry/Browse; initial-holder prerequisite explicitly accepted or implemented, not silently omitted |
| R4 | UX Workbench; R1–R3 | One-seed connected scenario and adversarial cross-journey tests | Same booking/event across Maya/Bob/Studio A; no destination reseeding; interrupted/retried operations, duplicate action, partial/unknown, changed-holder/policy and return paths exercised at both canonical widths |
| R5 | Independent #34, then Devinson; R4 | Exact candidate review and freeze packet | Build + segment + integrity + connected tests PASS; actual PNG review under all five lenses; every audit finding disposed with evidence; exact GOLDEN-READY and valid exact-candidate approval |

No milestone closes from a checkbox, screenshot count, commit count, or a green test of a narrower scope. R0 completion means **defects reproducibly measured**, not fixed. A holder-only R1a pass does not close R1 or prove cross-actor integrity. R1–R5 remain open until their evidence exists.

## Required decisions at #34 — not excuses for redesign

1. **Navigation:** addressable task locations, sensible push vs replace, one shell/body location contract; the fixture lifecycle is independent of URL choice. Return/reload must show committed facts; an unknown result stays unknown.
2. **Product shell:** the canonical candidate's public customer/provider entry must not silently escape to contradictory legacy architecture. Explicit prepared-demo entry is allowed only as an accepted scope boundary; it is not full account onboarding/purchase proof.
3. **Check-in versus fulfilment:** attendance records arrival; service fulfilment is a deliberate provider action/result. Do not infer service delivery from arrival or require manual provider approval for compliant recovery.
4. **Time:** reconcile relative mandate expiry, transfer cutoff and check-in window using one explicit scenario clock. Do not silently change the frozen mandate. Existing 40-minimum / 32-block / 45-success and replacement-reject/cancel semantics remain binding.

## Bridges

- B1: acquired booking -> Use booking -> same-booking check-in details; before opening show timing, after opening permit valid attendance, after use preserve its result.
- B2: Maya recovery success AND recovered-bookings item -> receipt/activity -> meaningful return. Confirmed recovery value is not contingent on later attendance; partial fulfilment/reconciliation must not erase settlement truth.
- B3: Studio A current-holder confirmation -> same booking in Today/fulfilment; Bob remains the holder.
- B4: expected/attendance state -> deliberate provider fulfilment -> pending/result/error -> reconciliation/history. This is service operations, not per-transfer approval.

## Whole-audit disposition coverage

| Audit findings | Milestone | Required disposition |
| --- | --- | --- |
| F-01, F-02, F-03, F-08, F-09; GAP-6/7 | R1 | Persistent truth independent of URL, action-aware locations/history, active recovery reflected in booking, no navigation regression |
| F-05, F-20 | R1 | Visible actor distinction at 390px and reachable 44px navigation controls; hidden DOM text is not visible evidence |
| F-04, F-06, F-07, F-16; GAP-1/2/4 | R2 | Real connected use/receipt/provider/fulfilment actions; unified meaning of Use booking without weakening rules |
| F-10, F-11, F-12, F-13; GAP-3/5 | R3 | Coherent entry/nav, actual Bob bookings, useful exits, honest secondary cards and original-holder prerequisite |
| F-14, F-15 | R1/R2 + explicit #34 decision | Stop/revoke confirmation/outcome; scenario-time and authority/cutoff distinction, no silent scope rewrite |
| F-17, F-18, F-19 | R3/R4 + #34 | Primary vs proof vocabulary rules; negative states exercised via fixture outcomes, not invisible URL islands; explicit honest demo boundary |
| Audit pp. 13–14 test blind spots | R4/R5 | Assertions independent of stale URL; operate headers; Back/Forward/reload; no direct-fixture entry presented as bridge/shared-state proof |

## Test evidence contract

`scripts/product-workbench-integrity-check.mjs` is the initial R0 suite. It includes a known-good in-body return control and captures isolated before/after regressions at 1440x1000 and 390x844. Direct entry used for fixture preconditions is labelled in every result. No full cross-actor continuity is claimed by those isolated tests.

The Visual workflow retains all existing segment assertions and the unchanged R0 assertions. In R1a, the two direct rejection-state captures have explicit isolated test-fixture preconditions; a URL no longer creates those authority facts. The clicked holder journey is not reseeded by these separately labelled captures. Addressable navigation waits for the same visible assertions rather than assuming synchronous React state updates.

The integrity step runs even if a segment test failed after successful server startup. There is **no continue-on-error** and no expected-failure waiver. Any FAIL/setup/runtime/evidence error produces a nonzero gate; paired screenshots, exact SHA, source digests and JSON are uploaded under `product-workbench-rendered-evidence` even on failure. R1a adds its own pure model and browser navigation/storage-error suites, without treating them as whole-product clearance.

R4 must add actual shared-state acceptance rather than declaring the R0 suite sufficient. Seed/reset once, then operate actor-specific entry and controls. Do not type success URLs, reseed destinations, or use a customer-visible actor switch to simulate cross-party integrity. Record same booking/event identity in reviewer-safe evidence. Never record raw human IDs, secrets, signed headers or sponsor credentials.

Browser test environment: GitHub Actions production build on loopback with existing Playwright. Browser plugin is not available in this session; local clone also fails DNS. CI is the execution environment, not a claim of an independent local run. R0 and R1a browser checks block external traffic and non-read HTTP requests; they exercise fixture UI only.

## Worker routing

Builder reads #44, this contract, latest #34 findings, branch head and exact CI. Fix a harness/setup failure before interpreting a product failure. Continue the explicitly authorized R1 successor and preserve verified improvements; do not repeat old receipt-copy, old XC-01 header or already-fixed R0 holder work. Only update #44/PR #33 when code/evidence/blocker truth changes.

Reviewer consumes R0 reproducers plus the changed source and actual PNGs, resolves the four decisions above, then independently reviews the bounded successor. Do not grant whole-product clearance from historical segment passes or the partial R1a pass.

Supervisor keeps #31/#34/PR #33 and workbench entry docs pointed at #44. Integrator must not adopt known-defective continuity as production precedent. These are repo role contracts; they do not prove any scheduler is active or a worker has acknowledged the task.

No merge/default/submission write, deployment, spending, secret operation, sponsor backend change, or self-certified Golden is authorized.
