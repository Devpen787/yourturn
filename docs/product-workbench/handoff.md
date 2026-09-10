# Product Workbench Handoff

## Canonical branch
`ux/yourturn-product-workbench`

## Current product truth
YourTurn is a booking product. ETHOnline adds **Delegated Recovery** as a new capability inside the existing booking journey.

## Current journey set
`YT-01 → YT-04` is the active candidate set.

## Exact next action
Mine the strongest existing landing/auth/My Bookings/booking-detail components from `feat/product-issuer-holder-ux` and `main`, then build one continuous clickable candidate:

`Landing → demo/login entry → My Bookings → Friday Yoga → Change plans → Let YourTurn handle it → define 40 USDC / expiry / no-cancel mandate → continue to authorization`

Do not create isolated sponsor-demo screens.

## Required review outcome
The next review must answer:
1. Can a new user understand YourTurn before seeing any crypto terminology?
2. Is `Change plans` a natural doorway into Delegated Recovery?
3. Does the recovery setup make booking-scoped authority obvious?
4. Does the candidate hand off cleanly into Ledger/World/Hedera behavior without changing product architecture?

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
If a sponsor implementation requires a UX change, record the precise mismatch in issue #31 rather than changing the user journey independently on the sponsor branch.

## Progress
- Workbench branch: created.
- Workbench contract: created.
- Journey registry: created.
- Product invariants: created.
- Review checklist: created.
- Clickable YT-01→YT-04 candidate: not yet built.
- Golden journeys: 0.

## Next after YT-01→YT-04
Build YT-05→YT-08 as the hero recovery sequence, then YT-09→YT-10 to close buyer ownership and proof/history.
