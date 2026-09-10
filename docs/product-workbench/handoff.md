# Product Workbench Handoff

## Canonical branch
`ux/yourturn-product-workbench`

## Current product truth
YourTurn is a booking product. ETHOnline adds **Delegated Recovery** inside that booking journey.

The approved holder-recovery hero is now **YT-01 → YT-08 Golden**.

## Golden records

### YT-01 → YT-04
Frozen executable: `24bbf0d7516499069f5102ae4bf724b0cb376b94`.

Golden record: `docs/product-workbench/golden/yt-01-04.md`.

### YT-05 → YT-08
Frozen executable: `d5309a96d532ee107011c2a5cefc3000b9e4932f`.

Golden record: `docs/product-workbench/golden/yt-05-08.md`.

Human approval was explicitly recorded on 2026-09-10 after Product Reviewer #34 directly inspected all 44 exact-head desktop/mobile PNGs and returned a five-lens `GOLDEN-READY` result.

Exact-head evidence for YT-05→YT-08:
- ETHOnline Continuity Gate `34497826067`: **SUCCESS**;
- Product Workbench Visual Check `34497819955`: **SUCCESS**;
- artifact `product-workbench-rendered-evidence` / `10160672183`;
- 44 PNGs: 22 checkpoints at desktop `1440×1000` + 22 at mobile `390×844`.

Golden count: **8 journeys**.

## Frozen holder-recovery story

`Landing → My Bookings → Friday Yoga → Change plans → Let YourTurn handle it → 40 USDC / Tomorrow 17:00 / no-cancel scope → Ledger authorization → Recovery active with exact human-backed delegated agent → 32 USDC blocked → optional fresh reauthorization to lower minimum → 45 USDC accepted inside scope → You recovered 45 USDC → Friday Yoga no longer usable by Maya`

Important frozen semantics:
- Ledger authorizes the off-chain Recovery Mandate; it is not shown as signing Hedera HTS;
- initial Ledger reject/cancel creates no authority;
- rejecting/cancelling a proposed replacement mandate leaves the existing 40-USDC mandate active and unchanged;
- active recovery visibly retains minimum, expiry, Friday-Yoga-only scope and no-cancel/no-widen rules;
- no raw World human identifier is rendered;
- 32 USDC produces no transfer/settlement;
- 45 USDC is inside scope and does not require another owner prompt;
- technical proof remains secondary to the customer outcome.

## Truth boundary

The approved UX freezes product behavior/presentation, **not sponsor evidence class**.

Sponsor-dependent transitions are still fixture/demo state where real integration has not replaced them. Never upgrade those to LIVE through copy.

Sponsor implementation ownership remains:
- **Ledger:** real device-backed approve/reject/cancel of the Recovery Mandate;
- **World:** human-backed requester + exact delegated-agent verification;
- **Hedera:** booking authority, transfer, settlement and public proof.

## Active product-workbench phase

The holder-recovery hero is complete at the UX/workbench level. The next phase is **architecture + integration contract before further journey implementation**.

Read and apply:
- issue #39 — Acquirer + Provider lanes;
- issue #40 — OpenDesign process lessons;
- `stakeholder-journeys.md`;
- `stakeholder-coverage-gate.md`.

Do **not** jump directly into a holder-only YT-09/YT-10 implementation.

### Exact next product actions
1. Extract a compact YourTurn `DESIGN.md` / design contract from the approved Golden screenshots and existing strongest YourTurn work. Do not redesign the Golden flow.
2. Create the domain glossary with preferred customer terms and `Avoid:` aliases.
3. Create the Golden-to-integration acceptance ledger for YT-05→YT-08.
4. Map the smallest connected acquirer + provider continuation before choosing the next executable journey set.

Core product rule:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`

Provider rules must be pre-defined/load-bearing; a compliant transfer should not require provider staff to approve each recovery manually.

## Golden-to-integration acceptance ledger requirement

For every Golden state/action, map:
- intended customer behavior;
- UI/component owner;
- backend/sponsor owner;
- current source/evidence (`FIXTURE`, `LIVE/TESTNET`, `CI`, etc.);
- real interface/action replacing the fixture;
- acceptance/evidence required;
- failure/rollback behavior.

The Golden prototype is product/design evidence, not automatically the production implementation owner.

## Integration guardrail

Do not treat YT-05→YT-08 as fully integrated until fixture transitions are replaced by real sponsor-backed behavior under the acceptance ledger and the integrated result survives security/reviewer gates.

If sponsor implementation conflicts with the Golden product contract, record the precise mismatch in Product Workbench #31 rather than silently changing the UX or backend semantics.

## Completion principle

The whole product loop is complete only when:
- provider policy permits the recovery and provider state reflects the valid new holder;
- Maya no longer has a usable booking and receives the recovered value;
- Bob has the same Friday Yoga booking as a normal usable booking and can fulfil/check in.