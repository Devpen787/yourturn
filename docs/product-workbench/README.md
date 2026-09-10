# YourTurn Product Workbench

Canonical UX branch: `ux/yourturn-product-workbench`.

This workbench turns YourTurn into one coherent **two-sided booking product** while Hedera, World and Ledger implementation remains owned by the sponsor workstreams.

## Operating loop

`candidate → product review → GOLDEN-READY → explicit human approval → Golden/frozen → implementation`

A journey is the unit of design. Screens are states inside a journey.

### Rules

1. Reuse, change/adapt, or explicitly reject existing YourTurn work before rebuilding.
2. Normal customer language wins over sponsor terminology.
3. Sponsor evidence is inspectable in a reviewer/proof surface; it must not take over the core journey.
4. Golden journeys are product truth. Sponsor implementation must wire into them without silently redesigning them.
5. Only one journey set is actively under product review at a time.
6. No status-only commits. A commit must change product behavior, proof, testability, or documentation required to implement/review a journey.
7. Keep the product story end-to-end: provider rules permit the action, Maya loses the booking and receives value, Bob receives a usable booking.
8. Check every broader slice against the stakeholder architecture: service provider + customer, with current-holder and next-holder roles covered where relevant.
9. Golden product artifacts are design/presentation contracts, not automatically implementation owners.
10. Never promote FIXTURE/CI/configured evidence to LIVE through copy or styling.

## Product model

The primary customer object is a **booking**, not an NFT/token.

YourTurn has two stakeholder classes:

- **Service provider** — creates/fulfils the service and defines reusable booking rules;
- **Customer** — consumes or exchanges the service, operationally as current holder or next holder.

Core permission rule:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`

The provider sets reusable rules before the individual recovery. A compliant recovery should not require a provider employee to manually approve that transfer.

Primary customer areas remain:

- Home;
- My Bookings;
- Find a spot;
- Activity;
- Account.

Primary booking actions remain `Use booking` and `Change plans`.

## ETHOnline hero — Delegated Recovery

A person owns a booking they cannot use. They tell YourTurn exactly what one AI agent may do with that booking. The agent may recover value automatically inside those rules; anything outside the mandate is blocked or returned to the person.

Sponsor roles remain singular:

- **Ledger** defines what the human authorized in the off-chain Recovery Mandate;
- **World** proves which human-backed agent is asking and whether it is the exact delegated one;
- **Hedera** enforces/executes booking transfer and settlement after the permission intersection passes.

World must not become a second holder-authorization system. Provider policy remains load-bearing.

## Golden product truth

**YT-01 through YT-08 are human-approved Golden.**

- YT-01→YT-04 frozen executable: `24bbf0d7516499069f5102ae4bf724b0cb376b94`;
- YT-05→YT-08 frozen executable: `d5309a96d532ee107011c2a5cefc3000b9e4932f`.

Records:

- `golden/yt-01-04.md`;
- `golden/yt-05-08.md`.

Do not redesign or silently mutate either executable. Golden freezes approved behavior/presentation, **not sponsor evidence class**.

## Current phase — architecture/product-contract review

Do **not** start or advance a new executable journey from this README.

The current review package is:

- `architecture-review.md` — exact architecture review packet and gate;
- `DESIGN.md` — Golden-derived visual/product design contract;
- `GLOSSARY.md` — preferred customer language + `Avoid:` aliases;
- `CRAFT.md` — prospective state/accessibility/responsive/copy/interaction discipline;
- `integration-ledger.md` — YT-05→YT-08 Golden fixture → real implementation owner/interface/evidence/failure map;
- `stakeholder-journeys.md` — holder/acquirer/provider product architecture;
- `stakeholder-coverage-gate.md` — mandatory cross-lane coverage gate;
- `next-slice.md` — proposed smallest connected continuation;
- `invariants.md` — durable product rules;
- `review-checklist.md` — executable candidate/Golden gate;
- `handoff.md` — exact current state and next action.

`architecture-review.md` explicitly separates design inputs as **OBSERVED / PROVIDED / INFERRED**, decisions as **KEEP / CHANGE / DO NOT COPY**, audits every material Golden YT-05→08 state/action against `integration-ledger.md`, and records the stakeholder-gate result.

## Proposed connected continuation

The smallest connected continuation proposed for later executable work is:

### XC-01 — Eligible next holder + provider-recognized handoff

`Studio A pre-defined rules → Bob finds/evaluates Friday Yoga → Bob satisfies eligibility + commits 45 USDC → current provider/holder/acquirer conditions reconcile → Bob receives Friday Yoga as a normal usable booking → Studio A recognizes Bob as authoritative current holder`

Minimum lane coverage:

- acquirer A-01→A-04;
- provider P-03, P-06, P-07;
- already-Golden Maya YT-08 remains unchanged;
- partial/unknown state fails closed.

YT-09/YT-10 are bridge concepts inside this broader continuation, not a standalone holder-only next set.

## Pre-existing exploratory XC-01 code

Branch history contains exploratory executable `eb3bcdb84ff95352adf1d0c387996f9a4692c52f` and rendered evidence. The current architecture-only gate does **not** adopt, advance or freeze it. Historical green CI is not contract approval.

If the architecture package is later classified `REVIEWABLE`, that executable may be treated as prior work and compared against the reviewed contract before any candidate is routed forward.

## Source branches to mine

- `codex/ethglobal-final-public` — immutable pre-event baseline;
- `feat/product-issuer-holder-ux` — strongest prior holder/provider/acquirer interaction work;
- `main` — auth/account/roles/product shell and broader surfaces;
- `feature/ethonline-2026-foundation` — ETHOnline technical foundation.

Do not treat any one source branch as the complete UX answer.

## Exact next action

**Product Reviewer #34 reviews the architecture/product contract only.**

The reviewer reads `architecture-review.md` and its referenced artifacts and returns:

- `REVISE` with the precise design/product/integration/stakeholder defect; or
- `REVIEWABLE` meaning one smallest connected executable set may be explicitly routed next.

Do not self-freeze, do not advance the exploratory XC-01 executable during this gate, and do not widen into another journey set.
