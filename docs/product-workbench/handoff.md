# Product Workbench Handoff

## Canonical branch
`ux/yourturn-product-workbench`

## Current product truth
YourTurn is a booking product. ETHOnline adds **Delegated Recovery** as a new capability inside the existing booking journey.

## Current journey set
`YT-01 → YT-04` is implemented as the current candidate at `/product-preview` and remains in **review**.

Independent classification: `REVISE`.

Golden count: **0**.

## What the first test proved
The workbench loop produced a real continuous candidate rather than isolated sponsor screens:

`Landing → enter → My Bookings → Friday Yoga → Change plans → Let YourTurn handle it → booking-scoped recovery rules → secure-approval handoff`

The candidate reuses/adapts prior YourTurn visual and product language and keeps sponsor/backend behavior outside this UX-only branch.

The customer authority contract remains explicit:
- Friday Yoga only;
- minimum 40 USDC;
- expires tomorrow 17:00;
- may find an eligible buyer and transfer after an acceptable recovery;
- may not cancel, lower the minimum, or touch another booking;
- anything outside scope requires the customer again.

## Latest reviewer findings
The latest independent review in #34 moved the gate to `REVISE` and identified four material productization gaps:
1. customer-visible prototype/workbench copy;
2. legacy shell/navigation leakage into the candidate;
3. a non-functional email control presented like real authentication;
4. no rendered desktop/mobile interaction evidence on the current head.

## Changes applied in the current revision
The same canonical `/product-preview` candidate was revised without creating a competing route:
- removed progress/workbench/prototype language from the primary customer surface;
- replaced unavailable change-plan notices with product-native booking availability copy;
- removed the fake email path and kept one explicit prepared customer/demo account entry;
- changed the landing CTA to `Open my bookings`;
- aligned `My passes` / pass wording to `My bookings` / booking wording in the customer shell;
- added a `/product-preview` customer header that stays inside the candidate and routes `My bookings` back to `/product-preview?view=bookings` rather than dropping into a legacy screen;
- kept the authorization boundary truthful: status remains `Not authorized yet`, and no Ledger/World/Hedera action is fabricated.

## Verification
Previous candidate lineage passed the ETHOnline Continuity Gate production build and existing policy/baseline checks.

Current revised head is being re-verified by the same PR CI gate. Automatic Vercel preview remains blocked by the project's build-rate limit and is not counted as visual acceptance evidence.

Rendered desktop/mobile interaction evidence is still required before `GOLDEN-READY`.

## Exact next action
1. Let the current revised head finish the ETHOnline Continuity Gate and repair any real failure before doing more UX work.
2. Independent Product Reviewer #34 re-reviews this exact candidate after CI truth is known.
3. Obtain rendered desktop/mobile interaction evidence when an allowed preview/browser surface is available.

Do not start a competing prototype route. Do not freeze automatically.

After the reviewer marks the exact candidate `GOLDEN-READY`, Devinson must explicitly approve that exact candidate before it becomes `Golden`.

## Integration contract
Sponsor branches own implementation truth:
- Hedera supplies booking authority, transfer, settlement and proof data.
- World supplies human-backed requester / exact-agent verification state.
- Ledger supplies hardware-backed mandate approval/rejection state.

The UX branch owns:
- journey order
- navigation
- copy
- booking card and recovery interaction
- normal-vs-reviewer presentation

The UX branch must not fabricate LIVE sponsor evidence. Until wired, sponsor-dependent states must be clearly fixture/demo state in code and proof UI.

## Anti-drift
If sponsor implementation requires a UX change, record the precise mismatch in #31 rather than changing the user journey independently on a sponsor branch.

## Next after human-approved Golden YT-01→YT-04
Build YT-05→YT-08 as the hero recovery sequence, then YT-09→YT-10 to close buyer ownership and proof/history.
