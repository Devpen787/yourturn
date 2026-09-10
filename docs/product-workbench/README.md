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
- `stakeholder-journeys.md` — durable holder, acquirer and provider product architecture and sequencing.
- `stakeholder-coverage-gate.md` — mandatory coverage gate before the next broader product slice.
- `invariants.md` — shared UI/product rules that should not drift between journeys.
- `review-checklist.md` — candidate and Golden review gate.
- `handoff.md` — exact current state, next action and sponsor integration boundaries.
- `golden/` — human-approved frozen journey records bound to exact executable candidates.

## Golden product truth

**YT-01 through YT-08 are now Golden.**

- YT-01→YT-04 frozen executable: `24bbf0d7516499069f5102ae4bf724b0cb376b94` — see `golden/yt-01-04.md`.
- YT-05→YT-08 frozen executable: `d5309a96d532ee107011c2a5cefc3000b9e4932f` — see `golden/yt-05-08.md`.

The second Golden set reached freeze after exact-head build/Chromium evidence, 44 directly inspected desktop/mobile PNGs, five-lens review PASS, and Devinson's explicit approval on 2026-09-10.

## Current phase

The holder-recovery hero is now frozen. The workbench must **not** jump directly into a holder-only YT-09/YT-10 extension.

Next:
1. extract a compact YourTurn `DESIGN.md` / design contract from the approved Golden evidence per issue #40;
2. create the domain glossary and reusable craft/review rules;
3. create/use a Golden-to-integration acceptance ledger so every fixture transition has a real implementation/evidence owner;
4. apply `stakeholder-coverage-gate.md` and issue #39;
5. map the acquirer and provider lanes, then choose the smallest connected next product slice.

The current Golden UX still contains explicit fixture/demo sponsor transitions where real integration is not yet wired. Golden freezes product behavior/presentation; it does not upgrade evidence class.

## Expansion principle

YT-09/YT-10 are bridge concepts, not the entire next product slice.

The next complete continuation must connect:
- **holder lane** — Maya releases/recoveries her booking;
- **acquirer lane** — Bob discovers, evaluates, pays/acquires, receives and can use it;
- **provider lane** — Studio A has pre-defined rules, sees the authoritative holder change, and can fulfil/reconcile without manually approving every compliant recovery.

That continuation must preserve:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`.