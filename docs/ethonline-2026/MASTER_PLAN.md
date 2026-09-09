# YourTurn ETHOnline 2026 — Master Continuity Plan

## Product target

**YourTurn Delegated Recovery**

A booking owner gives an AI agent narrowly scoped authority to recover value from one specific booked-right asset. The agent may act autonomously only inside the owner's mandate and the provider's rules; outside that envelope it must stop and ask the human.

### Judge explanation

> YourTurn already helped people recover value from bookings they could not use. During ETHOnline we make that safe to delegate to an AI agent: the owner decides exactly what the agent may do, the agent can settle a compliant recovery in Hedera USDC, and every authorization, rejection and execution remains reviewable.

## One coherent user journey

1. Owner opens booking #193.
2. Owner taps **Delegate recovery**.
3. A polished Recovery Mandate UI sets:
   - agent identity;
   - allowed action(s);
   - minimum recovery amount;
   - settlement currency (USDC first; HBAR optional where already supported);
   - expiry;
   - whether cancellation is allowed;
   - whether out-of-policy escalation may be requested.
4. Owner signs/grants authority non-custodially.
5. Agent reads booking/provider state and obtains any paid recovery-policy quote it needs.
6. Agent finds a compliant recovery path.
7. If inside mandate, it executes without another prompt.
8. If outside mandate, YourTurn blocks it and offers a human escalation path.
9. Settlement and booking-right movement are shown as one understandable receipt.
10. Owner can revoke the remaining authority.

## Continuity mission stack

### Mission H0 — Hedera foundation [P0]

Create a native delegated-authority model using Hedera rather than replacing the existing backend grant with another off-chain token.

Target capabilities:

- serial-scoped HTS NFT allowance for a specific booking right;
- allowance revocation;
- Agent Kit v4 `RETURN_BYTES` or a proven non-custodial signing path for creating authority;
- custom YourTurn Agent Kit tool/plugin and `BookingRightDelegationPolicy`;
- replay/idempotency protection;
- HCS privacy-safe delegation lifecycle events;
- Mirror/HashScan evidence.

### Mission H1 — USDC-native recovery settlement [P0]

Make Hedera USDC a first-class customer-visible settlement path, not merely an x402 proof artifact.

Official Circle token IDs:

- Hedera mainnet USDC: `0.0.456858`
- Hedera testnet USDC: `0.0.429274`

Preferred technical target if the SDK spike proves it cleanly:

**one Hedera `TransferTransaction` containing both:**

- approved NFT transfer: booking owner -> buyer;
- approved fungible-token transfer: buyer -> booking owner in USDC.

This would make the recovery exchange atomic at the Hedera transaction layer once both sides have granted bounded allowances. If the atomic path cannot be proven safely in time, fall back to a clearly staged USDC settlement path and label it honestly.

Acceptance must include positive and negative cases: wrong serial, insufficient allowance, price below mandate, revoked authority and replay.

### Mission H2 — agentic recovery [P0]

Upgrade Concierge from policy-aware assistant to a bounded actor.

Agent capabilities should include:

- discover/read held bookings;
- inspect provider recovery rules;
- produce a recovery plan;
- decide whether the mandate permits execution;
- pay for an x402 recovery-policy service when useful;
- execute a permitted settlement;
- request escalation for a blocked action;
- explain exactly why an action was allowed or blocked.

Do not build generic chat. Every agent action must map to a real YourTurn domain capability and evidence.

### Mission UX — premium recovery experience [P0]

The sponsor work must live inside one finished product journey.

Required surfaces:

- booking detail: clear **Delegate recovery** entry point;
- Recovery Mandate creation/edit/revoke flow;
- human-readable policy summary before signing;
- live agent status/activity timeline;
- blocked-action escalation state;
- final recovery receipt showing authority, policy, settlement and proof;
- mobile-first pass at ~390 px plus desktop;
- no reviewer-only jargon in the primary customer flow.

Reviewer evidence may remain available separately, but the customer journey is the hero demo.

### Mission W — World AgentKit Continuity [P1]

World answers only: **is this requesting agent backed by a real human?**

YourTurn separately proves the booking holder delegated authority to that agent.

Implement:

- AgentKit request validation;
- AgentBook resolution where relevant;
- Sandbox proof;
- no claim that World proves booking ownership, honesty, or permission;
- feedback document required by the bounty.

### Mission L — Ledger Continuity [P1]

Use device-backed security where it changes user authority.

Preferred order:

1. owner hardware-backed approval/signature for mandate creation or expansion;
2. hardware confirmation when the agent requests authority outside the existing mandate;
3. Key Ring protection for a sensitive agent/backend secret only if the first two are not technically viable.

Do not claim Ledger signs Hedera transactions unless that exact path is proven with the supported Ledger stack.

### Mission X — integration + submission [P0 after branches are green]

Unify the sponsor work into one demo. No sponsor-logo wall and no three disconnected demos.

## Prize posture

Primary partner selections:

1. Hedera Continuity
2. World AgentKit Continuity
3. Ledger Continuity

Potential Hedera overdelivery to investigate without distorting the core:

- consume the already-existing x402 Hedera recovery-policy service from the new delegated agent;
- explore eligibility for Hedera's general AI & Agentic Payments prize separately, but do not count or claim it until explicit eligibility/stacking is confirmed.

Fallback if Ledger becomes blocked: Bazantic Continuity, because YourTurn already has agent-safe APIs and x402 infrastructure.

## Kill rules

- Do not add another chain merely for prize size.
- Do not rebrand pre-existing x402, Agent Kit or HCS work as new.
- Do not build a generic agent framework when a YourTurn-specific tool/policy is enough.
- Do not make UI polish the only new work for any sponsor.
- Do not put PII, World human identifiers, raw secrets or private booking data on HCS.
- Do not merge sponsor branches until their independent evaluator contract is green.

## Definition of success

A judge can watch one complete scenario:

> Alice owns booking #193. She delegates resale authority down to 40 USDC until tomorrow. A human-backed agent finds a 45 USDC buyer, proves the action is inside both user and provider policy, and settles the recovery. The same agent then attempts 32 USDC and is blocked. Alice revokes the mandate; a replay fails. The receipt shows what happened without requiring the judge to understand the plumbing first.

That is the product. Sponsor technologies are evidence for why the journey is safe and possible.
