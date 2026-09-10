# YourTurn Product Workbench

Canonical UX branch: `ux/yourturn-product-workbench`

This workbench turns YourTurn into one coherent **two-sided booking product** while Hedera, World and Ledger workers continue sponsor implementation in parallel.

## Operating loop

`candidate → product review → Golden/frozen → implementation`

A journey is the unit of design. Screens are states inside a journey.

### Rules

1. Reuse, adapt, reference or explicitly reject existing YourTurn work before rebuilding.
2. Normal customer language wins over sponsor terminology.
3. Sponsor evidence is inspectable in a reviewer/proof surface; it must not take over the core journey.
4. Golden journeys are product truth. Sponsor implementation must wire into them without silently redesigning them.
5. Only one journey set is actively under product review at a time.
6. No status-only commits. A commit must change product behavior, proof, testability, or documentation required to implement/review a journey.
7. Keep the product story end-to-end: provider rules permit the action, Maya loses the booking and receives value, Bob receives a usable booking.
8. Check every broader product slice against the stakeholder architecture: service provider + customer, with current-holder and acquirer roles covered where relevant.

## Product model

The primary customer object is a **booking**, not an NFT/token.

YourTurn has two stakeholder classes:
- **Service provider** — creates/fulfils the service and defines reusable booking rules.
- **Customer** — consumes or exchanges the service; operationally this may be the current holder or the next holder/acquirer.

Core permission rule:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`

See `stakeholder-journeys.md` for the durable holder, acquirer and provider journey architecture.

Primary customer areas:
- Home
- My Bookings
- Find a spot
- Activity
- Account

Primary booking actions:
- Use booking
- Change plans

`Change plans` exposes:
- Find someone to take it
- Swap for another time
- Get whatever refund is available
- Let YourTurn handle it

## ETHOnline hero journey

The hackathon story is **Delegated Recovery**:

A person owns a booking they cannot use. They tell YourTurn exactly what one AI agent may do with that booking. The agent recovers value automatically inside those rules; anything outside the mandate is blocked or escalated to the person.

Sponsor roles stay simple:
- Ledger defines what the human authorized.
- World proves which human-backed agent is asking and whether it is the exact delegated one.
- Hedera enforces what the agent can actually do and settles the result.

Provider policy remains load-bearing: the holder cannot authorize a recovery the provider has prohibited.

## Source branches to mine

- `codex/ethglobal-final-public` — immutable pre-event baseline.
- `feat/product-issuer-holder-ux` — strongest prior design system and holder/provider UX work.
- `main` — auth/account/roles/product shell and broader product surfaces.
- `feature/ethonline-2026-foundation` — ETHOnline technical foundation.

Do not treat any one source branch as the complete UX answer.

## Workbench files

- `journeys.md` — current ETHOnline journey registry and progress.
- `DESIGN.md` — product-specific visual/design contract extracted from approved Golden evidence.
- `GLOSSARY.md` — preferred product language and `Avoid:` aliases.
- `CRAFT.md` — reusable state, accessibility, responsive, copy and interaction craft rules.
- `integration-ledger.md` — Golden-to-integration owner/interface/evidence/failure map.
- `stakeholder-journeys.md` — durable holder, acquirer and provider product architecture and sequencing.
- `stakeholder-coverage-gate.md` — mandatory coverage gate before broader product slices.
- `next-slice.md` — applied stakeholder gate and selected smallest connected continuation.
- `invariants.md` — shared UI/product rules that should not drift between journeys.
- `review-checklist.md` — candidate and Golden review gate.
- `handoff.md` — exact current state, next action and sponsor integration boundaries.
- `golden/` — human-approved frozen journey records bound to exact executable candidates.

## Golden product truth

**YT-01 through YT-08 are Golden.**

- YT-01→YT-04 frozen executable: `24bbf0d7516499069f5102ae4bf724b0cb376b94` — see `golden/yt-01-04.md`.
- YT-05→YT-08 frozen executable: `d5309a96d532ee107011c2a5cefc3000b9e4932f` — see `golden/yt-05-08.md`.

The second Golden set reached freeze after exact-head build/Chromium evidence, 44 directly inspected desktop/mobile PNGs, five-lens review PASS, and Devinson's explicit approval on 2026-09-10.

## Current phase

The holder-recovery hero is frozen and the post-Golden architecture gate is now established:
- `DESIGN.md` extracts the binding visual/product language from Golden rather than redesigning it;
- `GLOSSARY.md` and `CRAFT.md` establish domain language and state/craft rules;
- `integration-ledger.md` maps Golden fixture states to real Ledger/World/Hedera owners and honest evidence boundaries;
- `stakeholder-coverage-gate.md` has been applied to the acquirer/provider continuation;
- `next-slice.md` selects the smallest connected next product slice.

The selected continuation is **XC-01 — Eligible next holder + provider-recognized handoff**:

`Studio A pre-defined recovery rules → Bob finds/evaluates Friday Yoga → Bob satisfies eligibility + commits to the 45 USDC acquisition → Golden Maya recovery accepts inside scope → Bob receives a normal usable booking → Studio A sees Bob as the authoritative current holder`

This is architecture/product truth only until an executable candidate is built and independently reviewed. Do not create a second prototype route and do not change the frozen YT-01→YT-08 contracts.

The Golden UX still contains explicit fixture/demo sponsor transitions where real integration is not yet wired. Golden freezes product behavior/presentation; it does not upgrade evidence class.

## Expansion principle

YT-09/YT-10 are bridge concepts, not the entire next product slice.

The next complete continuation must connect:
- **holder lane** — Maya releases/recovers her booking;
- **acquirer lane** — Bob discovers, evaluates, pays/acquires, receives and can use it;
- **provider lane** — Studio A has pre-defined rules, sees the authoritative holder change, and can fulfil/reconcile without manually approving every compliant recovery.

That continuation must preserve:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`.

## Exact next action

Build one **XC-01** candidate by extending the canonical product workbench and reusing/adapting prior slots/resale/provider UX under `DESIGN.md`, `GLOSSARY.md`, `CRAFT.md`, `integration-ledger.md`, and the stakeholder gate. Keep new sponsor-dependent transitions explicitly fixture/non-LIVE until real integration evidence replaces them.

Any material executable UX change must run the production build + real Chromium desktop/mobile render loop and return to Product Reviewer #34 for direct PNG inspection before a Golden decision.
