# YourTurn Concierge Doctrine

Date: 2026-06-13
Status: working doctrine before next build wave

## Purpose

This file captures the planning conversation so implementation work builds on durable decisions instead of chat memory.

Moving forward, use this format:

- Discovery: what was read, observed, or tested.
- Facts: grounded repo/doc/tool output.
- Inferences: what the facts imply.
- Decisions: what is locked for now.
- Next steps: smallest useful build or proof step.

## Plain-English Product Goal

YourTurn lets owners turn appointments into programmable booking rights, and lets bookers use a Telegram Concierge to book, recover, reschedule, resell, release, or claim slots under those owner rules, with Hedera proving the lifecycle.

Do not lead with internal labels like F6 or F7 in product copy.

Internal translations:

- Concierge agent: the helper that reads booking state, rules, availability, and budget, then recommends or prepares an action.
- Recovery path: the booker path when they cannot attend, want another slot, want to resell, want to release, or want to join/claim from a waitlist.

## Two User Sides

### Owner

The owner creates the source of truth:

- publishes appointment slots
- sets which slots are resellable, transferable, releasable, refundable, rebookable, or waitlist-enabled
- sets timing windows and fees
- can enable automation such as scheduled release, waitlist offer, or refund/release windows
- sees the lifecycle and proof in the owner dashboard

### Booker

The booker gets the practical benefit:

- books a tokenized appointment
- sees ticket, QR, receipt, and proof
- talks to Concierge in Telegram
- asks for help with scheduling conflicts, rescheduling, resale, release, waitlist, or next booking
- approves value-moving or booking-moving actions
- can later use a capped budget or wallet-backed allowance if implemented

## Demo Doctrine

The demo must show both sides, but not as two separate products.

Primary story:

1. Owner creates slots and policy.
2. Booker A books a tokenized slot.
3. Booker A cannot attend and asks Concierge for help.
4. Concierge checks owner rules and available alternatives.
5. Concierge recommends the best allowed action.
6. Booker A approves.
7. Hedera records or executes the lifecycle action.
8. Booker B or the waitlist gets the released/resold opportunity.
9. Owner dashboard shows the policy was followed and proof exists.

## Release, Refund, Reschedule, Resell

Use these words precisely:

- Release: the booker gives up the booking right so the slot can return to inventory, be burned, be scheduled for release, or be offered to the waitlist.
- Refund: money moves back to the booker. Do not say refund unless HBAR/token/stablecoin actually moves.
- Reschedule: the booker moves from one appointment slot to another allowed slot.
- Resell: another booker buys the booking right under owner policy.
- Waitlist claim: someone on the waitlist gets an offer to buy or claim a newly available slot.

## Policy Doctrine

Owner policy is the contract-like rule layer for a slot or slot series.

Policy changes must be fair:

- A booking should remember the rules active when the booker bought it.
- Later owner policy changes should apply to future bookings by default.
- Existing bookings should not become unusable because the owner changed policy later.
- If a policy can change after purchase, that must be explicit before purchase.

Hackathon default:

- Use simple owner policy controls.
- Snapshot the policy version onto each booking.
- Show policy in plain language to bookers.
- Keep the technical proof details available in the proof/owner view, not as front-line consumer copy.

## Agent Doctrine

The agent should do useful coordination work, not merely narrate the app.

Allowed:

- read current bookings
- read owner policy
- read available slots and active listings
- detect obvious scheduling conflicts if calendar data is available
- recommend reschedule, resale, release, waitlist claim, or next booking
- prepare a preview
- ask for approval
- execute through the server-side YourTurn boundary after approval
- produce a trace and proof receipt

Not allowed:

- hide fees or irreversible effects
- bypass owner policy
- invent inventory
- claim a refund without a real payment/refund transaction
- sign or hold private keys inside Telegram/OpenClaw
- execute arbitrary transactions from chat text
- market itself as autonomous if it only runs a scripted UI path

## Approval Doctrine

Default:

- Human approval is required before every value-moving or booking-right-moving action.
- The approval must be scoped to actor, action, serial/slot, and expiry.
- The approval must be reflected in the proof object.

Stretch:

- Capped auto-booking can be introduced only after a real capped budget or allowance exists.
- A user can pre-approve a bounded budget, such as "up to 80 HBAR this month for Tuesday/Thursday classes after 6pm."
- The agent may then act only inside that budget and policy boundary.

Do not fake capped auto-booking with copy only.

## Wallet And Budget Doctrine

Do not underestimate wallet integrations, but build in waves.

Wave 1:

- Use demo-funded Hedera testnet accounts.
- Prove owner policy, booker Concierge, approval, Hedera lifecycle action, and proof.

Wave 2:

- Add clearer wallet/account connection path if time allows.
- Preserve the same proof and approval model.

Wave 3:

- Add capped budget/allowance for agent-managed booking.
- This is the strongest Agentic Payments story if it becomes real.

## Scope Doctrine

Must keep:

- owner policy
- booker Concierge
- approval before action
- Hedera proof
- simple flow under 3 minutes
- old-vs-new Continuity disclosure

Can stretch:

- Telegram live ingress
- Schedule Service execution
- budgeted auto-booking
- waitlist offer automation
- wallet connect
- OpenClaw ACP if runtime readiness is proven

Avoid until core works:

- WhatsApp
- broad booking SaaS
- full marketplace discovery
- fiat/card payments
- production legal refund system
- multi-agent mesh
- Chainlink or extra sponsors
- Solidity

## Hackathon Claim Doctrine

Claim Automation only if:

- Hedera Schedule Service creates a real schedule id.
- A scheduled transaction executes on testnet.
- The user can create/approve/manage or inspect the scheduled action.

Claim Agentic Payments only if:

- the Concierge performs a payment, token transfer, budgeted booking, resale, release, or financial operation on Hedera
- the agent trace and approval boundary are visible

Claim No Solidity if:

- the new work stays SDK-only
- at least two Hedera native services are visibly in the flow

Claim Tokenization only as supporting unless:

- new work adds meaningful token lifecycle or policy behavior beyond the old base app

## Current Build North Star

Primary:

Owner policy plus Booker A Telegram/in-app Concierge recovery, ending in a real Hedera lifecycle action and proof.

Stretch:

Budgeted Concierge booking with a demo-funded Hedera testnet budget account.

Do not record final video until the proof loop works end to end.
