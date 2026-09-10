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

This is the lane currently being built for ETHOnline.

- **YT-01 — Understand & enter:** customer understands YourTurn and enters the product.
- **YT-02 — My Bookings:** current holder sees owned bookings.
- **YT-03 — Booking detail:** holder sees normal use state and `Change plans`.
- **YT-04 — Recovery setup:** holder defines booking-scoped recovery limits.
- **YT-05 — Delegate:** holder authorizes the Recovery Mandate at the Ledger trust boundary.
- **YT-06 — Agent working:** exact human-backed delegated agent performs bounded recovery.
- **YT-07 — Block / escalate:** out-of-scope offers are blocked; broader authority requires a new holder decision.
- **YT-08 — Successful recovery:** in-scope recovery completes; holder receives value and no longer has a usable booking.

Current Golden input: YT-01→YT-04. Current active candidate: YT-05→YT-08.

## Lane B — Acquirer / next holder

This lane must exist before the product can be considered a complete two-sided marketplace.

- **A-01 — Find a spot:** browse released/available bookings in understandable service language.
- **A-02 — Evaluate booking:** see service, provider, date/time, price, eligibility and transfer conditions.
- **A-03 — Acquire / pay:** commit to the booking and complete the required payment/acceptance step.
- **A-04 — Receive booking:** booking becomes a normal usable item in `My Bookings` for the new holder.
- **A-05 — Use / check in:** new holder fulfils the service under the provider's normal check-in rules.
- **A-06 — History / receipt:** acquirer can understand how the booking was obtained without needing protocol knowledge.

Existing YT-09 (`New holder`) should become the bridge into A-04 rather than the whole acquirer journey by itself. Existing YT-10 (`Activity & proof`) should cover both holder and acquirer aftermath, with technical proof secondary.

## Lane C — Service provider

The provider lane must be treated as first-class product work, not only admin tooling.

- **P-01 — Join YourTurn:** create provider/business identity and service profile.
- **P-02 — Create or connect inventory:** define sessions, appointments, seats, desks, etc.
- **P-03 — Set booking rules:** transfer, resale, refund, exchange, cutoff, eligibility, pricing/fees and cancellation policy.
- **P-04 — Issue / sell booking:** eligible customer receives a valid usable booking.
- **P-05 — Operate today's bookings:** view inventory, holders, availability and check-in state.
- **P-06 — Recovery occurs:** YourTurn can act automatically when provider rules and holder mandate overlap; provider staff should not need to approve every compliant recovery.
- **P-07 — Holder changes:** provider sees the authoritative holder change from Maya to Bob while the service slot remains valid.
- **P-08 — Fulfil & reconcile:** Bob checks in; provider can reconcile attendance, fees, recovery history and final booking state.

## Provider-rule contract for the ETHOnline hero

The hackathon journey should eventually make one thin provider fact explicit even if the full provider workbench is built later:

> Studio A has already defined the rules under which Friday Yoga may move.

Minimum proof needed in the integrated hero:
- transfer/recovery is permitted for this booking type;
- cancellation remains forbidden;
- eligibility/cutoff constraints are enforced;
- the holder cannot authorize something the provider has prohibited;
- the recovery agent cannot widen provider rules.

Do not turn this into a provider approval popup during Maya's recovery. The point is that provider policy is pre-defined and load-bearing.

## Cross-lane state handoff

For one successful Friday Yoga recovery, the product must be able to show all three perspectives of the same state transition:

1. **Provider:** Friday Yoga exists, transfer is allowed under provider policy, authoritative holder changes from Maya to Bob.
2. **Maya/current holder:** no longer has a usable Friday Yoga booking and receives the recovered value.
3. **Bob/new holder:** receives Friday Yoga as a normal usable booking and can check in.

A blockchain transaction or agent receipt alone does not satisfy this product requirement.

## Existing source work to mine

Before designing provider or acquirer journeys from scratch, inspect prior YourTurn work:
- `feat/product-issuer-holder-ux` — issuer/provider UI, holder UX, inventory and resale concepts.
- `main` — auth, roles, customer/provider shell and account flows.
- `codex/ethglobal-final-public` — immutable pre-event product/technical baseline.

Known provider work already exists in `app/issuer/IssuerPanel.tsx`; treat it as REUSE/ADAPT/REFERENCE material, not automatically as the final provider UX.

## Sequencing rule

Do **not** interrupt the current YT-05→YT-08 ETHOnline hero build.

After YT-05→YT-08 reaches Golden:
1. map the acquirer lane A-01→A-06 against YT-09/YT-10;
2. map provider P-01→P-08 using prior issuer/provider work;
3. choose the smallest connected slices needed for the hackathon demo;
4. continue broader productization after the submission without losing this architecture.

No future journey set should be called complete unless stakeholder coverage is checked against this document.