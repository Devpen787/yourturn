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
| YT-09 New holder | Buyer sees and can use the transferred booking | queued / bridge | P1 |
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

## Active product-workbench gate

The holder-recovery hero YT-01→YT-08 is now Golden. Do **not** jump directly into a holder-only YT-09/YT-10 extension.

Before the next complete product slice:
1. extract a concrete YourTurn `DESIGN.md` / design contract from the approved Golden evidence per issue #40;
2. establish the domain glossary and reusable craft/review rules;
3. apply `stakeholder-coverage-gate.md` and issue #39;
4. map the acquirer lane and provider lane against the same Golden product/design contract;
5. choose the smallest connected next slice that respects:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`

YT-09 and YT-10 remain bridge concepts into the acquirer/history experience, but they are not sufficient by themselves to define the next complete product slice.

## Golden-to-integration requirement

Before YT-05→YT-08 is treated as integrated product truth, create/use the acceptance ledger requested in issue #40. For every Golden state/action map:
- intended customer behavior;
- UI/component owner;
- backend/sponsor owner;
- current evidence source (`FIXTURE`, `LIVE/TESTNET`, `CI`, etc.);
- real interface/action that replaces the fixture;
- acceptance/evidence needed;
- failure/rollback behavior.

A transaction receipt or holder-only success screen does not count as complete product coverage.

## Completion principle

The product loop is complete only when all relevant perspectives reconcile:
- provider policy permits the recovery and the authoritative holder change is coherent;
- previous holder no longer owns the booking and has recovered value;
- new holder owns a normal usable Friday Yoga booking and can fulfil/check in.