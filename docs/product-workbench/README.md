# YourTurn Product Workbench

Canonical UX branch: `ux/yourturn-product-workbench`. Single candidate: `/product-preview`.

## Start here — current work is UX integrity completion

**Active build: #44. Independent review: #34. Draft PR: #33.**

Read `completion-contract.md` -> `handoff.md` -> latest #34 disposition -> exact-head CI. The previous architecture-only and narrow XC-01/receipt-copy instructions are historical, not the active objective.

We have tested fixture segments, not yet one state-consistent product. Finish the existing lifecycle before adding journey families:

`R0 reproduce -> R1 state-safe navigation -> R2 four bridges/actions -> R3 requested provider/customer scope -> R4 one-seed cross-journey tests -> R5 independent review + exact human freeze`

The first increment adds executable R0 regressions and their evidence pipeline; it does not change the product runtime. Review `integrity/results.json` in the exact-head rendered artifact. RED findings must be fixed, not waived or called Golden because a narrower suite is green.

## Product model

YourTurn is a two-sided booking product: service providers and customers. Customers have current-holder and next-holder roles during an exchange. The primary object is a **booking**, not a token.

A valid recovery must satisfy:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`

Provider rules are reusable and load-bearing before recovery, not per-transfer staff approval. Ledger supplies off-chain holder authorization, World exact human-backed requester verification, and Hedera enforcement/execution/settlement. World must not become a parallel holder-authority source.

## Historical Golden design contracts

| Scope | Exact executable | Record |
| --- | --- | --- |
| YT-01→04 | `24bbf0d7516499069f5102ae4bf724b0cb376b94` | `golden/yt-01-04.md` |
| YT-05→08 | `d5309a96d532ee107011c2a5cefc3000b9e4932f` | `golden/yt-05-08.md` |
| XC-01 | `046ad8d3cad863813dca7a3fc9cb09abaf5939e0` | `golden/xc-01.md` |

Preserve the historical records and approved visual/authority contracts. #44 identifies concrete runtime continuity defects; a correction requires independent successor disposition, not a silent Golden rewrite. Golden status does not establish every possible navigation path or upgrade sponsor evidence.

XC-02/XC-03 are built fixture segments, not frozen at the current product baseline. Their previous segment CI does not clear #44.

## Binding workbench files

- `completion-contract.md`: milestone owners, acceptance evidence, full-audit disposition and active sequencing.
- `handoff.md`: current increment, actual execution boundary and next action.
- `journeys.md`: coverage versus Golden/connected/runtime truth.
- `DESIGN.md`, `GLOSSARY.md`, `CRAFT.md`: Golden-derived visual language, domain terms and state/accessibility/copy discipline.
- `invariants.md`, `review-checklist.md`: product and independent review constraints.
- `stakeholder-journeys.md`, `stakeholder-coverage-gate.md`: provider/holder/acquirer coverage.
- `integration-ledger.md`: UI owner, real interface/owner, evidence class and failure/rollback requirements.
- `architecture-review.md`, `next-slice.md`: historical architecture/XC-01 rationale; do not use their old next-action wording instead of #44.

## Operating loop

`candidate -> mechanical proof -> independent five-lens review -> GOLDEN-READY -> exact human approval -> Golden freeze -> integration`

A serious interaction, visual, accessibility, comprehension or trust defect blocks clearance. A screenshot of a directly selected fixture is state evidence, not proof of its incoming path. Shared state is not demonstrated by separately loading Maya, Bob and provider success screens.

Navigation selects location; it does not establish ownership, authorization, payment, check-in or fulfilment. Workbench fixture persistence must never become production authorization.

Keep proof collapsed/secondary and honestly labelled. Never expose raw World identifiers or promote FIXTURE/CI to LIVE. No merge, production/mainnet deployment, spending, secret change or sponsor/backend semantic change is authorized.

## Prior work to reuse before runtime repair

Mine `feat/product-issuer-holder-ux` and `main` for useful provider forms, state handling and navigation, then adapt to the approved Golden contract. `codex/ethglobal-final-public` remains the immutable pre-event baseline; foundation remains `feature/ethonline-2026-foundation`.

No new visual direction or competing route. Commit only material code/tests or required acceptance/routing changes. CI reports and #44 carry outcomes; no repeated status-only commits.
