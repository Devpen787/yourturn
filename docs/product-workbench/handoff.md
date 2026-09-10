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

## Post-Golden product contract

Issue #40's required architecture/process outputs exist:
- `DESIGN.md` — Golden-derived visual/product design contract;
- `GLOSSARY.md` — domain vocabulary + `Avoid:` aliases;
- `CRAFT.md` — state coverage, accessibility, responsive, copy and interaction rules;
- `integration-ledger.md` — Golden fixture → real owner/interface/evidence/failure map;
- `stakeholder-coverage-gate.md` — applied to the continuation;
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

## Active product slice

### XC-01 — Eligible next holder + provider-recognized handoff

Exact executable candidate under Product Reviewer #34 review:
`eb3bcdb84ff95352adf1d0c387996f9a4692c52f`.

Canonical route remains `/product-preview`; XC-01 uses `?view=xc-*` state selection and does not create a competing prototype route.

Frozen Golden behavior is preserved by moving the exact prior page blob `c5a81a5b475c2e05dbf6b78b3780c806c60a08c2` into `GoldenRecoveryClient.tsx`; the router only dispatches `xc-*` views to the new candidate.

Connected story:

`Studio A pre-defined recovery rules → Bob finds/evaluates Friday Yoga → Bob passes eligibility + commits 45 USDC → provider/payment/holder state reconcile → Bob receives Friday Yoga as a normal usable booking → Studio A sees Bob as authoritative current holder`

Load-bearing coverage:
- provider reusable allow rules and later changed/blocking rule;
- acquirer available/taken and eligible/ineligible states;
- payment pending/error/retry and confirmed 45-USDC opportunity;
- reconciliation and partial/unknown state before success;
- Bob normal confirmed usable booking + check-in seam;
- Studio A Maya→Bob current-holder state;
- no individual Studio A approval step for a compliant recovery.

Durable permission rule:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`

Provider policy remains pre-defined and load-bearing.

## XC-01 proof

Exact executable: `eb3bcdb84ff95352adf1d0c387996f9a4692c52f`.

- ETHOnline Continuity Gate `34519307635`: **SUCCESS**;
- Product Workbench Visual Check `34519301160`: **SUCCESS**;
- exact-head artifact `product-workbench-rendered-evidence` / `10169073722`;
- **72 PNGs** uploaded: 44 Golden regression checkpoints + 28 XC-01 captures (14 XC states × desktop `1440×1000` and mobile `390×844`);
- responsive XC smoke additionally passes at 360 / 430 / 768 / 1024 px;
- rendered assertions cover correct Bob/Studio A audience headers, no horizontal overflow, no Person A/B / `My passes` / raw ref or wallet vocabulary, and no raw `0x...` identity leakage.

The executable loop found and fixed two real issues before review: an initial production-lint failure and an inherited Maya header on Bob/provider states.

All new sponsor-dependent proof seams are collapsed and marked `FIXTURE`; no new LIVE sponsor execution is claimed.

## Prior UX reused/adapted

From `feat/product-issuer-holder-ux`:
- `app/slots/page.tsx` / `SlotsClient.tsx`: availability/status/loading/error patterns;
- `app/resale/[serial]/ResaleClient.tsx`: buyer/seller separation, provider-rule blocking, pending/error/success purchase, holder refresh;
- `app/issuer/IssuerPanel.tsx`: session/inventory/policy/holder operational patterns.

The XC-01 candidate deliberately does **not** carry forward `Person A/B`, `pass`, `issuer`, raw refs/account IDs, HBAR-first price language, HashScan-first success, or generic admin-dashboard hierarchy.

## Exact next action

**Product Reviewer #34 direct PNG review only.**

Reviewer must inspect artifact `10169073722` for exact executable `eb3bcdb84ff95352adf1d0c387996f9a4692c52f` and classify only `REVISE`, `REVIEWABLE`, or `GOLDEN-READY`.

If `REVISE`, fix only the concrete finding and regenerate exact-head production/Chromium evidence. If `GOLDEN-READY`, Devinson must explicitly approve that exact executable before XC-01 can freeze.

Do not widen into another slice while this review is pending.

## Integration guardrail

Do not treat Golden YT-05→YT-08 or XC-01 as fully integrated until `integration-ledger.md` acceptance items are replaced by real sponsor-backed behavior and the integrated result survives security/reviewer gates.

If sponsor implementation conflicts with Golden product truth, record the precise mismatch in Product Workbench #31 rather than silently changing UX or backend semantics.
