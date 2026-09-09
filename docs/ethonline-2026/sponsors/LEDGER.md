# Ledger Continuity Mission

## Prize thesis

Ledger should protect the moment a human grants or expands agent authority. It must materially change the authorization boundary; a logo or generic wallet connection does not qualify.

## Current official Continuity bar

Rechecked 2026-09-09 against https://developers.ledger.com/ethonline.

For Continuity, Ledger wants a clear before/after showing what the existing product could not do until Ledger was added. The same quality bar applies across tracks: real user value, clear autonomous-vs-explicit-approval boundaries, concrete Ledger primitives, and a practical demo/runnable repo or recorded walkthrough.

**Every Ledger submission must also include tooling/DX feedback** covering the docs/SDK experience, gaps/confusing flows/missing context, and specific improvements; screenshots or PRs are encouraged. This feedback is part of the judged deliverable, not optional cleanup.

## Preferred path order

### L0 — hardware-backed mandate creation

Best outcome:

- YourTurn presents the exact Recovery Mandate;
- the user approves/signs it with a Ledger-supported path;
- YourTurn verifies the device-backed authorization artifact;
- the mandate is bound to agent, booking serial, scope, minimum amount, expiry and nonce.

This can be an authorization artifact rather than a Hedera transaction signature if the Ledger stack does not support the required Hedera-native signing path. Keep the claim precise.

### L1 — escalation approval

When the agent requests an action outside its current mandate:

> 32 USDC offer; mandate minimum is 40 USDC.

YourTurn blocks autonomous execution and can request a new hardware-backed approval to expand the authority.

Required proof:

- approve path;
- reject path;
- stale/replayed approval rejected;
- expanded permission is no broader than the human saw.

### L2 — Key Ring fallback

If device-backed user authorization is not technically viable in the remaining time, use Ledger Key Ring only where it protects a real sensitive capability/secret used by the YourTurn agent.

Do not hide a generic API key in Key Ring purely to satisfy the sponsor. The secret must control a meaningful execution capability, and the before/after boundary must be visible.

## Hard constraints

- Do not claim Ledger signs Hedera HTS transactions unless that exact path is implemented and proven using supported Ledger tooling.
- Do not weaken YourTurn policy because a Ledger approval exists; hardware approval and domain authorization are different layers.
- Do not store signed mandate artifacts without replay/nonce and expiry protection.
- No production secret rotation or mainnet signing in unattended runs.

## UX requirement

The customer should see one sentence before device approval, e.g.:

> Allow Alice's Concierge to resell booking #193 for at least 40 USDC until tomorrow at 17:00. Cancellation is not allowed.

No raw JSON/signature prompt as the hero UX.

## Required Ledger feedback artifact

Before qualification can turn green, add a sponsor feedback document that records:

- overall experience with Ledger docs and SDKs;
- exact gaps, confusing flows, or missing context hit during this integration;
- concrete suggested improvements;
- screenshots, reproduction notes, or upstream PR links where useful.

The feedback must be grounded in the integration actually attempted, not written generically before using the tools.

## Kill rule

Timebox the supported-path spike. If a real Ledger Agent Stack / device-backed flow is not working quickly enough, record the blocker and replace Ledger with the approved fallback sponsor rather than destabilizing Hedera + World.

## Independent reviewer attack questions

1. What becomes impossible without Ledger that was possible before?
2. Is the device actually involved, or is the UI simulated?
3. Does rejection prevent the authority change?
4. Can a captured signature be replayed?
5. Does the signed content exactly match the human-readable mandate?
6. Are we claiming Hedera signing when Ledger only signed an off-chain/EVM authorization artifact?
7. Is the required Ledger tooling/DX feedback concrete and based on the actual integration?
8. Can a judge run or follow the demonstrated path without Devinson explaining hidden steps live?

Fail on uncertainty.
