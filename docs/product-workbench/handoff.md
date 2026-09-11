# Product Workbench Handoff

## Current objective — #44 UX integrity completion

Branch: `ux/yourturn-product-workbench`. Candidate route: `/product-preview`.
Read `completion-contract.md`, build issue #44, latest independent Product Reviewer #34, and exact branch CI before acting.

The architecture-only and narrow XC-01/receipt-copy handoffs are superseded as active work. No new journey family is needed. The current goal is state-safe navigation, four missing bridges/actions, functional requested provider/customer scope, and cross-journey proof.

## Current increment

**R0 regression suite and milestone routing. No product-runtime fix is claimed.**

The new `scripts/product-workbench-integrity-check.mjs` operates header returns, reload, Back/Forward, mobile visible actor identity, and the four reported missing continuations. It asserts desired behaviour, preserves RED failures and produces paired exact-head PNGs + machine-readable results. A positive in-body return control distinguishes the known functioning path from its broken header equivalent. Setup/tool errors are not counted as reproduced defects.

The Visual workflow retains the original four segment suites and adds this integrity gate. Read the current run's `integrity/results.json` inside `product-workbench-rendered-evidence`; execution results are recorded in #44 rather than repeated docs commits. R0 is not whole-product acceptance.

Product-runtime baseline: `4468de0d0a72c7ac14513122c4d16657490f1645`.
Historical segment proof: Continuity `34551695637`, Visual `34551693262`, artifact `10181148190` (142 PNG checkpoints). This narrower green proof is not invalidated, but it never demonstrated the newly tested cross-journey/return behaviours.

## Next actions and owners

1. UX Workbench: obtain the exact R0 CI result; repair harness/setup problems if any. Preserve all product files during this baseline.
2. Independent #34: inspect failure pairs and current source; explicitly dispose the concrete Golden-impacting continuity defects and R1 successor/navigation, shell and fulfilment semantics.
3. UX Workbench: implement the approved R1 state foundation first; then B1–B4, R3 requested scope, and R4 connected scenario. Do not patch four links on top of resettable ownership.
4. #34: actual PNG + interaction review of the exact resulting candidate; only GOLDEN-READY after all material acceptance is satisfied.
5. Devinson: valid exact-candidate approval before freeze. The earlier temporary standing approval window is not silently renewed by this routing change.

The latest user request authorizes getting this bounded repair programme implemented and evidenced; it is not a freeze/deploy/sponsor authorization.

## Historical Golden records — preserved, not whole-product clearance

- YT-01→04: `24bbf0d7516499069f5102ae4bf724b0cb376b94`, `golden/yt-01-04.md`.
- YT-05→08: `d5309a96d532ee107011c2a5cefc3000b9e4932f`, `golden/yt-05-08.md`.
- XC-01: `046ad8d3cad863813dca7a3fc9cb09abaf5939e0`, `golden/xc-01.md`.
- XC-02 / XC-03: implemented fixture segments, not frozen at the baseline. The one-line receipt repair did not close the whole-product defects in #44.

Do not edit historical Golden records to conceal defects. Any necessary runtime correction must be a reviewed successor preserving the approved visual language, mandate limits, replacement semantics and evidence boundary.

## Binding rules

Use `DESIGN.md`, `GLOSSARY.md`, `CRAFT.md`, `invariants.md`, `review-checklist.md`, `stakeholder-journeys.md`, `stakeholder-coverage-gate.md` and `integration-ledger.md`.

Keep `provider rules ∩ holder mandate ∩ acquirer eligibility/payment`. Provider rules are pre-defined/load-bearing; staff do not approve each compliant recovery. Ledger authorizes the off-chain mandate, World verifies the exact requester, Hedera enforces/settles; no sponsor/backend semantics change in this lane. Fixture UI state never becomes live authority. Preserve 40-USDC minimum / 32 blocked / 45 recovered, no cancellation and replacement reject/cancel retaining current authority.

Sponsor/security state is independently owned by #5/#7/#8/#16; do not copy stale sponsor heads here. This work does not lift a device/dependency/security hold.

## Execution boundary

GitHub CI is available for the test run. Local git clone failed DNS. No local full-app run or active unattended schedule is claimed. A role contract or issue assignment is not proof that a worker started. Evidence, not status prose, closes milestones.
