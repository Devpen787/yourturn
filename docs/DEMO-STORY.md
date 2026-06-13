# Demo Story

Use this doc for the **spoken narrative** of the live demo.

Use `docs/DEMO.md` for the **operator runbook** and exact click order.

## Goal

The live demo should not feel like a raw feature walkthrough.

It should clearly explain:

1. the problem
2. the current broken method
3. the product solution
4. why the solution is stronger with Hedera
5. the scenarios this engine supports
6. the specific "wow" features worth highlighting

---

## Core stage line

YourTurn turns a booked service slot into a controlled, transferable pass.

---

## Pitch arc

### 1. Problem

Today, if someone cannot make a booked session, the fallback is often messy:

- phone calls
- messages
- spreadsheets
- waiting lists
- informal swaps
- lost revenue

The business loses time, the customer loses flexibility, and there is no clean transfer process.

### 2. Current method

In the current method, a booking is just a calendar row.

If plans change:

- the business has to coordinate manually
- the customer may lose the slot entirely
- the business may lose visibility if someone else takes over informally
- there is usually no clean secondary economics for the issuer

### 3. Solution

YourTurn turns that booking into a live pass under provider rules.

That means:

- a customer can book the slot
- the current holder can pass it on under provider policy
- the provider still controls who can move it
- the provider still controls final redemption or check-in
- the lifecycle stays visible from booking to use

### 4. Why Hedera matters

For the demo, Hedera gives us the important product properties:

- the booking can become a real transferable asset
- the move between holders is visible and verifiable
- secondary resale economics can be enforced at the asset layer
- the provider can still audit the lifecycle cleanly
- the MVP does this without Solidity or a custom marketplace contract

Plain-English framing:

- not "because blockchain"
- but "because the pass can move, be verified, and still stay under business rules"

---

## Approved demo skins

These are the approved scenario frames for the same engine.

### 1. Therapy session

Best for:

- trust
- seriousness
- immediate understanding

Story:

- Person A booked a physio or therapy session
- cannot attend
- resells under provider rules
- Person B takes over
- provider still controls redemption

Why it works:

- judges understand it immediately
- the pain is real
- the transfer story feels useful, not speculative

### 2. Handstand or studio class

Best for:

- energy
- visual friendliness
- wellness / class context

Story:

- limited class capacity
- last-minute change
- pass moves to another attendee
- instructor still controls check-in

Why it works:

- more dynamic than therapy
- fits the current brand tone well
- still feels practical

### 3. Boat-day or premium experience

Best for:

- wow factor
- premium pricing
- royalty economics

Story:

- limited day-pass, charter seat, or premium slot
- demand makes resale valuable
- the business earns not only on the original booking, but also when the slot changes hands

Why it works:

- makes issuer royalty feel important
- makes premium resale easier to understand
- shows the engine is not just for classes

---

## Recommended live framing

### Hero scenario

Use **therapy** as the main live demo.

Why:

- it is the most credible and immediate
- it makes the problem obvious
- it is strong for judges

### Flexibility example

Mention **handstand / studio class** as a second category the same engine supports.

### Wow example

Mention **boat-day / premium experience** as the clearest example of why secondary economics matter.

This gives the demo:

- trust
- flexibility
- wow

---

## What to highlight consciously

These are the real "wow" features of the product:

- A booking is not just a calendar row. It becomes a live pass.
- That pass can move without the business losing control.
- The business can pause movement.
- The business can earn when the pass changes hands.
- The business still controls final redemption or check-in.
- One pass cannot be used twice after check-in.

---

## Suggested spoken structure

### Opening

"YourTurn turns a booked service slot into a controlled, transferable pass."

### Problem

"Today if someone cannot make a booked therapy session, class, or appointment, the fallback is manual coordination, lost revenue, or an informal swap the business cannot really control."

### Current method

"A booking is usually just a calendar row. If plans change, the process breaks down."

### Solution

"With YourTurn, the booking becomes a pass that can move to another customer under provider rules, while the provider still controls the final check-in."

### Hero scenario

"In this live demo, we show that with a therapy-style appointment."

### Flexibility

"The same engine also works for studio classes like handstand training."

### Wow

"And in premium experiences like a boat-day pass, the business can earn not only on the original booking, but also when demand drives a secondary resale."

### Hedera benefit

"Hedera gives us the transferable pass, the visible movement, the enforced resale fee behavior, and the audit trail that lets the business stay in control."

---

## What not to overclaim

Do not say:

- that the app is already a full multi-business configurable platform
- that users have full wallet auth
- that the product already supports every service vertical with custom setup flows
- that the resale payout math should be trusted unless the transaction path has been verified live

Instead say:

- this is the current MVP engine
- the live demo proves booking, transfer under rules, provider oversight, and final check-in
- the same engine can support multiple appointment and experience categories

---

## Pair with

- `docs/DEMO.md` for exact browser flow and click order
- `docs/DEMO-STORY-TEST-STEPS.md` to map this narrative to **executable checks** (what to click and what must be true on screen)
- `docs/ECONOMICS.md` for pricing and royalty explanation
- `docs/UI-MAP.md` for route / API mapping
