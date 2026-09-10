# YourTurn Product Workbench

Canonical UX branch: `ux/yourturn-product-workbench`

This workbench turns YourTurn into one coherent consumer product while Hedera, World and Ledger workers continue sponsor implementation in parallel.

## Operating loop

`candidate → product review → Golden/frozen → implementation`

A journey is the unit of design. Screens are only states inside a journey.

### Rules

1. Reuse, adapt, reference or explicitly reject existing YourTurn work before rebuilding.
2. Normal customer language wins over sponsor terminology.
3. Sponsor evidence is inspectable in a reviewer/proof surface; it must not take over the core journey.
4. Golden journeys are product truth. Sponsor implementation must wire into them without silently redesigning them.
5. Only one journey set is actively under product review at a time.
6. No status-only commits. A commit must change product behavior, proof, testability, or documentation required to implement/review a journey.
7. Keep the customer story end-to-end: Alice loses the booking, Alice receives value, Bob receives a usable booking.

## Product model

The primary customer object is a **booking**, not an NFT/token.

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

## Source branches to mine

- `codex/ethglobal-final-public` — immutable pre-event baseline.
- `feat/product-issuer-holder-ux` — strongest prior design system and holder/provider UX work.
- `main` — auth/account/roles/product shell and broader product surfaces.
- `feature/ethonline-2026-foundation` — ETHOnline technical foundation.

Do not treat any one source branch as the complete UX answer.

## Workbench files

- `journeys.md` — journey registry and current progress.
- `invariants.md` — shared UI/product rules that should not drift between journeys.
- `review-checklist.md` — candidate and Golden review gate.
- `handoff.md` — exact current state, next action and sponsor integration boundaries.

## Current experiment

Build and test one continuous clickable candidate covering **YT-01 through YT-04** before widening scope.

The candidate must end with a believable handoff into the live sponsor-backed recovery sequence, not a dead-end mockup.
