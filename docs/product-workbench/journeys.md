# Journey Registry

Status vocabulary: `candidate`, `review`, `GOLDEN-READY`, `Golden`, `implemented`, `blocked`.

| Journey | User outcome | Status | ETHOnline priority |
| --- | --- | --- | --- |
| YT-01 Understand & enter | Visitor understands YourTurn and can enter the product | Golden | P0 |
| YT-02 My Bookings | Holder sees owned bookings and their meaningful states | Golden | P0 |
| YT-03 Booking detail | Holder can use a booking or change plans | Golden | P0 |
| YT-04 Recovery setup | Holder defines what YourTurn may do | Golden | P0 |
| YT-05 Delegate | Holder understands and authorizes the mandate with Ledger | Golden | P0 |
| YT-06 Agent working | Holder sees the exact human-backed delegated agent working | Golden | P0 |
| YT-07 Block / escalate | Out-of-scope offer is blocked and escalation boundary is clear | Golden | P0 |
| YT-08 Successful recovery | In-scope offer completes transfer + settlement | Golden | P0 |
| YT-09 New holder | Buyer sees and can use the transferred booking | review / XC-01 bridge | P1 |
| YT-10 Activity & proof | Both parties can understand what happened; reviewer can inspect evidence | queued / bridge | P1 |

## Golden product truth

### YT-01 → YT-04
Frozen executable: `24bbf0d7516499069f5102ae4bf724b0cb376b94`.

Golden record: `docs/product-workbench/golden/yt-01-04.md`.

Customer story:

`Landing → enter → My Bookings → Friday Yoga → Change plans → Let YourTurn handle it → minimum/expiry/actions → secure-approval handoff`

### YT-05 → YT-08
Frozen executable: `d5309a96d532ee107011c2a5cefc3000b9e4932f`.

Golden record: `docs/product-workbench/golden/yt-05-08.md`.

Human approval was explicitly recorded on 2026-09-10 after Product Reviewer #34 classified this exact executable `GOLDEN-READY` under the hard rendered-visual and five-lens review gate.

Exact-head evidence:
- ETHOnline Continuity Gate `34497826067`: **SUCCESS**;
- Product Workbench Visual Check `34497819955`: **SUCCESS**;
- rendered artifact `product-workbench-rendered-evidence` / `10160672183`;
- **44 PNGs**: 22 checkpoints at desktop `1440×1000` and the same 22 at mobile `390×844`;
- five-lens review PASS: Product/interaction, Visual/brand, Accessibility at review boundary, Copy/comprehension, Trust/authority.

Frozen continuous story:

`secure approval → Ledger not ready → waiting → approve / reject / cancel → verified human-backed delegated agent starts recovery → 32 USDC blocked → optional new-authorization seam for lower minimum → replacement reject/cancel preserves current 40 USDC recovery → 45 USDC allowed → transfer + settlement completion state → You recovered 45 USDC → Friday Yoga removed from Maya's usable bookings`

Frozen authority/product behavior:
- Friday Yoga only;
- minimum recovery 40 USDC;
- expiry `Tomorrow · 17:00`;
- cancellation forbidden;
- initial Ledger reject/cancel creates no authority;
- replacement authorization never silently widens the live mandate;
- rejecting/cancelling a proposed 30-USDC replacement leaves the existing 40-USDC recovery active and unchanged;
- exact delegated agent is human-backed/verified without exposing a raw World human identifier;
- 32 USDC is blocked with no transfer/settlement and no needless owner interruption;
- lowering the minimum requires fresh authorization;
- 45 USDC is inside scope and proceeds without another owner prompt;
- completion reads `You recovered 45 USDC` and Friday Yoga is no longer a usable booking for Maya;
- Ledger authorizes the off-chain Recovery Mandate; it is not represented as signing Hedera HTS transactions;
- technical proof remains secondary to the customer experience.

## Golden truth boundary

Golden freezes **product behavior and presentation**, not evidence class.

The YT-05→YT-08 UX executable still contains fixture/demo sponsor transitions where real sponsor integration is not yet wired. Those fixtures must not be presented as LIVE. Integration must replace them with real Ledger / World / Hedera state while preserving the approved customer journey.

## Post-Golden architecture gate

The holder-recovery hero YT-01→YT-08 is Golden and the required post-Golden product contract has been established:
- `DESIGN.md` — Golden-derived visual/product contract;
- `GLOSSARY.md` — domain language and `Avoid:` aliases;
- `CRAFT.md` — state/accessibility/responsive/copy/interaction rules;
- `integration-ledger.md` — Golden fixture-to-real implementation acceptance map;
- stakeholder coverage gate — applied;
- `next-slice.md` — connected continuation selected.

Do **not** treat YT-09/YT-10 as an isolated holder-only next set.

## Active next set

### XC-01 — Eligible next holder + provider-recognized handoff

Status: **review**.

Exact executable candidate under Product Reviewer #34 review:
`eb3bcdb84ff95352adf1d0c387996f9a4692c52f`.

Canonical route remains `/product-preview`; XC-01 is selected with `?view=xc-*` states rather than a competing route. The frozen Golden recovery component is preserved byte-for-byte from blob `c5a81a5b475c2e05dbf6b78b3780c806c60a08c2`.

Connected story:

`Studio A pre-defined recovery rules → Bob finds/evaluates Friday Yoga → Bob satisfies eligibility + commits 45 USDC → provider/payment/holder state reconcile → Bob receives Friday Yoga as a normal usable booking → Studio A sees Bob as authoritative current holder`

Current XC-01 state coverage:
- provider rules allowed and later changed/blocked;
- spot available and already taken;
- Bob eligible and ineligible;
- payment pending, payment error/retry and 45-USDC confirmed opportunity;
- handoff reconciling and partial/unknown reconciliation;
- Bob confirmed normal booking with `Use booking` / check-in seam;
- Studio A current holder Maya → Bob with no individual staff approval.

Core permission rule:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`

Provider policy is pre-defined and load-bearing; a compliant recovery does not require provider staff to manually approve the individual transfer.

### XC-01 exact-head proof

For executable `eb3bcdb84ff95352adf1d0c387996f9a4692c52f`:
- ETHOnline Continuity Gate `34519307635`: **SUCCESS**;
- Product Workbench Visual Check `34519301160`: **SUCCESS**;
- artifact `product-workbench-rendered-evidence` / `10169073722`, bound to the exact executable;
- **72 PNGs** uploaded: 44 frozen-Golden regression checkpoints + 28 XC-01 checkpoints (14 XC states × desktop `1440×1000` and mobile `390×844`);
- XC-01 also passes responsive smoke at 360 / 430 / 768 / 1024 px;
- the rendered runner enforces audience-header correctness, no horizontal overflow, no legacy Person A/B / My passes / Ref # / wallet-ref vocabulary, and no raw `0x...` identity leakage.

All new sponsor-dependent proof seams are collapsed and labeled `FIXTURE`; the Product Workbench does not claim new LIVE execution.

## Golden-to-integration requirement

`integration-ledger.md` records the acceptance boundary for Golden YT-05→YT-08. Key open implementation truths remain:
- Ledger runtime guards are CI_CONFIGURED but hardware/device provenance and downstream Hedera consumption require real proof;
- World AgentBook registration/resolution is **LIVE**, while the bounded signed `create_listing` route harness is **CI/READY, NOT LIVE**; the registered-agent signed recovery mutation and separate World ID Sandbox proof remain outstanding, and World must still be bound to the actual Recovery-Mandate execution path without exposing raw human identity or substituting the legacy approval-grant model for Ledger authority;
- Hedera policy/atomic-USDC semantics are CI/LOCAL and RETURN_BYTES are unsigned/unsubmitted until a real sign/submit/receipt/state-reconciliation path proves settlement.

The Golden prototype and XC-01 candidate are design/product evidence, not automatically the production implementation owner.

## Exact next action

Product Reviewer #34 directly inspects exact artifact `10169073722` for executable `eb3bcdb84ff95352adf1d0c387996f9a4692c52f` and classifies only `REVISE`, `REVIEWABLE`, or `GOLDEN-READY`.

If `REVISE`, fix only concrete reviewer findings and rerun exact-head production + Chromium proof. If `GOLDEN-READY`, Devinson must explicitly approve that exact executable before freeze.

## Completion principle

The product loop is complete only when all relevant perspectives reconcile:
- provider policy permits the recovery and the authoritative holder change is coherent;
- previous holder no longer owns the booking and has recovered value;
- new holder owns a normal usable Friday Yoga booking and can fulfil/check in.
