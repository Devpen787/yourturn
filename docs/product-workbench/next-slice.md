# Next Connected Product Slice

Status: **REVIEWABLE architecture; exactly one XC-01 executable candidate is authorized to enter the candidate/review loop.**

Product Reviewer #34 independently cleared the architecture/product contract at exact docs head `686aeb767f3c1f6ff7db14fdf7a773039cf581a9`. This is permission to build and review one candidate only. It is not executable approval, `GOLDEN-READY`, Golden freeze, sponsor integration, merge or deployment authority.

This reviewed slice follows human-approved Golden YT-01→YT-08, `DESIGN.md`, `GLOSSARY.md`, `CRAFT.md`, `integration-ledger.md`, issue #39, and `stakeholder-coverage-gate.md`.

## Frozen product truth

Do not mutate either Golden executable while building this slice:

- YT-01→YT-04: `24bbf0d7516499069f5102ae4bf724b0cb376b94`;
- YT-05→YT-08: `d5309a96d532ee107011c2a5cefc3000b9e4932f`.

Golden YT-08 establishes Maya's customer outcome, but sponsor-dependent transitions remain fixture-backed until real Ledger/World/Hedera integration satisfies `integration-ledger.md`.

## Why the next slice is not simply YT-09/YT-10

A holder-only `Bob received it` receipt would leave two load-bearing questions unanswered:

- why was Bob eligible and how did his payment/commitment create a valid 45-USDC opportunity?
- how does Studio A know the booking remains valid and Bob is now the person it should fulfil?

The next slice therefore connects the **acquirer** and **provider** lanes around the already-Golden Maya outcome.

## Prior UX to mine, not adopt blindly

From `feat/product-issuer-holder-ux`, reuse/adapt the strongest mechanics from slots, resale and `IssuerPanel`: availability/loading/error state, buyer/seller separation, provider-policy blocking, payment/purchase pending/error/success, holder refresh, policy editing and operational holder status.

Do **not** copy actor switchers, Person A/B language, `pass`, raw refs/account IDs, HBAR-first/HashScan-first presentation, token jargon, `issuer` as normal customer language, demo setup controls, or any per-recovery provider approval inbox.

Historical exploratory XC-01 executable `eb3bcdb84ff95352adf1d0c387996f9a4692c52f` and artifact `10169073722` are prior-work evidence only. Mine them against this reviewed contract; green historical CI does not make them the active candidate.

## Reviewed smallest connected slice

### XC-01 — Eligible next holder + provider-recognized handoff

Product story:

`Studio A pre-defines Friday Yoga recovery rules → Bob finds Friday Yoga as a released spot → Bob sees price + eligibility + provider conditions → Bob satisfies eligibility and commits 45 USDC → Golden recovery may proceed only if the current permission intersection still passes → Maya's Golden recovery outcome remains unchanged → Bob receives Friday Yoga as a normal usable booking → Studio A recognizes Bob as current holder under the pre-defined rules`

Hard rule:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`

Provider policy is pre-defined and load-bearing. A compliant recovery must not require Studio A staff to manually approve that individual transfer.

## Authorized candidate coverage

### Acquirer

- **A-01 Find a spot — thin P0:** one booking-first released/available Friday Yoga entry.
- **A-02 Evaluate — P0:** service/date/time/provider, 45-USDC acquisition/recovery price, eligibility and user-relevant provider conditions.
- **A-03 Acquire/pay — P0:** truthful eligible/ineligible plus payment pending/error/committed states. A 45-USDC commitment is not itself recovery success.
- **A-04 Receive booking / YT-09 bridge — P0:** only after authoritative reconciliation does Bob receive Friday Yoga as a normal `Confirmed` booking in `My bookings`, with a credible `Use booking` / fulfilment seam.

A-05 use/check-in and A-06 history/receipt are outside this first candidate unless an existing normal fulfilment path can be truthfully reused with negligible scope. Do not claim check-in if it did not occur.

### Provider

- **P-03 thin — P0:** Studio A's reusable recovery/transfer/cancellation/eligibility/cutoff/economic rules exist before the individual recovery.
- **P-06 — P0:** a compliant recovery occurs without a per-transfer staff approval click.
- **P-07 — P0:** Studio A sees the authoritative current-holder transition Maya → Bob for the same Friday Yoga booking.

Provider onboarding, inventory rebuilding, broad marketplace taxonomy and full accounting/reconciliation remain out of scope.

### Cross-lane reconciliation

Maya, Bob and Studio A must refer to one underlying booking transition. Partial, stale, inconsistent or unknown payment/holder/provider-policy state fails closed and must not render full success.

## Stakeholder coverage gate

1. Studio A rules exist before Maya starts recovery.
2. Maya's Golden mandate remains Friday-Yoga-only, minimum 40 USDC, expires Tomorrow 17:00 and forbids cancellation; 45 USDC is inside holder scope.
3. Bob satisfies Studio A eligibility/cutoff requirements and has a truthful payment/commitment state before his opportunity may be accepted.
4. Success exists only where `provider rules ∩ holder mandate ∩ acquirer eligibility/payment` is non-empty.
5. Authoritative booking holder changes Maya → Bob while the service remains valid.
6. Studio A recognizes and can fulfil for Bob without approving the individual compliant recovery.
7. Maya no longer has the usable booking and retains the Golden `You recovered 45 USDC` outcome.
8. Bob sees Friday Yoga as a normal usable booking.
9. No side shows final success while another authoritative dimension is unknown or contradictory.

## Required prospective state coverage

Render material states, not decorative variants.

### Provider policy

- policy present / permits recovery;
- policy blocks recovery or eligibility;
- live policy changes before final transfer → fail closed or move to a truthful non-success state.

### Acquirer

- available / already taken;
- eligible / ineligible;
- payment pending;
- payment error/timeout with safe retry/reconcile;
- commitment created but recovery not complete;
- booking received after authoritative reconciliation.

### Cross-lane

- 45-USDC opportunity exists but is not settled;
- permission intersection revalidated at the execution boundary;
- final holder/payment state reconciling;
- final Maya/Bob/Studio A success;
- partial/unknown execution never renders full success.

## UX contract

- use the same YourTurn design contract; no marketplace/provider sub-brand;
- booking remains the object; no NFT/token/serial customer headline;
- Bob does not see Maya's private authorization ceremony;
- Studio A sees reusable policy and authoritative holder state, not private recovery detail unless operationally required;
- technical sponsor evidence remains secondary and truth-labeled;
- no raw World human identifier;
- provider policy appears as reusable business rules, not a manual approval inbox.

## Integration/evidence boundary

This candidate is product behavior/presentation, not automatic implementation truth. Before integrated/submission claims:

- Bob's 45-USDC commitment must connect to the real accepted recovery invocation;
- Hedera transfer/settlement must reconcile Maya → Bob and exact 45 USDC before success is claimed;
- Studio A holder state must derive from authoritative booking state;
- provider-policy allow/block must be a real load-bearing policy input;
- World and Ledger semantics remain those in `integration-ledger.md` and are not redesigned here;
- evidence classes stay explicit: FIXTURE/CI/LOCAL/CONFIGURED are never promoted to LIVE by copy.

## Exact next action

**Build one canonical XC-01 candidate now.**

1. Compare historical `eb3bcdb...` against this reviewed contract and current `DESIGN.md`, `GLOSSARY.md`, `CRAFT.md`, `integration-ledger.md`, stakeholder docs and Golden records.
2. Reuse/adapt only what passes; revise concrete gaps rather than starting a parallel route.
3. Preserve both Golden executables and all sponsor/backend semantics.
4. Produce exact-head production build + Chromium desktop/mobile evidence for the material states above.
5. Route the exact candidate plus rendered PNG artifact to Product Reviewer #34 for five-lens review.
6. `GOLDEN-READY` may be returned only after that executable review. Golden still requires explicit Devinson approval of that exact candidate.

Do not widen into holder-only YT-09/YT-10, another journey set, sponsor dashboards, merge, deployment, funding or secret work.
