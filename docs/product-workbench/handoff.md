# Product Workbench Handoff

## Canonical branch
`ux/yourturn-product-workbench`

## Current product truth
YourTurn is a booking product. ETHOnline adds **Delegated Recovery** as a new capability inside the existing booking journey.

## Golden product truth
`YT-01 → YT-04` is **Golden**.

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

Status: **review**.

Exact executable candidate ready for independent review:

`3b3ed50000b70718e43caaf4af36f1076a46755b`

This candidate extends the same `/product-preview` state machine rather than creating a sponsor demo or competing route.

Customer story now implemented:

`secure approval → Ledger not ready → waiting for Ledger → approve / reject / cancel → recovery active with exact human-backed delegated agent → 32 USDC offer blocked → optional new-authority path to lower the minimum → keep 40 USDC rule → 45 USDC offer inside scope → recovery completes → You recovered 45 USDC → Friday Yoga leaves Maya's usable-booking state`

### YT-05 — Delegate

Implemented customer states:
- `Ledger not connected` before any authority exists;
- exact Friday Yoga / 40 USDC / tomorrow 17:00 / no-cancel mandate repeated from Golden YT-04;
- waiting for the secure-device result;
- approved on Ledger;
- rejected on Ledger with no authority created;
- host/device ceremony cancelled with no authority created;
- replacement-authority flow can repeat the same ceremony for a proposed new minimum while the current authority remains intact until approval.

The UX contract is anchored to current Ledger branch `feature/ethonline-ledger` head `1d50b01c619687950bd87130baf30a3ae2b4a927`:
- Recovery Mandate uses Ledger DMK EIP-712 typed-data signing;
- approval requires typed-data user interaction + exclusive `Completed` terminal state + signature;
- reject requires the Ledger rejection terminal and no signature;
- cancel requires the stopped/cancel terminal and no signature;
- Ledger authorizes the off-chain Recovery Mandate and is **not** represented as signing Hedera HTS transfers.

### YT-06 — Agent working

Implemented customer state:
- `Recovery active`;
- `Exact delegated agent verified`;
- `Human-backed` trust signal;
- active minimum, Friday-Yoga-only scope and no-cancel/no-widen boundary remain readable;
- clear `Stop recovery` action exists;
- no raw World human identifier is rendered to the customer.

The UX seam is anchored to current World branch `feature/ethonline-world` head `2ab04f4420cccc2c090cd5f5634e447d399eb139`, whose proof path exposes a public `human-backed-agent` trust signal, verifies the exact delegated agent, and deliberately keeps the AgentBook human id out of output.

### YT-07 — Block / escalate

Implemented negative path:
- 32 USDC arrives under the active 40 USDC mandate;
- primary result: `32 USDC was not accepted` / `Offer blocked`;
- UI explicitly states `No booking transfer. No settlement.`;
- the customer is not asked to approve anything simply because the bad offer arrived;
- `Keep looking` preserves the current authority;
- `Lower my minimum` opens a new-authority decision showing current 40 USDC vs proposed 30 USDC;
- proposed 30 USDC routes back to Ledger authorization and states that current 40 USDC authority remains active until replacement approval.

### YT-08 — Successful recovery

Implemented in-scope path:
- 45 USDC is recognized as within the current 40 USDC minimum;
- UI explicitly says no new owner prompt is needed;
- customer sees transfer + settlement as one bounded recovery outcome;
- primary completion: `You recovered 45 USDC`;
- Friday Yoga becomes `Transferred`;
- returning to My Bookings shows it only as a recently recovered item, with no usable `View booking` action;
- other bookings remain unchanged.

The settlement proof seam is anchored to current Hedera branch `feature/ethonline-hedera` head `12c591afc21c035062a8e939f7abe12cf7875121`, whose atomic USDC recovery validator restricts the signed transaction to the exact booking transfer plus exact HTS USDC settlement and rejects widened transfer bytes.

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

The YT-05→YT-08 candidate currently models sponsor-dependent transitions as explicit fixture state in code. The collapsed `View technical proof` surface is labeled `FIXTURE` and says it is non-LIVE until sponsor implementation is wired. Normal customer UI remains booking/recovery-first.

## Exact-head verification for YT-05 → YT-08

Executable candidate: `3b3ed50000b70718e43caaf4af36f1076a46755b`.

- ETHOnline Continuity Gate `34476233086`: **SUCCESS** on this exact SHA.
- Product Workbench Visual Check `34476226564`: **SUCCESS** on this exact SHA.
- Production Next.js build: **SUCCESS**.
- Real Chromium journey: **SUCCESS** at desktop `1440×1000` and mobile `390×844`.
- Rendered workflow conclusion: `Product Workbench visual check passed YT-01 through YT-08 at desktop and mobile widths.`
- Artifact: `product-workbench-rendered-evidence` / `10151698292`.
- Artifact upload contains **40 PNGs**: 20 meaningful checkpoints × two viewports.
- Captured YT-05→YT-08 evidence includes authorization boundary, Ledger not-ready, waiting, rejected, cancelled, approved, recovery active, 32 USDC blocked, proposed reauthorization, Ledger replacement-authority seam, 45 USDC allowed, recovery success, opened proof drawer, and My Bookings after recovery.

The rendered check also asserts that no raw `0x...` 40-byte identifier leaks into the customer surface during agent/recovery states and that Friday Yoga exposes no usable `View booking` action after successful recovery.

## Exact next action

**Independent Product Reviewer #34 must directly inspect artifact `10151698292` for exact executable candidate `3b3ed50000b70718e43caaf4af36f1076a46755b`.**

The reviewer should classify only `REVISE`, `REVIEWABLE`, or `GOLDEN-READY` under the hard visual gate. A green workflow alone is not visual approval.

If review finds a material UX or truth issue, fix only that concrete finding and regenerate exact-head evidence.

If this candidate (or a reviewed successor) reaches `GOLDEN-READY`, Devinson must explicitly approve that exact executable candidate before YT-05→YT-08 becomes Golden.

Do not start YT-09→YT-10 until this active set has been independently reviewed.

## Anti-drift

If a sponsor implementation constraint conflicts with this product journey, record the precise mismatch in Product Workbench #31 rather than changing the user journey independently on a sponsor branch.
