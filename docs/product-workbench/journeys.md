# Journey Registry

Status vocabulary: `candidate`, `review`, `GOLDEN-READY`, `Golden`, `implemented`, `blocked`.

| Journey | User outcome | Status | ETHOnline priority |
| --- | --- | --- | --- |
| YT-01 Understand & enter | Visitor understands YourTurn and can enter the product | Golden | P0 |
| YT-02 My Bookings | Holder sees owned bookings and their meaningful states | Golden | P0 |
| YT-03 Booking detail | Holder can use a booking or change plans | Golden | P0 |
| YT-04 Recovery setup | Holder defines what YourTurn may do | Golden | P0 |
| YT-05 Delegate | Holder understands and authorizes the mandate with Ledger | GOLDEN-READY | P0 |
| YT-06 Agent working | Holder sees the exact human-backed delegated agent working | GOLDEN-READY | P0 |
| YT-07 Block / escalate | Out-of-scope offer is blocked and escalation boundary is clear | GOLDEN-READY | P0 |
| YT-08 Successful recovery | In-scope offer completes transfer + settlement | GOLDEN-READY | P0 |
| YT-09 New holder | Buyer sees and can use the transferred booking | queued | P1 |
| YT-10 Activity & proof | Both parties can understand what happened; reviewer can inspect evidence | queued | P1 |

## Golden set

**YT-01 → YT-04**

Frozen executable candidate: `24bbf0d7516499069f5102ae4bf724b0cb376b94`.

Golden record: `docs/product-workbench/golden/yt-01-04.md`.

Human approval was explicitly recorded after Product Reviewer #34 classified this exact candidate `GOLDEN-READY` under the hard rendered-visual gate.

Golden customer story:

`Landing → enter → My Bookings → Friday Yoga → Change plans → Let YourTurn handle it → minimum/expiry/actions → secure-approval handoff`

The Golden authority contract is:
- minimum recovery: 40 USDC
- expiry: tomorrow 17:00
- allowed: find an eligible buyer / transfer as required to complete approved recovery
- forbidden: cancel, lower the minimum, touch another booking
- authority applies only to Friday Yoga

## Current review set

**YT-05 → YT-08**

Exact executable candidate:

`d5309a96d532ee107011c2a5cefc3000b9e4932f`

Current classification: **GOLDEN-READY**, not `Golden`.

Product Reviewer #34 directly inspected the exact-head artifact and found no remaining blocking product/interaction, visual/brand, accessibility-at-review-boundary, copy/comprehension, or trust/authority defect. Hold this exact executable unchanged until Devinson explicitly approves it for freeze.

Implemented continuous story:

`secure approval → Ledger not ready → waiting for Ledger → approve / reject / cancel → verified human-backed delegated agent starts recovery → 32 USDC offer BLOCKED → optional new-authorization seam for lower minimum → replacement reject/cancel preserves current 40 USDC recovery → 45 USDC offer ALLOWED → transfer + settlement completion state → You recovered 45 USDC → Friday Yoga removed from Maya's usable bookings`

### YT-05 — Delegate

User outcome: the holder understands exactly what is being authorized and can approve, reject, or cancel the device ceremony without ambiguous authority state.

Implemented product states:
- device not ready / connect-device state;
- awaiting confirmation on device;
- approved;
- initial authorization rejected with no authority created;
- initial authorization cancelled with no authority created;
- identical human-readable mandate details to YT-04: Friday Yoga only, 40 USDC minimum, tomorrow 17:00, cancellation forbidden;
- replacement-authority path repeats the same Ledger boundary rather than mutating a live mandate;
- replacement authorization explicitly preserves the current 40 USDC authority until the replacement is approved;
- rejecting or cancelling the proposed 30 USDC replacement leaves the existing 40 USDC mandate active and unchanged, with a clear return to active recovery;
- no implication that Ledger signs Hedera HTS transactions; Ledger authorizes the off-chain Recovery Mandate.

Ledger interface anchor: `feature/ethonline-ledger@1d50b01c619687950bd87130baf30a3ae2b4a927`.

### YT-06 — Agent working

User outcome: the holder sees that recovery is active and that the exact delegated human-backed agent is the one acting.

Implemented product states:
- `Recovery active`;
- `Exact delegated agent verified`;
- public `Human-backed` status;
- no raw World human identifier in normal UI;
- active minimum / expiry / Friday-Yoga-only / no-cancel-no-widen rules remain legible;
- clear `Stop recovery` action;
- collapsed reviewer proof surface keeps World evidence secondary and currently labels fixture state truthfully.

World interface anchor: `feature/ethonline-world@2ab04f4420cccc2c090cd5f5634e447d399eb139`.

### YT-07 — Block / escalate

User outcome: a 32 USDC offer does not trigger an unauthorized action and the customer understands why.

Implemented product states:
- incoming 32 USDC offer;
- `32 USDC was not accepted` / `Offer blocked`;
- active minimum remains 40 USDC;
- explicit `No booking transfer. No settlement.`;
- no owner intervention is required merely because the invalid offer arrived;
- `Keep looking` preserves the current authority;
- `Lower my minimum` opens a new authority decision with current 40 USDC vs proposed 30 USDC;
- proposed 30 USDC routes back to Ledger approval while the current 40 USDC authority stays active unless replacement approval succeeds;
- replacement rejection/cancellation does not terminate the current 40 USDC recovery authority.

### YT-08 — Successful recovery

User outcome: a 45 USDC offer is inside the approved rules and completes the recovery outcome without another owner permission prompt.

Implemented product states:
- 45 USDC recognized as inside the 40 USDC mandate;
- explicit `No new prompt` / `No extra permission needed`;
- transfer + settlement described as one bounded recovery outcome;
- customer-facing completion: `You recovered 45 USDC`;
- Friday Yoga becomes `Transferred`;
- after returning to My Bookings, Friday Yoga appears only as a recently recovered item with no usable `View booking` action;
- technical proof stays collapsed and explicitly `FIXTURE` until real sponsor wiring.

Hedera interface anchor: `feature/ethonline-hedera@12c591afc21c035062a8e939f7abe12cf7875121`.

## Exact-head proof for current review set

For executable candidate `d5309a96d532ee107011c2a5cefc3000b9e4932f`:
- ETHOnline Continuity Gate `34497826067`: **SUCCESS**.
- Product Workbench Visual Check `34497819955`: **SUCCESS**.
- Production build/start: **SUCCESS**.
- Chromium interaction run: **SUCCESS** at desktop `1440×1000` and mobile `390×844`.
- Evidence artifact: `product-workbench-rendered-evidence` / `10160672183`.
- Exact-head runner captures **44 PNGs**: 22 meaningful checkpoints × two viewports.
- Coverage includes replacement-Ledger rejection and replacement-Ledger cancellation, verifies contradictory no-authority copy is absent, and verifies return to active 40-USDC recovery.
- Product Reviewer #34 directly inspected all 44 PNGs and classified exact executable `d5309a96...` **GOLDEN-READY** with no remaining blocking defect.

## YT-05→YT-08 visual/product rules

- Continue the exact Golden shell, booking card, typography, spacing and status vocabulary from YT-01→YT-04.
- Normal UI must remain booking/recovery-first; Ledger / World / Hedera belong at the trust boundary or reviewer proof layer, not as dashboard chrome.
- Sponsor-dependent behavior may be fixture state in the UX branch until integration, but code and proof surfaces must not label it LIVE unless wired to real sponsor evidence.
- Every material UX candidate must be rendered and screenshot-tested at desktop `1440×1000` and mobile `390×844`.
- Capture every meaningful YT-05→YT-08 state, not only the happy path.
- Product Reviewer #34 must inspect the actual PNG artifact for the exact executable candidate before `GOLDEN-READY`.
- Devinson must explicitly approve the exact candidate before YT-05→YT-08 can become Golden.

## Human freeze gate

Product Reviewer #34 has marked exact executable `d5309a96d532ee107011c2a5cefc3000b9e4932f` **GOLDEN-READY** after direct inspection of artifact `10160672183`.

The sole remaining gate is Devinson's explicit approval of this exact executable. Do not freeze automatically, mutate the candidate for speculative polish, start YT-09/YT-10, or widen into provider/acquirer implementation while approval is pending.

## Next gate after Golden approval

Do **not** jump directly into a holder-only YT-09/YT-10 extension.

After YT-05→YT-08 is human-approved Golden:
1. freeze the exact YT-05→YT-08 executable and record its Golden evidence;
2. extract the compact YourTurn `DESIGN.md` / design contract and domain glossary from approved Golden evidence as required by #40;
3. apply `stakeholder-coverage-gate.md` and issue #39 to map the acquirer and provider lanes;
4. choose the smallest connected next slice that respects `provider rules ∩ holder mandate ∩ acquirer eligibility/payment`;
5. before this Golden holder flow is treated as integrated product truth, create/use the Golden-to-integration acceptance ledger requested in #40 so every fixture state has a real implementation/evidence owner.

YT-09 and YT-10 remain useful bridge concepts, but they are not sufficient on their own to define the next complete product slice.

## Completion principle

The hackathon product journey is not complete until the state is visible on all relevant sides:

- provider policy permits the recovery and the authoritative holder change is coherent;
- previous holder no longer owns the booking and has recovered value;
- new holder owns a usable Friday Yoga booking.

A transaction receipt or holder-only success screen does not count as complete product coverage.
