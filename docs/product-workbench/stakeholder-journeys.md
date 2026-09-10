# Stakeholder Journey Architecture

YourTurn is a two-sided booking product with **two stakeholder classes** and **three operational roles**.

## Stakeholder classes

### 1. Service provider
The business that creates and fulfils the service: studio, restaurant, clinic, coworking operator, event organiser, etc.

Provider outcome:
> Reduce no-shows and empty capacity without losing control of inventory, eligibility, timing or economics.

### 2. Customer
The person consuming or exchanging the service.

A customer can occupy two different operational roles over the life of one booking:
- **Current holder / supplier of the released booking** — e.g. Maya, who owns Friday Yoga but can no longer attend.
- **Acquirer / next holder** — e.g. Bob, who discovers and acquires the released Friday Yoga booking.

Customer outcome:
> A booking should stay useful when plans change, and the next eligible customer should receive a normal usable booking rather than a crypto object.

## Core product rule

A recovery or transfer may happen only where all relevant permissions overlap:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`

In human terms:
- the **provider** decides what may happen to its service;
- the **holder** decides what YourTurn may do with this specific booking;
- the **acquirer** must satisfy the provider's eligibility/payment conditions;
- YourTurn may act only inside the intersection.

The provider should not need to approve every individual recovery. It sets reusable rules once; YourTurn can then execute qualifying holder mandates inside those rules.

## Lane A — Current holder / recovery

This lane is now frozen Golden for the ETHOnline hero.

- **YT-01 — Understand & enter:** customer understands YourTurn and enters the product.
- **YT-02 — My Bookings:** current holder sees owned bookings.
- **YT-03 — Booking detail:** holder sees normal use state and `Change plans`.
- **YT-04 — Recovery setup:** holder defines booking-scoped recovery limits.
- **YT-05 — Delegate:** holder authorizes the Recovery Mandate at the Ledger trust boundary.
- **YT-06 — Agent working:** exact human-backed delegated agent performs bounded recovery.
- **YT-07 — Block / escalate:** out-of-scope offers are blocked; broader authority requires a new holder decision.
- **YT-08 — Successful recovery:** in-scope recovery completes; holder receives value and no longer has a usable booking.

Frozen executables:
- YT-01→YT-04: `24bbf0d7516499069f5102ae4bf724b0cb376b94`;
- YT-05→YT-08: `d5309a96d532ee107011c2a5cefc3000b9e4932f`.

Do not redesign this lane while extending the product. Integration replaces fixtures with real state under `integration-ledger.md` while preserving Golden behavior.

## Lane B — Acquirer / next holder

This lane must exist before the product can be considered a complete two-sided marketplace.

- **A-01 — Find a spot:** browse released/available bookings in understandable service language.
- **A-02 — Evaluate booking:** see service, provider, date/time, price, eligibility and transfer conditions.
- **A-03 — Acquire / pay:** commit to the booking and complete the required payment/acceptance step.
- **A-04 — Receive booking:** booking becomes a normal usable item in `My Bookings` for the new holder.
- **A-05 — Use / check in:** new holder fulfils the service under the provider's normal check-in rules.
- **A-06 — History / receipt:** acquirer can understand how the booking was obtained without needing protocol knowledge.

Existing YT-09 (`New holder`) is a bridge into A-04 rather than the whole acquirer journey by itself. Existing YT-10 (`Activity & proof`) should cover both holder and acquirer aftermath, with technical proof secondary.

## Lane C — Service provider

The provider lane is first-class product work, not only admin tooling.

- **P-01 — Join YourTurn:** create provider/business identity and service profile.
- **P-02 — Create or connect inventory:** define sessions, appointments, seats, desks, etc.
- **P-03 — Set booking rules:** transfer, resale, refund, exchange, cutoff, eligibility, pricing/fees and cancellation policy.
- **P-04 — Issue / sell booking:** eligible customer receives a valid usable booking.
- **P-05 — Operate today's bookings:** view inventory, holders, availability and check-in state.
- **P-06 — Recovery occurs:** YourTurn can act automatically when provider rules and holder mandate overlap; provider staff should not need to approve every compliant recovery.
- **P-07 — Holder changes:** provider sees the authoritative holder change from Maya to Bob while the service slot remains valid.
- **P-08 — Fulfil & reconcile:** Bob checks in; provider can reconcile attendance, fees, recovery history and final booking state.

## Provider-rule contract for the ETHOnline hero

The connected continuation must make one thin provider fact explicit:

> Studio A has already defined the rules under which Friday Yoga may move.

Minimum product/integration truth:
- transfer/recovery is permitted for this booking type;
- cancellation remains forbidden;
- eligibility/cutoff constraints are enforced;
- the holder cannot authorize something the provider has prohibited;
- the recovery agent cannot widen provider rules;
- a compliant transfer does not require a Studio A employee to approve the individual recovery.

Do not turn this into a provider approval popup during Maya's recovery. Provider policy is pre-defined and load-bearing.

## Cross-lane state handoff

For one successful Friday Yoga recovery, the product must be able to show all three perspectives of the same state transition:

1. **Provider:** Friday Yoga exists, transfer is allowed under provider policy, authoritative holder changes from Maya to Bob.
2. **Maya/current holder:** no longer has a usable Friday Yoga booking and receives the recovered value.
3. **Bob/new holder:** receives Friday Yoga as a normal usable booking and can follow the provider's ordinary fulfil/check-in path.

A blockchain transaction or agent receipt alone does not satisfy this product requirement.

## Existing source work to mine

Before designing provider or acquirer journeys from scratch, inspect prior YourTurn work:
- `feat/product-issuer-holder-ux` — issuer/provider UI, holder UX, inventory and resale concepts;
- `main` — auth, roles, customer/provider shell and account flows;
- `codex/ethglobal-final-public` — immutable pre-event product/technical baseline.

Useful prior seams already inspected for the next slice:
- `app/slots/page.tsx` / `app/slots/SlotsClient.tsx` — browse/live-state/status/loading/error patterns;
- `app/resale/[serial]/ResaleClient.tsx` — buyer/seller separation, provider-rule blocks, pending/error/success purchase and holder refresh;
- `app/issuer/IssuerPanel.tsx` — provider inventory/session/policy/holder-state operations.

Treat these as REUSE/ADAPT material. Do not carry forward `Person A/B`, `pass`, `issuer`, raw refs/account IDs, HBAR-first pricing or HashScan-first success as the new customer hierarchy.

## Selected connected continuation

The stakeholder gate has now been applied. The selected smallest connected next slice is recorded in `next-slice.md`:

**XC-01 — Eligible next holder + provider-recognized handoff**

`Studio A pre-defined rules → Bob finds/evaluates Friday Yoga → Bob satisfies eligibility and commits to 45 USDC → Golden Maya recovery accepts inside scope → Bob receives a normal usable booking → Studio A sees Bob as the authoritative current holder`

XC-01 intentionally spans only the load-bearing parts of:
- acquirer A-01→A-04;
- provider P-03, P-06 and P-07;
- the already-Golden Maya YT-08 handoff.

A-05/P-08 check-in is the immediate completion follow-up if it cannot be reused truthfully from existing normal booking/provider paths without widening the first candidate. A-06/YT-10 history follows after the state is real enough to explain.

## Sequencing rule

Current order:
1. Golden YT-01→YT-08 — **complete/frozen**;
2. `DESIGN.md`, `GLOSSARY.md`, `CRAFT.md` — **established**;
3. `integration-ledger.md` — **established for Golden→real wiring**;
4. stakeholder coverage gate — **applied**;
5. XC-01 architecture — **selected**;
6. build one canonical XC-01 candidate, then production build + Chromium desktop/mobile evidence + direct Product Reviewer PNG inspection;
7. freeze only after `GOLDEN-READY` + explicit Devinson approval.

No future journey set should be called complete unless stakeholder coverage is checked against this document and `stakeholder-coverage-gate.md`.
