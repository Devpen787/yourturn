# Next Connected Product Slice

Status: **selected architecture slice; not yet an executable candidate**.

This decision follows human-approved Golden YT-01→YT-08, `DESIGN.md`, `GLOSSARY.md`, `CRAFT.md`, the Golden integration ledger, issue #39, and `stakeholder-coverage-gate.md`.

Do not implement this as a second prototype route. When executable work begins, extend the canonical YourTurn product journey and reuse the Golden design contract.

## Why the next slice is not simply YT-09/YT-10

Golden YT-08 proves Maya's product outcome, but the 45-USDC offer is still a workbench fixture and the other sides of the same booking transition are not yet productized.

A holder-only `Bob received it` receipt would leave two load-bearing questions unanswered:
- why was Bob eligible and how did his payment/commitment create the acceptable 45-USDC offer?
- how does Studio A know the booking is still valid and Bob is now the person it should fulfil?

The next slice therefore connects the **acquirer** and **provider** lanes around the already-Golden holder outcome.

## Prior UX mined

### Acquirer / browse and resale
From `feat/product-issuer-holder-ux`:
- `app/slots/page.tsx` already reads live session/holder/listing state;
- `app/slots/SlotsClient.tsx` already has browse rows, availability/held/for-sale states, loading/error handling and a resale entry;
- `app/resale/[serial]/ResaleClient.tsx` already models seller/buyer separation, provider-rule blocks, confirmation, loading/error states and post-purchase holder change.

**Reuse/adapt:** live-state reading patterns, available/held/for-sale distinctions, provider-policy blocking, purchase pending/error/success handling, holder-change refresh.

**Do not copy:** actor switcher as customer UX, `Person A/B`, `pass`, `Ref #`, HBAR-first price language, HashScan-first success, token/account jargon, or the old utilitarian card hierarchy.

### Provider
From `feat/product-issuer-holder-ux/app/issuer/IssuerPanel.tsx`:
- session/inventory overview;
- provider rule inputs including resale allowed;
- operational holder/status view;
- loading/error/success and confirmation patterns.

**Reuse/adapt:** session inventory, policy editing model, operational status and holder-change reconciliation.

**Do not copy:** `issuer`, `pass`, guest/account identifiers as primary labels, raw demo setup controls as the final provider experience, or a manual approval step for each recovery.

## Full lane map

### Acquirer lane
| Lane | Role in product | ETHOnline priority after Golden holder flow |
| --- | --- | --- |
| A-01 Find a spot | Discover released/available bookings | **P0 entry** — minimal browse/find surface for Friday Yoga |
| A-02 Evaluate booking | Understand service, price, eligibility and provider conditions | **P0** |
| A-03 Acquire / pay | Make the valid commitment/payment that can satisfy recovery | **P0** |
| A-04 Receive booking | Friday Yoga appears as a normal usable booking for Bob | **P0** |
| A-05 Use / check in | Bob can fulfil the booking under normal provider rules | **P1 in this slice, P0 for full product completion** |
| A-06 History / receipt | Explain acquisition without protocol knowledge | P1 / pairs with YT-10 |

### Provider lane
| Lane | Role in product | ETHOnline priority after Golden holder flow |
| --- | --- | --- |
| P-01 Join YourTurn | Business onboarding | Post-submission productization |
| P-02 Create/connect inventory | Supply/session setup | Existing source to reuse; not rebuild in next slice |
| P-03 Set rules | Define transfer/recovery/cutoff/eligibility/economics once | **P0 thin provider moment** |
| P-04 Issue/sell | Initial booking acquisition | Existing product foundation; not the next focus |
| P-05 Operate today | See sessions/current holders | Reuse as context |
| P-06 Compliant recovery occurs | No per-recovery staff approval | **P0 behavioral proof, not a popup** |
| P-07 Holder changes | Studio A sees Maya → Bob authoritatively | **P0** |
| P-08 Fulfil/reconcile | Bob can be checked in; provider reconciles final state | P1 in first implementation, required for full end-to-end closure |

## Selected smallest connected slice

### XC-01 — Eligible next holder + provider-recognized handoff

Product story:

`Studio A pre-defines Friday Yoga recovery rules → Bob finds Friday Yoga as a released spot → Bob sees price + eligibility + provider conditions → Bob commits to/acquires at 45 USDC → existing Golden recovery accepts the in-scope 45-USDC opportunity without another Maya prompt → Maya sees You recovered 45 USDC → Bob sees Friday Yoga as a normal usable booking → Studio A sees Bob as the current holder under the pre-defined rules`

This is the smallest slice that makes the Golden 45-USDC recovery legible from all three perspectives without building the entire marketplace/provider platform.

### Included now
- **P-03 thin:** one credible Studio A policy surface/fact for Friday Yoga: recovery/transfer allowed, cancellation forbidden, cutoff/eligibility stated, no per-recovery staff approval.
- **A-01 thin:** one customer-first released/available booking entry for Friday Yoga; no large marketplace taxonomy required.
- **A-02:** normal booking evaluation with service/date/time/provider, 45-USDC acquisition/recovery price, and only user-relevant eligibility/transfer conditions.
- **A-03:** pending/success/error acquisition/payment state that can become the 45-USDC opportunity consumed by the Golden recovery path.
- **A-04 / YT-09 bridge:** Bob receives the same Friday Yoga as a normal usable item in `My bookings`.
- **P-06 behavior:** no manual Studio A approve button appears when provider rule + Maya mandate + Bob eligibility/payment all pass.
- **P-07:** Studio A operational view shows the authoritative holder transition Maya → Bob for the same booking.
- **Cross-lane reconciliation:** Maya, Bob and Studio A reference one underlying Friday Yoga transition.

### Explicitly not required for the first XC-01 candidate
- full provider onboarding P-01;
- rebuilding provider inventory creation P-02;
- all service categories/filters/search ranking;
- a broad resale marketplace;
- full provider accounting/reconciliation suite;
- exhaustive A-06/YT-10 history UI;
- new sponsor-demo pages;
- any change to Hedera/World/Ledger backend semantics.

A-05/P-08 check-in is the immediate completion follow-up if it cannot be demonstrated truthfully through the existing normal booking/check-in path without widening XC-01. The first candidate must at minimum leave Bob with a booking whose normal `Use booking`/fulfilment path is credible and provider-recognized; it must not claim check-in occurred if it did not.

## Stakeholder coverage gate — applied to XC-01

1. **Stakeholder class:** customer + provider; customer roles are Maya/current holder and Bob/acquirer.
2. **Provider rule:** Studio A has pre-defined recovery/transfer permission, cancellation prohibition, cutoff/eligibility constraints and relevant economics before this recovery. No individual staff approval is required when rules pass.
3. **Holder authority:** Golden Maya mandate remains Friday-Yoga-only, minimum 40 USDC, expires Tomorrow 17:00, cancellation forbidden; 45 USDC is inside scope.
4. **Acquirer eligibility/payment:** Bob must satisfy Studio A's eligibility/cutoff requirements and a real/payment-fixture state must support the 45-USDC commitment before it can be treated as an acceptable recovery opportunity.
5. **Authoritative booking change:** current holder changes Maya → Bob for the same Friday Yoga booking; the service/session itself remains valid.
6. **Provider understanding:** Studio A sees Bob as current holder and can fulfil the booking without approving the recovery manually.
7. **Current-holder outcome:** Maya no longer sees Friday Yoga as usable and sees `You recovered 45 USDC` — already Golden product truth, pending real integration evidence.
8. **New-holder outcome:** Bob sees Friday Yoga in normal `My bookings` with normal service identity/status and a credible use/check-in path.
9. **Cross-perspective consistency:** provider/Maya/Bob state must be reconciled from one booking identity/transition, not three independent fixtures.
10. **Permission intersection:** the transition succeeds only when `provider rules ∩ holder mandate ∩ acquirer eligibility/payment` is non-empty; any failed dimension blocks/fails closed.

## Required state coverage for XC-01

Only states material to this slice should be rendered/reviewed.

### Provider rule
- policy present / permits recovery;
- policy blocks recovery or eligibility fails;
- live policy changes before final transfer → recovery fails closed or requires appropriate new state, never stale success.

### Acquirer
- released booking available;
- no longer available / already taken;
- eligibility passes / fails;
- acquisition/payment pending;
- acquisition/payment error or timeout with safe retry/reconcile;
- acquisition successful / booking received.

### Cross-lane
- 45-USDC opportunity created but not yet settled;
- recovery accepted inside existing Maya mandate;
- final holder/payment state reconciling;
- final Maya/Bob/Studio A success;
- partial/unknown execution must not render full success.

## UX rules for the candidate

- Same YourTurn design contract; no marketplace or provider sub-brand.
- Booking remains the object; no NFT/token serial as customer headline.
- Bob should not see Maya's private authority ceremony. He only sees the booking, provider conditions, his own eligibility/payment and his resulting booking.
- Studio A sees reusable policy and authoritative holder state, not Maya's private recovery details unless operationally required.
- Technical sponsor evidence stays secondary/collapsed and truth-labeled.
- No raw World human identifier.
- Provider rules are visible as business policy, not a manual per-recovery approval queue.

## Implementation seam and evidence boundary

The first executable XC-01 may use explicit fixtures for new acquirer/provider UI state, but only if the proof drawer and source comments identify them as such. Before integrated/submission truth:
- Bob's 45-USDC commitment must connect to the real accepted recovery invocation;
- Hedera transfer/settlement must reconcile Maya → Bob and 45 USDC before success is claimed;
- Studio A holder read must derive from the authoritative booking state;
- provider-policy allow/block must be the real load-bearing policy input;
- World/Ledger semantics remain those in `integration-ledger.md` and are not redesigned here.

## Exact next executable action

Build **one XC-01 candidate** by extending the canonical product workbench, beginning with the smallest connected customer/provider states needed to make Friday Yoga understandable from Studio A and Bob before/after the already-Golden Maya recovery.

Before touching UI:
1. use `DESIGN.md`, `GLOSSARY.md`, `CRAFT.md` as the binding design/craft contract;
2. reuse/adapt the prior slots/resale/provider patterns identified above;
3. preserve Golden `24bbf0d...` and `d5309a96...` semantics;
4. define the exact fixture/evidence seams against `integration-ledger.md`;
5. keep the canonical rendered loop and direct Product Reviewer PNG gate.
