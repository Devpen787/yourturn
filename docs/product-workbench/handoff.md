# Product Workbench Handoff

## Canonical branch
`ux/yourturn-product-workbench`

## Current product truth
YourTurn is a booking product. ETHOnline adds **Delegated Recovery** as a new capability inside the existing booking journey.

## Current journey set
`YT-01 → YT-04` is implemented as the current candidate at `/product-preview` and is in **review**.

Independent classification: `REVIEWABLE`.

Golden count: **0**.

## What the first test proved
The workbench loop produced a real continuous candidate rather than isolated sponsor screens:

`Landing → enter → My Bookings → Friday Yoga → Change plans → Let YourTurn handle it → booking-scoped recovery rules → secure-approval handoff`

The candidate reuses/adapts prior YourTurn visual and product language and keeps sponsor/backend behavior outside this UX-only branch.

The current customer authority contract is explicit:
- Friday Yoga only;
- minimum 40 USDC;
- expires tomorrow 17:00;
- may find an eligible buyer and transfer after an acceptable recovery;
- may not cancel, lower the minimum, or touch another booking;
- anything outside scope requires the customer again.

## Verification
The current candidate lineage has passed the ETHOnline Continuity Gate production build and existing policy/baseline checks. The latest cleanup head also passed the same CI gate.

Automatic Vercel preview status is currently blocked by the project's Vercel build-rate limit, so that is not visual acceptance evidence and is not treated as a product-code failure.

## Exact next action
Address only the three material review findings recorded in #34:
1. replace `Try the booking journey` with customer-native CTA language;
2. remove prototype meta-copy from the non-agent `Change plans` choices;
3. obtain rendered desktop/mobile interaction evidence when a preview/browser surface is available.

Do not start a competing prototype route.

After those findings are cleared, the independent reviewer may mark the exact candidate `GOLDEN-READY`. **Do not freeze it.** Devinson must explicitly approve that exact candidate before it becomes `Golden`.

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
