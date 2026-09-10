# Product Workbench Handoff

## Canonical branch
`ux/yourturn-product-workbench`

## Current product truth
YourTurn is a booking product. ETHOnline adds **Delegated Recovery** as a new capability inside the existing booking journey.

## Current journey set
`YT-01 → YT-04` is implemented as the canonical candidate at `/product-preview`.

Exact reviewed candidate: `e3905833ec456ecc08e7733e0ec746686fd6b7e4`.

Independent classification: **GOLDEN-READY**.

This is **not Golden**. The remaining gate is Devinson's explicit approval of this exact candidate.

Golden count: **0**.

## What the first test proved
The workbench loop produced a real continuous candidate rather than isolated sponsor screens:

`Landing → enter → My Bookings → Friday Yoga → Change plans → Let YourTurn handle it → booking-scoped recovery rules → secure-approval handoff`

The candidate reuses/adapts prior YourTurn visual and product language and keeps sponsor/backend behavior outside this UX-only branch.

The customer authority contract is explicit:
- Friday Yoga only;
- minimum 40 USDC;
- expires tomorrow 17:00;
- may find an eligible buyer and transfer after an acceptable recovery;
- may not cancel, lower the minimum, or touch another booking;
- anything outside scope requires the customer again.

## Latest reviewer state
Product Reviewer #34 classified exact candidate `e3905833ec456ecc08e7733e0ec746686fd6b7e4` **GOLDEN-READY** after the remaining entry-semantics defect was fixed and both exact-head gates completed successfully.

No material YT-01→YT-04 UX revision is currently requested.

The accepted product contract remains:
- landing and booking flow are customer-first rather than sponsor-first;
- all unauthenticated `My bookings` affordances converge on exact `/product-preview` before the prepared Maya entry state;
- `My bookings` is the ownership center;
- `Change plans → Let YourTurn handle it` is a natural product path;
- authority is Friday-Yoga-only, minimum 40 USDC, expires tomorrow 17:00, cancellation forbidden, and grants no authority over other bookings/account state;
- scope acknowledgement is required before continuing;
- YT-04 ends truthfully at disabled `Not authorized yet` / secure-device approval;
- no Ledger/World/Hedera LIVE state is fabricated;
- no second competing candidate route exists.

## Verification
Exact candidate: `e3905833ec456ecc08e7733e0ec746686fd6b7e4`.

ETHOnline Continuity Gate run `34437850556`: **SUCCESS** on that exact SHA. Install, production build, Hedera policy/proof check and continuity-baseline checks passed.

Product Workbench Visual Check run `34437847330`: **SUCCESS** on that exact SHA. It launched the production build and exercised the complete YT-01→YT-04 interaction at:
- desktop: `1440×1000`;
- mobile: `390×844`.

Rendered evidence artifact: `product-workbench-rendered-evidence` (`10136877079`), 12 PNG checkpoints bound to the exact candidate. The workflow log concluded: `Product Workbench visual check passed at desktop and mobile widths.`

The rendered regression assertion now requires exact `/product-preview` equality for unauthenticated landing booking-entry affordances, preventing a return of the split entry-state defect.

Automatic Vercel preview is not counted as product proof; GitHub-hosted rendered interaction evidence is the accepted verification source for this candidate.

## Exact next action
**Human freeze decision only.**

Devinson must explicitly approve exact candidate `e3905833ec456ecc08e7733e0ec746686fd6b7e4` before YT-01→YT-04 becomes `Golden`.

While that approval is pending:
- do not change the candidate without a new material reviewer finding or verification failure;
- do not create a second canonical prototype route;
- do not start YT-05→YT-08 in this workbench;
- do not integrate this UX as Golden product truth.

After explicit approval is recorded, freeze the exact candidate as Golden and advance the workbench to YT-05→YT-08.

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
