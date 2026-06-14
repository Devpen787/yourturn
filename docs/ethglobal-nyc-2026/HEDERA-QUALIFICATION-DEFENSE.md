# Hedera Qualification Defense

Status: final reviewer-facing qualification map.

This file maps Hedera's stated qualification requirements to the shipped YourTurn proof. It is intentionally claim-safe: it highlights what is live without presenting roadmap integrations as finished.

## Executive Claim

YourTurn qualifies for the primary Hedera tracks because the ETHGlobal delta is not just UI around an old booking app. The new Concierge recovery loop performs policy-gated, human-approved Hedera actions on testnet and returns proof through receipts, HashScan links, Agent Kit proof fields, and verifier commands.

The core proof is:

1. Person A holds an HTS booking-right NFT.
2. Concierge reads the live booking state and provider policy.
3. Concierge previews recovery economics before action.
4. Person A approves the recovery action.
5. YourTurn executes the Hedera-backed action.
6. The product returns proof: transaction ids, schedule id, HashScan links, HCS audit, and Agent Kit proof.

## Qualification Matrix

| Hedera track | Requirement | YourTurn evidence |
| --- | --- | --- |
| **Autonomous On-Chain Automation Platform** | Use Hedera Schedule Service to create and execute scheduled transactions on testnet. Expose a user-facing workflow to create, approve, and manage scheduled actions. | Person A approves recovery listing through Telegram or `/resale/[serial]?mode=recovery`; YourTurn creates a Hedera Schedule Service recovery payment proof; final proof includes executed schedule `0.0.9228236` and regression schedule `0.0.9228519`; receipts expose schedule id, HashScan links, status, and policy basis. |
| **AI & Agentic Payments on Hedera** | Build an AI agent or multi-agent system that executes at least one payment, token transfer, or financial operation on Hedera Testnet using Agent Kit, OpenClaw ACP, x402, A2A, or Hedera SDKs. | YourTurn Concierge is a bounded agentic workflow with Agent Kit runtime/manifest, HCS-14 identity, tool ids, policy checks, approval ids, and budget guardrails. It creates a recovery listing/schedule proof and executes a real testnet HBAR refund/release after approval. |
| **No Solidity Allowed** | Use Hedera JS/TS or Python SDK. No Solidity smart contracts. Incorporate at least two native Hedera services. | The proof path uses `@hashgraph/sdk`, HTS booking-right NFTs, HCS audit events, Hedera Schedule Service, Mirror Node, and HashScan. No Solidity is used in the ETHGlobal proof path. |
| **Tokenization on Hedera** | Create, manage, or interact with tokens using HTS and demonstrate lifecycle operations. | YourTurn booking slots are HTS NFT serials. The demo lifecycle includes booking, recovery listing, resale handoff, release/refund, close/burn, and mark-used flows. This is a supporting track, not the main headline. |

## Proof Anchors

Primary Telegram-assisted proof:

- Listing booking: `193`
- Listing receipt: `bc9155e7-17dd-451d-8f4f-1ba56e4fb99f`
- Listing audit tx: `0.0.8504300@1781403839.479174338`
- Schedule id: `0.0.9228236`
- Scheduled execution tx: `0.0.8504300-1781403839-567406004`
- Refund/release booking: `194`
- Refund/release tx: `0.0.8504300@1781404315.316217004`
- Refund close/burn tx: `0.0.8504300@1781404320.752860402`

Final regression proof:

- Main serial: `196`
- Refund/release serial: `197`
- Guardrail serial: `198`
- Schedule id: `0.0.9228519`
- Scheduled execution tx: `0.0.8504300-1781406966-580404829`
- Refund/release tx: `0.0.8504300@1781406949.343880789`

Live endpoints:

- Public app: `https://yourturn-sage.vercel.app`
- Agent card: `https://yourturn-sage.vercel.app/.well-known/agent.json`
- Agent capabilities: `https://yourturn-sage.vercel.app/api/agent/capabilities`

Verifier commands:

```bash
npm run ethglobal:preflight
npm run hedera:agent-check
npm run telegram:fixture
npm run ethglobal:e2e
npm run build
```

## Why This Is Not Sponsor Theater

- Hedera Schedule Service is load-bearing: the recovery listing path creates and stores a schedule proof that can be inspected through HashScan/Mirror.
- The Concierge is not just a chatbot: it reads booking state, applies policy checks, requires approval, and triggers Hedera-backed state changes.
- The payment proof is real testnet movement: the release/refund path sends testnet HBAR and closes the booking right.
- Tokenization is part of the product state: booking refs are HTS NFT serials with lifecycle operations, not database-only reservations.
- No Solidity is used for the proof path: the implementation relies on native Hedera services and SDK/server routes.

## Claim Boundaries

Use these as boundaries, not as the headline:

- OpenClaw ACP and x402 are documented as future gateway integrations, not live settlement rails.
- Wallet-funded user allowances are not live; current demo budget controls are server-enforced.
- Production fiat refunds are not live; refund proof is testnet HBAR.
- The Concierge is bounded and approval-gated, not an unconstrained autonomous LLM.

These boundaries make the submission more credible without weakening the main claim: the live demo does satisfy the Hedera automation, agentic payment, and native-service proof requirements.

