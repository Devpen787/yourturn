# SPEC

This file is the canonical working spec for the Booked Rights hack build.

It is intentionally narrow. If a feature does not help the current booked-rights demo ship on the locked direction below, it should stay out of scope.

## Locked direction

- **Primary target track:** Hedera `No Solidity Allowed`
- **Minimum honest technical fit:** `HTS + Mirror Node`
- **Optional only if it clearly improves the demo:** `HCS`
- **Hero customer:** SMB services and classes such as yoga studios, physical therapy practices, and handstand or movement coaching
- **Core product:** booked service slots become transferable rights under issuer rules
- **Must-ship flows:** `F1` primary booking, `F2` transfer or resale with royalty, `F4` mark used
- **Strong next layer:** `F3` freeze or unfreeze and `F7` cancel or refund
- **Agent boundary:** schedule-and-budget helper only, with no autonomous signing

## Product sentence

Booked Rights turns a service booking into a transferable right under issuer rules.

## Hero scenario

A yoga studio, physical therapy practice, or movement coach sells scarce service slots. A customer books one slot. If they cannot attend, they can transfer or resell it under the issuer's rules, and the issuer still keeps control and earns when the right moves.

This is not generic ticketing and not a generic booking SaaS clone. It is a booked-rights system for SMB services and classes.

## Demo target

The demo should show one concrete service-slot lifecycle:

1. issuer publishes a slot
2. guest completes primary booking
3. guest transfers or resells the slot under issuer policy and the issuer royalty is visible
4. issuer marks the slot used

If time allows, add:

5. issuer freezes or unfreezes a holder
6. guest cancels within policy and receives a refund

## Technical fit and source of truth

### Required fit

- `HTS` is the rights and lifecycle enforcement layer
- `Mirror Node` is the read and verification layer
- `HCS` is optional and should be added only if it materially helps judges understand the audit story

### Source of truth rules

- booking ownership must come from Hedera state, not a local database
- transfer and resale state must be derived from Hedera transactions plus app policy, not from off-chain CRUD as the primary source
- Mirror reads are read-only convenience and verification, not the authority for business logic if they lag signed transactions
- off-chain storage may exist later for convenience, but not as the canonical booking ledger

## Core domain model

The implementation should converge on these concepts:

- **Slot**: issuer-created scheduled service unit with time, price, and policy
- **Booking right**: the tokenized right representing the slot after booking
- **Issuer policy**: resale allowed, transfer allowed, forwarding count, rebook window, expiry or lock deadline, royalty behaviour
- **Lifecycle state**: open, booked, listed, transferred, frozen, used, refunded, expired
- **Fee preview**: original price, resale price, issuer royalty, seller net, refund net

The exact type names can change, but the concepts above need first-class support in `src/domain/`.

## Economic model

The product economics should stay simple and legible:

- the issuer sets the primary slot price
- the issuer decides whether resale is allowed
- the current MVP uses a fixed **10%** issuer royalty on secondary resale
- the current holder sets the resale ask
- the holder may sell:
  - above cost
  - at cost
  - below cost
- the issuer must mark the right **used** at redemption so it cannot be used twice

The intended long-term model is slightly broader:

- issuer policy should eventually support configurable royalty rates, including `0%`
- holder pricing should remain flexible

See `docs/ECONOMICS.md` for the actor-by-actor breakdown and example outcomes.

## Must-ship flows

### F1 Primary booking

**Goal:** a guest books a real service slot and receives the booking right.

Minimum acceptance:

- issuer has a published slot available to book
- guest can see the slot in the UI
- guest can complete a Hedera-backed booking transaction
- the resulting holder state is visible via the app and verifiable through testnet proof

### F2 Transfer or resale with royalty

**Goal:** the current holder can move the slot under issuer rules and the issuer earns on the move.

Minimum acceptance:

- app enforces whether transfer or resale is allowed
- preview shows resale amount and issuer royalty clearly
- issuer royalty still applies when resale is above the original price
- transaction result is visible in the app and backed by testnet proof

### F4 Mark used

**Goal:** issuer closes the lifecycle after the real-world session occurs.

Minimum acceptance:

- issuer can mark the booking right used
- used state is visible in issuer and guest views
- the lifecycle is clearly closed after use

## Strong next layer

### F3 Freeze or unfreeze

**Goal:** issuer can temporarily block movement of a booking right.

Minimum acceptance:

- issuer can freeze and unfreeze
- blocked state is visible in UI
- a frozen booking cannot be moved through allowed flows

### F7 Cancel or refund

**Goal:** guest can cancel within issuer policy and receive the defined refund outcome.

Minimum acceptance:

- cancel path is policy-aware
- refund preview is explicit before confirmation
- refunded state is visible and logged

## Deferred but important

These belong in the product direction, but not in the minimum must-ship slice:

- rebook flow
- forwarding count enforcement beyond the minimum viable rule set
- richer issuer dashboard and analytics
- `HCS` audit trail
- agent-assisted booking flows
- wallet abstraction or complex auth

## Agent helper detail

The agent is a helper-only layer. It may:

- check the user's calendar for conflicts
- compare available slots
- help book classes or sessions
- help rebook when the user has a scheduling conflict
- help resell or transfer a slot when issuer policy allows it
- work within a user-defined booking budget
- help the user meet a target number of classes or sessions
- prepare previews and recommendations

The agent may not:

- sign autonomously
- bypass issuer policy
- move value without explicit user approval

## Implementation boundaries

- keep the `BookingPort` boundary intact between product flows and Hedera implementation
- keep domain policy and fee math pure and testable
- keep Hedera SDK usage inside `src/hedera/`
- keep Mirror reads inside `src/lib/mirror-client.ts`
- do not let a DB-backed booking app become the source of truth

## Non-goals for this hack build

- generic marketplace discovery
- cross-chain support
- complex role or auth systems before one real Hedera booking works
- DB-first booking CRUD as the product core
- autonomous agent execution
- wallet integration work that is not required to ship the chosen demo

## Spec review outcome

The prior version of this file was too vague to coordinate implementation safely. The main issues were:

- it was still written as a paste-in placeholder rather than a concrete execution spec
- it did not define the on-chain source-of-truth rule explicitly enough
- it did not separate must-ship flows from deferred-but-important product ideas sharply enough
- it described the agent but did not anchor the agent to the actual build order

This version resolves those issues and should be used as the working implementation contract until updated by a new explicit decision.
