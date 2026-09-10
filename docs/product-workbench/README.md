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
- `golden/` — human-approved frozen journey records bound to exact executable candidates.

## Golden product truth

**YT-01 through YT-04** are frozen Golden at executable candidate `24bbf0d7516499069f5102ae4bf724b0cb376b94`.

See `golden/yt-01-04.md`.

## Current experiment

Build and test one continuous clickable candidate covering **YT-05 through YT-08**, continuing from the Golden secure-approval handoff on `/product-preview`.

The candidate should make the sponsor-backed recovery sequence feel like one normal product experience:

`Ledger mandate approval → recovery active with exact human-backed delegated agent → 32 USDC blocked → 45 USDC allowed → booking transfer + settlement → You recovered 45 USDC`

Sponsor-dependent states may be fixture/demo state in the UX-only branch until integration, but must never be presented as LIVE without real evidence.

Rendered desktop/mobile screenshot inspection is a hard review gate before `GOLDEN-READY`, and Devinson must explicitly approve the exact candidate before freeze.
