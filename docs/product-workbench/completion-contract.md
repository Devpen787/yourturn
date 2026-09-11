# UX integrity completion contract — #44

Active build issue: #44. Independent reviewer: #34. Draft PR: #33.
Branch: `ux/yourturn-product-workbench`. Single candidate route: `/product-preview`.

## Authority and scope

Devinson asked to put the work on track to meet the completion milestones and prove it finished after the whole-product audit. This authorizes the bounded repair/evidence programme, not a Golden freeze, deployment, sponsor transaction, or extension of the earlier time-limited delegated approval.

The first increment is **R0 executable regression evidence**, with no product-runtime change. Historical Golden records remain immutable. #34 must explicitly dispose the concrete Golden-impacting defects and the successor contract before the worker changes those behaviours. A broad redesign, new journey family, or second prototype is not an acceptable repair.

Evidence basis:
- user-supplied *YourTurn Experience Integrity Report*, audited `252ba96e135dffabc80c499076f03c5e76cc10b7`, pp. 5–9, 11–15;
- subsequent source/test comparison at `4468de0d0a72c7ac14513122c4d16657490f1645` in #44;
- old segment proof: Continuity `34551695637`, Visual `34551693262`, artifact `10181148190` (142 PNG checkpoints).

Those green segment checks are real but do not establish whole-product integrity. Reported audit defects are not newly reproduced until their R0 test reaches its stated precondition and then fails the product assertion. SETUP_ERROR, RUNTIME_ERROR and EVIDENCE_ERROR are separate failures, not defect confirmations.

## Finish line

One booking, one lifecycle, coherent actor-specific projections. All primary actions fulfil their labels or state a real restriction. Header, body, reload and browser history preserve known ownership, mandate, payment, attendance and fulfilment facts. A route selects a location, never authority or a completed action.

**UX-complete is different from integrated/live.** A persistent fixture-only scenario can demonstrate UX behaviour. It cannot authorize a real booking mutation or satisfy Ledger/World/Hedera qualification. Production owners and replacement evidence remain in `integration-ledger.md`; live integration remains a separate release gate.

## Milestones and closure evidence

| ID | Owner / dependency | Required deliverable | Closure evidence |
| --- | --- | --- | --- |
| R0 | UX Workbench; first | Executable baseline for navigation, visible identity, four bridge/action gaps; positive control | Exact-head production build, all existing segment suites, paired Chromium before/after PNGs and `integrity/results.json`; distinguish reproduced FAIL from setup/tool failures |
| R1 | UX Workbench; R0 + #34 successor disposition | One state-safe navigation contract, independent fixture lifecycle state, pending/resume semantics, visible mobile identity | R0 navigation failures turn PASS on unchanged acceptance; model + browser tests cover header/body/reload/Back/Forward, no stale-success URL can create ownership or authority |
| R2 | UX Workbench; R1 | Four complete bridges/actions B1–B4 | Actual user controls traverse each bridge; check-in window enforced; fulfilment action has pending/result/error; terminal states have truthful exits |
| R3 | UX Workbench; R1, reuse prior product work | Requested provider/customer scope made functional | Editable provider/session/rule inputs, validation and preserved drafts; Bob bookings list; coherent entry/Browse; initial-holder prerequisite explicitly accepted or implemented, not silently omitted |
| R4 | UX Workbench; R1–R3 | One-seed connected scenario and adversarial cross-journey tests | Same booking/event across Maya/Bob/Studio A; no destination reseeding; interrupted/retried operations, duplicate action, partial/unknown, changed-holder/policy and return paths exercised at both canonical widths |
| R5 | Independent #34, then Devinson; R4 | Exact candidate review and freeze packet | Build + segment + integrity + connected tests PASS; actual PNG review under all five lenses; every audit finding disposed with evidence; exact GOLDEN-READY and valid exact-candidate approval |

No milestone closes from a checkbox, screenshot count, commit count, or a green test of a narrower scope. R0 completion means **defects reproducibly measured**, not fixed. R1–R5 remain open until their evidence exists.

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

The Visual workflow runs legacy segment checks unchanged, then the integrity step even if a segment test failed after successful server startup. There is **no continue-on-error** and no expected-failure waiver. Any FAIL/setup/runtime/evidence error produces a nonzero gate; paired screenshots, exact SHA, source digests and JSON are uploaded under `product-workbench-rendered-evidence` even on failure.

R4 must add actual shared-state acceptance rather than declaring the R0 suite sufficient. Seed/reset once, then operate actor-specific entry and controls. Do not type success URLs, reseed destinations, or use a customer-visible actor switch to simulate cross-party integrity. Record same booking/event identity in reviewer-safe evidence. Never record raw human IDs, secrets, signed headers or sponsor credentials.

Browser test environment: GitHub Actions production build on loopback with existing Playwright. Browser plugin is not available in this session; local clone also fails DNS. CI is the execution environment, not a claim of an independent local run. The R0 browser blocks external traffic and non-read HTTP requests; it exercises fixture UI only.

## Worker routing

Builder reads #44, this contract, latest #34 disposition, branch head and exact CI. Fix a harness/setup failure before interpreting a product failure. After R0, begin the approved R1 successor, not old receipt-copy or old XC-01 header work. Only update #44/PR #33 when code/evidence/blocker truth changes.

Reviewer consumes R0 reproducers plus source and paired PNGs, resolves the four decisions above, then reviews the bounded successor. Do not grant whole-product clearance from historical segment passes.

Supervisor keeps #31/#34/PR #33 and workbench entry docs pointed at #44. Integrator must not adopt known-defective continuity as production precedent. These are repo role contracts; they do not prove any scheduler is active or a worker has acknowledged the task.

No merge/default/submission write, deployment, spending, secret operation, sponsor backend change, or self-certified Golden is authorized.
