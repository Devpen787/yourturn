# Product Workbench Handoff

## Canonical branch
`ux/yourturn-product-workbench`

## Current product truth
YourTurn is a booking product. ETHOnline adds **Delegated Recovery** as a new capability inside the existing booking journey.

## Golden product truth
`YT-01 → YT-04` is now **Golden**.

Frozen executable candidate: `24bbf0d7516499069f5102ae4bf724b0cb376b94`.

Golden record: `docs/product-workbench/golden/yt-01-04.md`.

Why this is frozen:
- Product Reviewer #34 classified the exact candidate `GOLDEN-READY` after direct inspection of its rendered desktop/mobile evidence;
- ETHOnline Continuity Gate `34472117038`: SUCCESS;
- Product Workbench Visual Check `34472112881`: SUCCESS;
- rendered artifact `product-workbench-rendered-evidence` / `10150035697`: 14 PNGs, seven checkpoints × desktop/mobile;
- Devinson explicitly approved this exact candidate for freeze on 2026-09-10.

Golden count: **4 journeys**.

The frozen customer journey is:

`Landing → enter → My Bookings → Friday Yoga → Change plans → Let YourTurn handle it → booking-scoped recovery rules → secure-approval handoff`

The authority contract is:
- Friday Yoga only;
- minimum 40 USDC;
- expires tomorrow 17:00;
- may find an eligible buyer and transfer after an acceptable recovery;
- may not cancel, lower the minimum, change its own limits, or touch another booking;
- anything outside scope requires the customer again.

Sponsor implementation must plug into this Golden product contract without silently redesigning it.

## Current active set
`YT-05 → YT-08`

Status: **candidate**.

Build one continuous continuation of the Golden flow, not four isolated sponsor screens.

Target customer story:

`secure approval → mandate approved on Ledger → recovery active with exact human-backed delegated agent → 32 USDC offer blocked automatically → 45 USDC offer allowed automatically → Hedera booking transfer + 45 USDC settlement → You recovered 45 USDC`

### YT-05 — Delegate

The product must show the exact same authority the customer just reviewed, then represent the Ledger device interaction truthfully:
- device not ready / connection state;
- waiting for confirmation;
- approved;
- rejected/cancelled;
- rejection/cancel creates no equivalent authority;
- successful approval transitions into recovery-active state.

Ledger authorizes the off-chain Recovery Mandate. Do not claim Ledger signs the Hedera booking transfer.

### YT-06 — Agent working

The product must make recovery feel active but bounded:
- `Recovery active`;
- exact delegated agent is verified as human-backed;
- raw World human identifiers never appear in normal UI or proof artifacts;
- approved rules remain visible on demand;
- stopping/revoking recovery is understandable;
- World evidence belongs in a secondary reviewer/proof surface.

### YT-07 — Block / escalate

Hero negative-path product state:
- offer: 32 USDC;
- result: `Not accepted — below your 40 USDC minimum`;
- no transfer and no settlement;
- customer does not need to act just because an invalid offer appears;
- lowering the minimum is a new authorization decision and returns to Ledger rather than mutating the current mandate.

### YT-08 — Successful recovery

Hero success product state:
- offer: 45 USDC;
- result: inside approved rules;
- agent proceeds without another owner prompt;
- Hedera transfer + Alice settlement completes when integrated;
- primary customer result: `You recovered 45 USDC`;
- Friday Yoga leaves Alice's usable-booking state;
- reviewer drawer exposes truthful LIVE/TESTNET evidence and public transaction links without taking over the customer surface.

## UX / proof boundaries

The UX branch owns:
- journey order;
- information hierarchy;
- customer copy;
- booking/recovery states;
- trust-boundary presentation;
- responsive behavior;
- reviewer-drawer presentation contract.

Sponsor branches own implementation truth:
- **Ledger:** real device-backed approval/rejection of the Recovery Mandate;
- **World:** human-backed requester + exact delegated-agent verification;
- **Hedera:** booking authority, transfer, settlement and public proof.

Until wired into the integration branch, sponsor-dependent UX states may use explicit fixture/demo data internally, but they must never claim LIVE sponsor execution.

## Required visual loop

For every material YT-05→YT-08 candidate:
1. production build;
2. real Chromium interaction path;
3. desktop `1440×1000` screenshots;
4. mobile `390×844` screenshots;
5. capture all meaningful states, including Ledger reject/cancel, 32 USDC blocked, 45 USDC success, and recovery-active state;
6. Product Reviewer #34 directly inspects the exact-head PNG artifact;
7. reviewer classifies `REVISE`, `REVIEWABLE`, or `GOLDEN-READY`;
8. Devinson explicitly approves the exact candidate before freeze.

## Exact next action

Build the first continuous YT-05→YT-08 candidate on the existing `/product-preview` flow, beginning from the Golden secure-approval handoff. Reuse the current Golden shell rather than redesigning YT-01→YT-04.

The candidate should include truthful fixture states for sponsor-dependent interactions where live wiring is not yet integrated, and expose clean seams that the Integrator can replace with real Ledger / World / Hedera state without product redesign.

Do not start YT-09→YT-10 until the YT-05→YT-08 candidate has been independently reviewed.

## Anti-drift

If a sponsor implementation constraint conflicts with this product journey, record the precise mismatch in Product Workbench #31 rather than changing the user journey independently on a sponsor branch.
