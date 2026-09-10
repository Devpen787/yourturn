# Product Workbench Handoff

## Canonical branch
`ux/yourturn-product-workbench`

## Current product truth
YourTurn is a booking product. ETHOnline adds **Delegated Recovery** as a new capability inside the existing booking journey.

## Current journey set
`YT-01 → YT-04` remains the only active workbench set at `/product-preview`.

Previous reviewed executable candidate: `e3905833ec456ecc08e7733e0ec746686fd6b7e4`.

That SHA reached `GOLDEN-READY` under the earlier gate and received Devinson's explicit approval, but direct PNG inspection under the tightened visual gate subsequently classified it **REVISE**.

Active revised executable candidate: `24bbf0d7516499069f5102ae4bf724b0cb376b94`.

Current state: **review pending independent inspection of the new exact-head PNG evidence**.

Golden count: **0**.

## Accepted product contract
The continuous customer journey remains:

`Landing → enter → My Bookings → Friday Yoga → Change plans → Let YourTurn handle it → booking-scoped recovery rules → secure-approval handoff`

The authority contract remains unchanged:
- Friday Yoga only;
- minimum 40 USDC;
- expires tomorrow 17:00;
- may find an eligible buyer and transfer after an acceptable recovery;
- may not cancel, lower the minimum, or touch another booking;
- anything outside scope requires the customer again.

No Ledger/World/Hedera LIVE state is fabricated in this UX-only lane.

## Latest Product Reviewer #34 finding
The independent reviewer inspected the actual 12 PNGs from artifact `10136877079` and found three blocking visual/evidence gaps on `e3905833...`:
1. YT-03 Booking detail was traversed but not screenshot-evidenced at either viewport;
2. the 390 px unauthenticated landing header wrapped into mixed customer/provider chrome and visually overpowered customer entry;
3. lower landing copy still used legacy `pass` vocabulary instead of the canonical `booking` language.

Non-blocking polish noted: desktop recovery-limit column balance and mobile recovery-setup length. Those were not expanded into this revision because they do not block the current gate.

## Changes in active candidate `24bbf0d...`
Bounded fixes only:
- `components/SiteHeader.tsx`: at compact unauthenticated landing width, keep `My bookings` and `Sign in` visible while collapsing `Browse`, `Provider dashboard`, and `Register`; preserve the fuller desktop navigation and the dedicated product-preview header.
- `components/home/ExperiencePillars.tsx`: replace `live pass` / `list your pass for resale` language with booking-first copy.
- `scripts/product-workbench-visual-check.mjs`: add explicit desktop/mobile `04-booking-detail` screenshots, enforce absence of the legacy landing pass phrases, and verify the compact mobile landing header does not expose Provider dashboard/Register.

The exact-head screenshot artifact now contains **14 PNGs**: seven meaningful checkpoints × two viewports.

## Verification
For prior candidate `e3905833...`:
- ETHOnline Continuity Gate `34437850556`: SUCCESS.
- Product Workbench Visual Check `34437847330`: SUCCESS.
- artifact `10136877079`: 12 PNGs, directly inspected by Product Reviewer #34.

For active candidate `24bbf0d...`:
- ETHOnline Continuity Gate `34472117038`: **SUCCESS** — install, production build, Hedera policy/proof check and continuity baseline passed.
- Product Workbench Visual Check `34472112881`: **SUCCESS** — production build/start and rendered Chromium journey passed at desktop `1440×1000` and mobile `390×844`.
- artifact `product-workbench-rendered-evidence` / `10150035697`: **14 PNGs**, bound to exact candidate `24bbf0d...`, including YT-03 Booking detail at both viewports.

## Exact next action
Do not widen scope.

Product Reviewer #34 must now download and visually inspect artifact `10150035697` and classify exact candidate `24bbf0d7516499069f5102ae4bf724b0cb376b94` as `REVISE`, `REVIEWABLE`, or `GOLDEN-READY`.

If the reviewer finds another material issue, fix only that concrete finding and regenerate exact-head evidence.

If this revised executable SHA becomes `GOLDEN-READY`, Devinson must explicitly approve this exact SHA before freeze. The earlier approval of `e3905833...` does not silently transfer to changed product code.

Only after Golden freeze may the workbench advance to YT-05→YT-08.

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
