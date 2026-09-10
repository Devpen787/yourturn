# Next Connected Product Slice

Status: **proposed architecture slice; awaiting product-contract review**.

This proposal follows human-approved Golden YT-01→YT-08, `DESIGN.md`, `GLOSSARY.md`, `CRAFT.md`, `integration-ledger.md`, issue #39, and `stakeholder-coverage-gate.md`.

The current gate is `architecture-review.md`. Do not treat this file as permission to advance, freeze or self-approve an executable journey.

## Why the next slice is not simply YT-09/YT-10

Golden YT-08 proves Maya's approved product outcome, but its sponsor-dependent 45-USDC transition remains fixture-backed until real integration replaces it. A holder-only `Bob received it` receipt would still leave two load-bearing questions unanswered:

- why was Bob eligible and how did his payment/commitment create a valid 45-USDC opportunity?
- how does Studio A know the booking is still valid and Bob is now the person it should fulfil?

The next slice therefore connects the **acquirer** and **provider** lanes around the already-Golden holder outcome.

## Prior UX mined

### Acquirer / browse and resale

From `feat/product-issuer-holder-ux`:

- `app/slots/page.tsx` and `app/slots/SlotsClient.tsx` — live session/browse state, availability, loading and error patterns;
- `app/resale/[serial]/ResaleClient.tsx` — buyer/seller separation, provider-rule blocks, pending/error/success purchase and holder refresh.

**CHANGE / reuse mechanics:** live-state reading, available/held/for-sale distinctions, provider-policy blocking, purchase pending/error/success handling and holder-change refresh.

**DO NOT COPY:** actor switcher as customer UX, `Person A/B`, `pass`, `Ref #`, raw account IDs, HBAR-first price language, HashScan-first success, token jargon or the old utilitarian card hierarchy.

### Provider

From `feat/product-issuer-holder-ux/app/issuer/IssuerPanel.tsx`:

- session/inventory overview;
- provider-rule inputs including resale allowed;
- operational holder/status state;
- loading/error/success and confirmation patterns.

**CHANGE / reuse mechanics:** session inventory, policy editing model, operational state and holder-change reconciliation.

**DO NOT COPY:** `issuer`, `pass`, guest/account identifiers as primary labels, raw demo setup controls as final provider UX, or manual approval for each compliant recovery.

## Full lane map

### Acquirer lane

| Lane | Role in product | Priority in proposed first connected slice |
| --- | --- | --- |
| A-01 Find a spot | Discover released/available bookings | **P0 thin entry** |
| A-02 Evaluate booking | Understand service, provider, price, eligibility and conditions | **P0** |
| A-03 Acquire / pay | Create the valid eligibility/payment commitment | **P0** |
| A-04 Receive booking | Friday Yoga becomes a normal usable booking for Bob | **P0** |
| A-05 Use / check in | Fulfil under normal provider rules | P1 in first slice; required for full end-to-end closure |
| A-06 History / receipt | Explain acquisition without protocol knowledge | P1 / pairs with YT-10 |

### Provider lane

| Lane | Role in product | Priority in proposed first connected slice |
| --- | --- | --- |
| P-01 Join YourTurn | Business onboarding | Post-submission productization |
| P-02 Create/connect inventory | Supply/session setup | Reuse existing source; do not rebuild now |
| P-03 Set rules | Define transfer/recovery/cutoff/eligibility/economics once | **P0 thin provider fact** |
| P-04 Issue/sell | Initial booking acquisition | Existing foundation; not current focus |
| P-05 Operate today | See sessions/current holders | Reuse as context |
| P-06 Compliant recovery occurs | No per-recovery staff approval | **P0 behavioral rule** |
| P-07 Holder changes | Studio A recognizes Maya → Bob authoritatively | **P0** |
| P-08 Fulfil/reconcile | Bob can be checked in and provider can reconcile | P1 in first slice; required for full closure |

## Proposed smallest connected slice

### XC-01 — Eligible next holder + provider-recognized handoff

Product story:

`Studio A pre-defines Friday Yoga recovery rules → Bob finds Friday Yoga as a released spot → Bob sees price + eligibility + provider conditions → Bob satisfies eligibility and commits 45 USDC → the existing Golden recovery may proceed only if the current permission intersection still passes → Maya's Golden recovery outcome remains unchanged → Bob receives Friday Yoga as a normal usable booking → Studio A recognizes Bob as current holder under the pre-defined rules`

This is the smallest product slice that makes the Golden 45-USDC recovery legible from all three perspectives without building the entire marketplace/provider platform.

### Proposed inclusion

- **P-03 thin:** Studio A has pre-defined recovery/transfer permission, cancellation prohibition, cutoff/eligibility constraints and relevant economics before the individual recovery;
- **A-01 thin:** one booking-first released/available Friday Yoga entry;
- **A-02:** service/date/time/provider, 45-USDC acquisition/recovery price and user-relevant eligibility/transfer conditions;
- **A-03:** truthful eligible/ineligible and payment pending/error/committed states; a 45-USDC commitment is not itself recovery success;
- **A-04 / YT-09 bridge:** after authoritative reconciliation Bob receives Friday Yoga as a normal `Confirmed` booking in `My bookings`;
- **P-06:** no manual Studio A approve button for a recovery that already satisfies all rules;
- **P-07:** Studio A sees the authoritative current-holder transition Maya → Bob;
- **cross-lane reconciliation:** Maya, Bob and Studio A reference one underlying booking transition, with partial/unknown state failing closed.

### Explicitly outside the proposed first executable set

- full provider onboarding P-01;
- rebuilding provider inventory creation P-02;
- broad service categories, filters or ranking;
- a broad resale marketplace;
- full provider accounting/reconciliation suite;
- exhaustive A-06/YT-10 history UI;
- new sponsor-demo pages;
- any Hedera/World/Ledger backend-semantic change.

A-05/P-08 check-in is the immediate completion follow-up only if it cannot be truthfully reused from the existing normal booking/fulfilment path. The first connected slice must at minimum leave Bob with a booking whose normal `Use booking` / fulfilment path is credible and provider-recognized; it must not claim check-in occurred if it did not.

## Stakeholder coverage gate — applied

1. **Stakeholder class:** customer + provider; customer roles are Maya/current holder and Bob/next holder.
2. **Provider rule:** Studio A has pre-defined transfer/recovery permission, cancellation prohibition, cutoff/eligibility constraints and relevant economics. No individual staff approval is required when rules pass.
3. **Holder authority:** Golden Maya mandate remains Friday-Yoga-only, minimum 40 USDC, expires Tomorrow 17:00, cancellation forbidden; 45 USDC is inside that holder scope.
4. **Acquirer eligibility/payment:** Bob must satisfy Studio A eligibility/cutoff requirements and a truthful payment/commitment state before his 45-USDC opportunity can be accepted.
5. **Authoritative booking change:** current holder changes Maya → Bob for the same Friday Yoga booking while the service remains valid.
6. **Provider understanding:** Studio A can recognize and fulfil for Bob without manually approving the individual compliant recovery.
7. **Current-holder outcome:** Maya no longer has the usable booking and sees `You recovered 45 USDC` — already Golden product truth, pending real integration evidence.
8. **New-holder outcome:** Bob sees Friday Yoga in normal `My bookings` with normal identity/status and a credible use/check-in path.
9. **Cross-perspective consistency:** provider/Maya/Bob reconcile from one booking identity/state transition, not three independent fixtures.
10. **Permission intersection:** success exists only when `provider rules ∩ holder mandate ∩ acquirer eligibility/payment` is non-empty; any failed dimension blocks/fails closed.

## Required prospective state coverage

Only material states should be rendered if/when executable work is authorized.

### Provider policy

- policy present / permits recovery;
- policy blocks recovery or eligibility;
- live policy changes before final transfer → fail closed or move to a truthful new state, never stale success.

### Acquirer

- released booking available / already taken;
- eligible / ineligible;
- payment or acquisition pending;
- payment error/timeout with safe retry/reconcile;
- commitment created but recovery not yet complete;
- booking received after authoritative reconciliation.

### Cross-lane

- 45-USDC opportunity exists but is not yet settled;
- permission intersection revalidated at the execution boundary;
- final holder/payment state reconciling;
- final Maya/Bob/Studio A success;
- partial/unknown execution never renders full success.

## UX contract for any later candidate

- use the same YourTurn design contract; no marketplace/provider sub-brand;
- booking remains the object; no token/NFT serial as customer headline;
- Bob never sees Maya's private authorization ceremony;
- Studio A sees reusable policy and authoritative holder state, not private holder-recovery detail unless operationally required;
- technical sponsor evidence stays secondary/collapsed and truth-labeled;
- no raw World human identifier;
- provider policy is visible as reusable business rules, not a manual approval inbox.

## Integration/evidence boundary

Before integrated/submission truth:

- Bob's 45-USDC commitment must connect to the real accepted recovery invocation;
- Hedera transfer/settlement must reconcile Maya → Bob and exact 45 USDC before success is claimed;
- Studio A holder state must derive from the authoritative booking state;
- provider-policy allow/block must be a real load-bearing policy input;
- World/Ledger semantics remain those in `integration-ledger.md` and are not redesigned here.

Golden product artifacts and any future Product Workbench candidate are product/design evidence, not automatically implementation owners.

## Pre-existing exploratory executable

Branch history currently contains exploratory XC-01 executable `eb3bcdb84ff95352adf1d0c387996f9a4692c52f` and rendered artifact `10169073722`. This architecture proposal does **not** adopt, advance, or freeze that executable. It was created before the current architecture-only gate was reasserted.

If this architecture package later becomes `REVIEWABLE`, the existing candidate may be mined like any other prior work: compare it against the reviewed contract, preserve anything that passes, revise only concrete gaps, and then route an exact executable through the normal rendered/five-lens/human-freeze process. Green historical CI alone does not make it approved product truth.

## Exact next action

**Stop executable work and route the architecture/product contract for Product Reviewer #34 review.**

Reviewer input is `architecture-review.md` plus the contract files referenced there. The architecture gate returns only:

- `REVISE` with a concrete product/design/integration/stakeholder defect; or
- `REVIEWABLE` meaning the smallest connected executable set may be explicitly authorized next.

Do not self-freeze. Do not advance the exploratory XC-01 executable under this gate. Do not widen into holder-only YT-09/YT-10 or another journey set.
