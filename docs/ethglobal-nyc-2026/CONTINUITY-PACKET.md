# YourTurn Concierge continuity packet

Status: candidate continuity build packet.

Date: 2026-06-13.

## Hackathon OS classification

Primary category: Agent / Autonomous Systems.

Secondary category: Payments / Commerce, with a tokenized service-rights proof object.

Positioning:

> A policy-bounded recovery agent for transferable service bookings.

Anchor user: Ari, a customer who booked a paid class or service slot and cannot attend.

Provider user: Maya, a small service provider who wants rule-respecting booking changes without manual DMs.

Pain:

- customers lose value when plans change
- providers handle cancellations, transfers, exceptions, and resale manually
- refund, resale, and rebook rules are easy to forget or dispute
- normal booking systems do not produce portable lifecycle proof

Why now:

- ETHGlobal NYC 2026 has a Continuity Track.
- Hedera has an explicit continuity-only automation prize.
- This repo already has Hedera booking-right infrastructure, so the new work can focus on a visible agent recovery loop rather than rebuilding the base product.

Demo proof moment:

> Ari says "I cannot make Saturday" in Telegram. YourTurn Concierge reads Ari's booking right, ranks allowed recovery options, previews one action, gets approval, executes a Hedera testnet lifecycle action, and returns a proof link.

## Product frame

Working name: YourTurn Concierge.

One-line thesis:

> YourTurn Concierge turns "I cannot make it" into a policy-aware, Hedera-backed recovery action.

The base product proves tokenized booked rights. The new continuity feature should prove agent-assisted recovery when a booking holder cannot use the slot.

This inherits the ETHGlobal source plan in `/Users/devinsonpena/ETHGlobal/docs/ethglobal-nyc-2026/yourturn-continuity-agent-plan-2026-06-12.md` and the booked-rights F1-F7 flow catalog in `/Users/devinsonpena/ETHGlobal/docs/strategy/hedera-booked-rights-user-flows.md`.

Hackathon build interpretation:

- F6 is the agent concierge layer.
- F7 is the cancel/refund/release safety path.
- Hedera Schedule Service is the best automation extension of F7 if we can prove it end to end.
- Telegram is the desired channel, but the first invariant is the underlying preview -> approve -> execute -> prove flow.

## Pre-existing work

Known pre-existing repo capabilities:

- Next.js 14 app with customer, provider, resale, and proof surfaces.
- Hedera SDK usage in server API routes.
- HTS booking-right NFTs.
- HTS custom royalty fee on resale.
- HCS lifecycle topic.
- Mirror Node read path.
- HashScan proof links in docs.
- F1 primary booking, F2 resale, F3 freeze/unfreeze, and F4 mark-used/burn path.
- Agent-safe API surface with read, preview, approval grant, and confirm routes.
- Demo auth and demo actor model.

Pre-existing limits to disclose:

- no production wallet flow
- no autonomous signing
- no production wallet/fiat refund flow
- no scheduled refund/release flow in the current MVP
- no live Telegram/WhatsApp customer agent product yet, although a Telegram webhook adapter is fixture-tested and mutation-gated
- HCS and Mirror proof surfaces exist, but slot detail can still show missing HCS history in some cases according to local `AGENTS.md`

## New weekend scope

Must build:

1. Concierge recovery decision layer.
   - reads booking, policy, slots, listings, and lifecycle state
   - ranks allowed actions: resale, rebook, cancel/release
   - outputs plain-English rationale and proof needs

2. Telegram MVP.
   - `/start`
   - link booking by serial or booking code
   - "I cannot make it" intent
   - action buttons for view options, prepare action, approve, cancel

3. Preview and explicit approval.
   - action summary
   - fee/refund/resale impact
   - irreversible effects
   - scoped approval grant
   - idempotency key

4. One real execution path through existing agent-safe APIs.
   - minimum: agent-assisted resale listing using existing F2 path
   - better: cancel/release or rebook with a new lifecycle state
   - best: scheduled cancel/release/refund using Hedera Schedule Service
   - if Schedule Service blocks, still ship F6/F7 and do not claim the Automation track

5. Proof and provider visibility.
   - Hedera testnet tx id
   - HCS lifecycle event for the agent-assisted action
   - Mirror/HashScan link
   - provider dashboard or proof surface showing the agent-assisted event

## Winner-grade proof chain

Primitive:

> Policy-bounded booking recovery approval.

Proof object:

- agent preview JSON
- scoped approval grant
- Hedera transaction id
- HCS lifecycle event
- Mirror holder/status read
- optional Schedule Service schedule id

Verifier:

- app proof page
- HashScan/Mirror link
- test or script that validates preview -> approval -> confirm constraints

Reusable surface:

- `/api/agent/read`
- `/api/agent/preview`
- `/api/agent/approval-grant`
- `/api/agent/confirm`
- planned Concierge decision wrapper over these APIs

Live state change:

- a booking right is listed, released, rebooked, transferred, or scheduled for an approved future action on Hedera testnet

## Agent-specific bar

Agent identity: not proven yet. Candidate options: named service identity in HCS event, HCS-14 style agent id, or documented server-side Concierge actor.

Agent role: narrow. It only recovers value from a booking the user cannot use.

Agent tools: existing agent-safe YourTurn APIs plus optional Hedera Agent Kit/Hedera SDK adapter.

Agent boundaries:

- action allowlist
- provider policy check
- preview before confirm
- scoped approval grant
- TTL
- actor/serial/action match
- no private keys in Telegram runtime

Agent decision:

- chooses and ranks the best allowed recovery option
- does not execute without approval

Agent trace:

- must be exported as log/HCS/JSON; not complete yet

## Build scope

Primary build target:

> Telegram Concierge can read a held booking, recommend the best allowed recovery action, request approval, execute one real Hedera lifecycle action, and return proof.

Do not build:

- a broad booking SaaS
- a generic chatbot
- a full marketplace
- WhatsApp before Telegram works
- new wallet system unless it becomes required by a selected partner prize
- Chainlink or other extra sponsor integrations before Hedera proof is complete

## Submission positioning

Submission title candidate:

> YourTurn Concierge

Short description candidate:

> A Telegram agent for recovering value from booked service slots. It reads provider policy, recommends resale/rebook/cancel options, asks for explicit approval, and executes a Hedera-backed lifecycle action with proof.

Core demo hook:

> Most booking changes happen in chat and end in manual coordination. YourTurn Concierge lets a customer message an agent, get the best allowed recovery option, approve it, and update the Hedera booking right with proof.

## Current call

Proceed with YourTurn as a continuity candidate only if the next work adds a visible new feature and new Hedera proof. The strongest first implementation is the Telegram agent loop plus one real Hedera action. The strongest Hedera prize path is the continuity-only Automation track if Schedule Service is real; otherwise bias toward AI & Agentic Payments plus No Solidity, with Tokenization as supporting evidence from the base product.
