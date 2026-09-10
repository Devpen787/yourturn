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

Status: **GOLDEN-READY**, not `Golden`.

Exact executable candidate:

`92df1f0b253ae028b09f90975162a3315a30b994`

Product Reviewer #34 directly inspected the exact-head desktop/mobile PNG evidence and found no remaining material blocker. Devinson's explicit approval of this exact executable is the remaining freeze gate.

The branch may contain later **docs-only** descendants for truth synchronization; they do not change the executable candidate above.

Customer story implemented:

`secure approval → Ledger not ready → waiting for Ledger → approve / reject / cancel → recovery active with exact human-backed delegated agent → 32 USDC offer blocked → optional new-authority path to lower the minimum → keep 40 USDC rule → 45 USDC offer inside scope → recovery completes → You recovered 45 USDC → Friday Yoga leaves Maya's usable-booking state`

### YT-05 — Delegate

Implemented customer states:
- secure device not ready before initial authority exists;
- exact Friday Yoga / 40 USDC / tomorrow 17:00 / no-cancel mandate repeated from Golden YT-04;
- waiting for the secure-device result;
- approved on Ledger;
- rejected on Ledger with no authority created;
- host/device ceremony cancelled with no authority created;
- replacement-authority flow repeats the same ceremony for a proposed lower minimum while the current 40 USDC authority remains active until replacement approval.

The UX contract is anchored to Ledger branch `feature/ethonline-ledger` head `1d50b01c619687950bd87130baf30a3ae2b4a927`:
- Recovery Mandate uses Ledger DMK EIP-712 typed-data signing;
- approval requires typed-data user interaction + exclusive `Completed` terminal state + signature;
- reject/cancel produce no signature and no new authority;
- Ledger authorizes the off-chain Recovery Mandate and is **not** represented as signing Hedera HTS transfers.

### YT-06 — Agent working

Implemented customer state:
- `Recovery active`;
- `Exact delegated agent verified`;
- `Human-backed` trust signal;
- complete active limits remain visible: 40 USDC minimum, `Tomorrow · 17:00`, Friday-Yoga-only scope, no-cancel/no-widen;
- clear `Stop recovery` action exists;
- no raw World human identifier is rendered to the customer.

The UX seam is anchored to World branch `feature/ethonline-world` head `2ab04f4420cccc2c090cd5f5634e447d399eb139`, whose proof path exposes a public `human-backed-agent` trust signal, verifies the exact delegated agent, and keeps the AgentBook human id out of output.

### YT-07 — Block / escalate

Implemented negative path:
- 32 USDC arrives under the active 40 USDC mandate;
- primary result: `32 USDC was not accepted` / `Offer blocked`;
- UI explicitly states `No booking transfer. No settlement.`;
- the customer is not interrupted merely because the bad offer arrived;
- `Keep looking` preserves the current authority;
- `Lower my minimum` opens a new-authority decision showing current 40 USDC vs proposed 30 USDC;
- proposed 30 USDC routes back to Ledger authorization and the current 40 USDC authority remains active until replacement approval.

### YT-08 — Successful recovery

Implemented in-scope path:
- 45 USDC is recognized as within the current 40 USDC minimum;
- no new owner prompt is required;
- customer sees transfer + settlement as one bounded recovery outcome;
- primary completion: `You recovered 45 USDC`;
- Friday Yoga becomes `Transferred`;
- returning to My Bookings shows it only as a recently recovered item, with no usable `View booking` action;
- other bookings remain unchanged.

The settlement proof seam is anchored to Hedera branch `feature/ethonline-hedera` head `12c591afc21c035062a8e939f7abe12cf7875121`, whose atomic USDC recovery validator restricts the signed transaction to the exact booking transfer plus exact HTS USDC settlement and rejects widened transfer bytes.

## UX / proof boundaries

The UX branch owns journey order, information hierarchy, customer copy, booking/recovery states, trust-boundary presentation, responsive behavior, and the reviewer-drawer presentation contract.

Sponsor branches own implementation truth:
- **Ledger:** real device-backed approval/rejection of the Recovery Mandate;
- **World:** human-backed requester + exact delegated-agent verification;
- **Hedera:** booking authority, transfer, settlement and public proof.

The YT-05→YT-08 executable currently models sponsor-dependent transitions as explicit fixture state. The collapsed `View technical proof` surface is labeled `FIXTURE` and remains non-LIVE until sponsor implementation is wired. Normal customer UI remains booking/recovery-first.

## Exact-head verification for YT-05 → YT-08

Executable candidate: `92df1f0b253ae028b09f90975162a3315a30b994`.

- ETHOnline Continuity Gate `34483781514`: **SUCCESS**.
- Product Workbench Visual Check `34483776864`: **SUCCESS**.
- Production Next.js build: **SUCCESS**.
- Real Chromium journey: **SUCCESS** at desktop `1440×1000` and mobile `390×844`.
- Artifact: `product-workbench-rendered-evidence` / `10154834167`.
- Artifact contains **40 PNGs**: 20 meaningful checkpoints × two viewports.
- Product Reviewer #34 directly inspected all 40 PNGs for this exact SHA and classified it **GOLDEN-READY**.
- The two prior authority-clarity defects are visibly closed: replacement authorization preserves the existing 40 USDC authority, and active recovery retains expiry `Tomorrow · 17:00`.

## Exact next action

**Human freeze decision only.**

Devinson must explicitly approve exact executable `92df1f0b253ae028b09f90975162a3315a30b994` before YT-05→YT-08 becomes `Golden`.

Until that approval is recorded:
- do not mutate the executable for speculative polish;
- do not start YT-09/YT-10;
- do not activate stakeholder/acquirer/provider implementation;
- do not treat fixture transitions as integrated product truth.

After exact approval:
1. freeze YT-05→YT-08 and create its Golden record;
2. extract the YourTurn `DESIGN.md` / design contract and domain glossary from approved Golden evidence per #40;
3. apply `stakeholder-coverage-gate.md` and #39, map acquirer/provider lanes, then choose the smallest connected next slice;
4. create/use the Golden-to-integration acceptance ledger requested in #40 before fixture UX states are treated as integrated product truth.

## Anti-drift

Durable permission rule:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`

Provider policy must be load-bearing without requiring provider staff to approve every compliant recovery.

If a sponsor implementation constraint conflicts with a Golden product journey, record the precise mismatch in Product Workbench #31 rather than changing the journey independently on a sponsor branch.
