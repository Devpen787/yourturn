# Product Workbench Handoff

## Canonical branch
`ux/yourturn-product-workbench`

## Current product truth
YourTurn is a booking product. ETHOnline adds **Delegated Recovery** inside that booking journey.

The holder-recovery hero is **YT-01 → YT-08 Golden**.

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

Sponsor-dependent transitions remain fixture/demo state where real integration has not replaced them. Never upgrade those to LIVE through copy.

Sponsor implementation ownership remains:
- **Ledger:** real device-backed approve/reject/cancel of the Recovery Mandate;
- **World:** human-backed requester + exact delegated-agent verification;
- **Hedera:** booking authority, transfer, settlement and public proof.

## Post-Golden product contract is established

Issue #40's required architecture/process outputs now exist:
- `DESIGN.md` — Golden-derived visual/product design contract;
- `GLOSSARY.md` — domain vocabulary + `Avoid:` aliases;
- `CRAFT.md` — state coverage, accessibility, responsive, copy and interaction rules;
- `integration-ledger.md` — Golden fixture → real owner/interface/evidence/failure map;
- `stakeholder-coverage-gate.md` — now applied to the next continuation;
- `next-slice.md` — selected connected acquirer/provider slice.

These are source-of-truth artifacts, not permission to mutate Golden YT-01→YT-08.

## Integration evidence anchors mined

### Ledger
Latest inspected branch head: `feature/ethonline-ledger@dfb3fec6328c5db22aa6b6eb222b5e0a57f3b54a`.

Concrete Recovery-Mandate interfaces include:
- `/api/ledger/recovery-mandate/prepare`;
- `/api/ledger/recovery-mandate/activate`;
- active mandate/replay/live-booking-state guards.

Current runtime proof is `CI_CONFIGURED` and explicitly does **not** prove Ledger hardware provenance or downstream Hedera recovery consumption. Keep the device-proof and integration gap open until real evidence closes it.

### World
Latest inspected branch head: `feature/ethonline-world@2ab04f4420cccc2c090cd5f5634e447d399eb139`.

Current evidence is **LIVE/AGENTBOOK** for production registration/resolution and **CI/READY, NOT LIVE** for the bounded AgentKit-signed `create_listing` route harness. The registered-agent signed recovery mutation has not yet been executed against the required initialized non-production YourTurn target, and separate World ID Sandbox evidence is still missing. The bounded route proves privacy-safe `human-backed-agent` / exact delegated-agent semantics only; it is not proof of booking ownership/provider entitlement and is not yet the full Recovery-Mandate execution path.

### Hedera
Latest inspected branch head: `feature/ethonline-hedera@40890aab7729075edbf5efac5f5367f4b5a022e1`.

Current HAK/policy seam includes `preparePolicyAuthorizedUsdcRecovery(...)`, `BookingRightDelegationPolicy`, and `yourturn_delegated_recovery_settle_nft_usdc` in `RETURN_BYTES` mode. Current proof is CI/LOCAL testnet semantics and explicitly returns unsigned, unsubmitted bytes; do not represent it as LIVE settlement until actual signing/submission/receipt/state reconciliation exists.

See `integration-ledger.md` for state-by-state acceptance boundaries.

## Stakeholder gate result

The stakeholder gate is now applied. The next product slice is not a holder-only YT-09/YT-10 extension.

Selected slice:

### XC-01 — Eligible next holder + provider-recognized handoff

`Studio A pre-defined recovery rules → Bob finds/evaluates Friday Yoga → Bob satisfies eligibility + commits to the 45 USDC acquisition → Golden Maya recovery accepts inside scope → Maya sees You recovered 45 USDC → Bob receives Friday Yoga as a normal usable booking → Studio A sees Bob as the authoritative current holder`

Load-bearing coverage:
- acquirer A-01→A-04, narrowly;
- provider P-03, P-06, P-07, narrowly;
- existing Golden Maya YT-08 handoff unchanged;
- A-05/P-08 check-in immediately follows if it cannot be truthfully reused from existing normal fulfilment paths without widening the first candidate.

Durable permission rule:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`

Provider policy must be pre-defined and load-bearing. No manual Studio A approval popup for each compliant recovery.

## Prior UX to reuse/adapt for XC-01

From `feat/product-issuer-holder-ux`:
- `app/slots/page.tsx` / `SlotsClient.tsx`: live session state, browse/status/loading/error patterns;
- `app/resale/[serial]/ResaleClient.tsx`: buyer/seller separation, provider-rule blocking, pending/error/success purchase, holder refresh;
- `app/issuer/IssuerPanel.tsx`: session/inventory/policy/holder operational patterns.

Reuse those behaviors where strong. Do **not** carry forward `Person A/B`, `pass`, `issuer`, raw refs/account IDs, HBAR-first price language, HashScan-first success, or a generic admin-dashboard visual hierarchy into the next Golden candidate.

## Exact next action

**BUILD one XC-01 candidate only.**

Before editing the executable:
- use `DESIGN.md`, `GLOSSARY.md`, `CRAFT.md`, `integration-ledger.md`, and `next-slice.md` as the current contract;
- preserve the two frozen Golden executable contracts;
- extend the canonical product workbench rather than creating a competing route;
- keep technical sponsor proof secondary and new sponsor-dependent states explicit fixture/non-LIVE until integrated;
- apply relevant pending/empty/error/success/edge coverage from `CRAFT.md` to new acquirer/provider states.

Every material executable UX change must run:
1. strongest available production build;
2. real Chromium journey;
3. exact-head screenshots for every meaningful changed/adjacent state at desktop `~1440×1000` and mobile `~390×844`;
4. `product-workbench-rendered-evidence` upload bound to the exact executable SHA;
5. direct Product Reviewer #34 PNG inspection.

Do not self-certify Golden. Reviewer may mark exact candidate `GOLDEN-READY`; Devinson explicitly approves before freeze.

## Integration guardrail

Do not treat YT-05→YT-08 as fully integrated until `integration-ledger.md` acceptance items are replaced by real sponsor-backed behavior and the integrated result survives security/reviewer gates.

If sponsor implementation conflicts with the Golden product contract, record the precise mismatch in Product Workbench #31 rather than silently changing UX or backend semantics.
