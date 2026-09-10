# Product Workbench Handoff

## Canonical branch
`ux/yourturn-product-workbench`

## Current product truth
YourTurn is a booking product. ETHOnline adds **Delegated Recovery** as a new capability inside the existing booking journey.

## Current journey set
`YT-01 → YT-04` is implemented as the current candidate at `/product-preview` and remains in **review**.

Independent classification: `REVISE` pending a fresh review of the revised candidate.

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
4. no rendered desktop/mobile interaction evidence on the reviewed head.

## Changes applied in the current revision
The same canonical `/product-preview` candidate was revised without creating a competing route:
- removed progress/workbench/prototype language from the primary customer surface;
- replaced unavailable change-plan notices with product-native booking availability copy;
- removed the fake email path and kept one explicit prepared customer/demo account entry;
- changed the landing CTA to `Open my bookings`;
- aligned `My passes` / pass wording to `My bookings` / booking wording in the customer shell;
- added a `/product-preview` customer header that stays inside the candidate and routes `My bookings` back to `/product-preview?view=bookings` rather than dropping into a legacy screen;
- fixed that customer-header route to perform a clean navigation so the candidate state resets to My Bookings rather than retaining a later in-page recovery state;
- kept the authorization boundary truthful: status remains `Not authorized yet`, and no Ledger/World/Hedera action is fabricated.

## Verification
Executable candidate commit: `0ffe423eec750b2e70c8f8618c9cbabd18cd1e61`.

ETHOnline Continuity Gate run `34431042865`: **SUCCESS** on that exact commit. Production build, existing Hedera policy/proof check, and continuity-baseline checks passed.

Product Workbench Visual Check run `34431039749`: **SUCCESS** on that exact commit. It launches the production build and exercises the complete YT-01→YT-04 interaction at both:
- desktop: `1440×1000`;
- mobile: `390×844`.

The rendered check verifies customer-native landing/entry, My Bookings, Friday Yoga detail, Change Plans, the unavailable alternate-option state, booking-scoped recovery limits, scope acknowledgement, the truthful disabled authorization boundary, and return navigation to My Bookings. It also rejects known prototype/workbench copy if it reappears.

Rendered evidence artifact: `product-workbench-rendered-evidence` (`10134563369`), 12 PNGs covering six checkpoints at each viewport. Workflow log conclusion: `Product Workbench visual check passed at desktop and mobile widths.`

The verification loop caught two real issues before going green:
1. the first rendered run exposed that the candidate's `My bookings` header route changed the URL but retained the later local recovery state; the product navigation was fixed;
2. the next run exposed a responsive test-locator bug where the hidden mobile header copy was selected before the visible page copy; the assertion now requires any matching rendered node to be visible rather than assuming the first DOM match.

Automatic Vercel preview remains affected by the project's build-rate limit and is not being counted as product proof. GitHub-hosted rendered interaction evidence now covers the previously missing desktop/mobile verification requirement.

## Exact next action
Independent Product Reviewer #34 should re-review the revised `/product-preview` candidate and the exact evidence above, then classify it `REVISE`, `REVIEWABLE`, or `GOLDEN-READY`.

Do not start a competing prototype route. Do not freeze automatically.

If the reviewer marks an exact candidate `GOLDEN-READY`, Devinson must explicitly approve that exact candidate before it becomes `Golden`.

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
