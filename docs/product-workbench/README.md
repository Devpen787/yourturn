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

## Current phase — XC-01 candidate `REVISE`

<!-- pw-state: phase=XC-01_CANDIDATE_REVISE candidate=eb3bcdb84ff95352adf1d0c387996f9a4692c52f candidate-status=REVISE architecture-head=686aeb767f3c1f6ff7db14fdf7a773039cf581a9 architecture-status=REVIEWABLE golden-yt-01-04=24bbf0d7516499069f5102ae4bf724b0cb376b94 golden-yt-05-08=d5309a96d532ee107011c2a5cefc3000b9e4932f next-gate=NARROW_HEADER_CONTINUITY_REPAIR_THEN_EXACT_HEAD_EVIDENCE_THEN_34_FIVE_LENS -->

Do **not** start a new journey set, widen scope, or freeze anything from this README.

The post-Golden architecture/product contract was independently classified **`REVIEWABLE`** by Product Reviewer #34 at exact docs head `686aeb767f3c1f6ff7db14fdf7a773039cf581a9`. That gate is closed and historical.

One XC-01 executable candidate was then explicitly routed and directly reviewed. Product Reviewer #34 classified exact executable `eb3bcdb84ff95352adf1d0c387996f9a4692c52f` **`REVISE`** on 2026-09-10 after inspecting all 72 PNGs of artifact `10169073722` (Product Workbench Visual Check `34519301160`, SUCCESS on that SHA).

The blocking defect is narrow and is the only authorized repair: on the **actual interactive** Bob path the URL stays `?view=xc-find` after `Refresh booking`, so `SiteHeader` still renders `Find a spot` on the captured success and `Use booking` states while the page body reads `My bookings` / `Friday Yoga is now yours.` The direct `xc-bob-success` header mode is never reached by the real interaction, and `assertAudienceHeader` keys off the stale URL, so the current assertion codifies the defect instead of catching it.

The binding contract package remains:

- `architecture-review.md` — architecture review packet, classified `REVIEWABLE`;
- `DESIGN.md` — Golden-derived visual/product design contract;
- `GLOSSARY.md` — preferred customer language + `Avoid:` aliases;
- `CRAFT.md` — prospective state/accessibility/responsive/copy/interaction discipline;
- `integration-ledger.md` — YT-05→YT-08 Golden fixture → real implementation owner/interface/evidence/failure map;
- `stakeholder-journeys.md` — holder/acquirer/provider product architecture;
- `stakeholder-coverage-gate.md` — mandatory cross-lane coverage gate;
- `next-slice.md` — reviewed XC-01 scope and build boundary;
- `invariants.md` — durable product rules;
- `review-checklist.md` — executable candidate/Golden gate;
- `handoff.md` — exact current state and next action.

## Reviewed connected continuation

The reviewed smallest connected continuation, now in the candidate/review loop, is:

## Active XC-01 candidate

`eb3bcdb84ff95352adf1d0c387996f9a4692c52f` is no longer "exploratory". It was explicitly routed under the reviewed contract and is the **one active XC-01 candidate**, currently classified **`REVISE`**.

Everything on this branch after that SHA is docs-only; no executable, header or Chromium behavior changed after the exact rendered candidate.

Green CI is still not approval, and `REVISE` is not a Golden freeze. Only the named header-continuity repair is authorized against it.

## Source branches to mine

- `codex/ethglobal-final-public` — immutable pre-event baseline;
- `feat/product-issuer-holder-ux` — strongest prior holder/provider/acquirer interaction work;
- `main` — auth/account/roles/product shell and broader surfaces;
- `feature/ethonline-2026-foundation` — ETHOnline technical foundation.

Do not treat any one source branch as the complete UX answer.

## Exact next action

**Repair the named XC-01 header-continuity defect, then re-prove it.**

1. Synchronize the successful interactive transition so the shell renders `My bookings` once Bob holds Friday Yoga, on the real `Refresh booking` → `Use booking` path.
2. Strengthen the Chromium assertion so it proves that interactive transition instead of accepting the stale `Find a spot` header.
3. Produce a new exact candidate SHA with production build + exact-head desktop/mobile rendered evidence.
4. Route that exact SHA and artifact back to Product Reviewer #34 for five-lens re-review.
5. `GOLDEN-READY` and explicit Devinson freeze approval remain separate later gates.

Preserve the same `/product-preview` route, both Golden executables, the fixture evidence boundary and all sponsor/backend semantics. Do not widen scope, redesign XC-01, merge, or deploy.

