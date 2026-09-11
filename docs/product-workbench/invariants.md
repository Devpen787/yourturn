# Product Invariants

These rules apply across every YourTurn customer journey unless a later product review explicitly changes them.

## 1. Human language first

Default UI terms:
- booking
- spot
- change plans
- recover value
- transfer
- refund
- activity

Do not lead with:
- NFT
- HTS
- HCS
- AgentKit
- x402
- serial allowance
- transaction bytes

Those belong in reviewer/proof detail when useful.

## 2. Booking card anatomy

Every booking card should make these readable at a glance:
- experience/service name
- date/time
- venue/provider
- current status
- primary next action

The canonical hero fixture is `Friday Yoga · 18:00` at `Studio A · Zürich`.

## 3. Status vocabulary

Customer-facing statuses should describe the user's situation, not implementation state. Preferred examples:
- Confirmed
- Recovery active
- Offer blocked
- Recovered
- Transferred
- Expired
- Needs your approval

## 4. Change-plans architecture

`Change plans` is the primary doorway into YourTurn's value proposition. Present choices around user outcomes:
- Find someone to take it
- Swap for another time
- Get whatever refund is available
- Let YourTurn handle it

## 5. Delegation clarity

Before approval, a customer must understand:
- which booking is covered;
- what the agent may do;
- what it may not do;
- minimum acceptable recovery;
- expiry;
- that expanded authority requires the user again.

Never imply wallet-wide or account-wide authority when authority is booking-scoped.

## 6. Sponsor presentation

Normal UI: explain the result.

Proof/reviewer UI: explain how it was proven.

Examples:
- normal: `Human-backed agent verified`
- proof detail: World AgentKit / AgentBook evidence
- normal: `Approved on your Ledger`
- proof detail: mandate digest, signer, device state, signature status
- normal: `Recovered 45 USDC`
- proof detail: Hedera token serial, settlement transaction, HCS events, HashScan link

## 7. Autonomous vs human boundary

Inside the signed mandate, the product may present work as autonomous.

Outside the mandate, the state must become `Needs your approval` rather than silently widening permissions.

A device reject/cancel must never be represented as approval.

## 8. Recovery success

A successful recovery is an end-to-end product state, not merely a chain transaction:
- previous holder no longer has the booking;
- previous holder receives the promised settlement;
- new holder has the usable booking;
- activity/proof explains the outcome.

## 9. Reviewer drawer

Every important live action may expose `How this happened` / `View proof` without forcing technical evidence into the primary journey.

Proof labels must distinguish:
- LIVE / TESTNET
- CI
- LOCAL
- CONFIGURED
- SIMULATED
- RESEARCH

Never upgrade an evidence class through copy.

## 10. Visual continuity

Prioritize existing YourTurn components and design language before introducing new patterns. The workbench may improve coherence, but should not create a separate visual brand for ETHOnline.

## 11. Responsive intent

The hero journey must remain understandable on a laptop demo and a mobile-width customer viewport. Avoid interactions that only make sense with hover or large reviewer panels.

## 12. Sponsor implementation boundary

Hedera, World and Ledger workers may provide data/state/actions. They must not independently redesign navigation, booking anatomy, or journey order. Product changes return to this workbench for review.
