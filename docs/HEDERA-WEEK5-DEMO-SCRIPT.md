# Week 5 Demo Script

Goal: one clean 75-90 second recording. No terminal. No setup narration. Show the human problem, the policy checks, and the Hedera proof.

## Tabs To Open First

- `https://yourturn-sage.vercel.app/login`
- `https://yourturn-sage.vercel.app/resale/193?mode=recovery`
- `https://yourturn-sage.vercel.app/week5-proof`
- `https://yourturn-sage.vercel.app/api/agent/week5-proof`

Sign in on the first tab as **Demo user A** before recording, then start recording on the recovery receipt tab.

## 0:00-0:15 - Problem

Screen: `/resale/193?mode=recovery`

Say:

> "YourTurn solves a real service problem: Person A booked a session and cannot attend. Instead of a manual refund or support ticket, Concierge checks whether recovery is allowed."

Point at:

- `Recovery receipt for this pass`
- `CONCIERGE RECOVERY`

## 0:15-0:35 - Policy Checks

Screen: same receipt page

Say:

> "The agent is not free to act. It checks the current holder, provider resale rules, duplicate listing state, budget, and Agent Kit policies before a recovery action is allowed."

Point at:

- `What Concierge checked`
- `Current holder matches your account`
- `Provider allows resale`
- `Budget and Agent Kit policies allow`

## 0:35-0:55 - Approval And Receipt

Screen: same receipt page, scroll slightly to `VERIFIED RECEIPT`

Say:

> "After approval, the receipt keeps the action, price math, policy basis, approval id, audit transaction, and scheduled payment proof in one place."

Point at:

- `Action`
- `Policy basis`
- `Approval`
- `Audit tx`
- `Schedule id`
- `Executed at`

Optional click:

- `Verify schedule on HashScan`

## 0:55-1:15 - Week 5 Proof Page

Screen: `/week5-proof`

Say:

> "For Week 5, the reviewer proof is separate from the customer flow. This page shows the Agent Kit policies, HBAR and USDC x402 proof, and the wallet-funded USDC allowance boundary."

Point at:

- `HBAR x402 settlement`
- `USDC x402 settlement`
- `Wallet-funded USDC allowance`
- `Runtime Policy Surface`

## 1:15-1:30 - Machine-Readable Proof

Screen: `/api/agent/week5-proof`

Say:

> "The same claim is machine-readable: official Agent Kit policies are present, invalid actions are blocked, and HBAR, USDC, x402, Agent Lab, and NFT Studio evidence is exposed without a terminal."

End with:

> "This is a policy-constrained recovery agent: useful to a customer, bounded by provider rules, and verifiable on Hedera."

## If You Need A 60-Second Version

Use only three screens:

1. `/resale/193?mode=recovery`
2. `/week5-proof`
3. `/api/agent/week5-proof`

Say:

> "Person A cannot attend a booked session. Concierge checks holder state, provider policy, duplicate listing, budget, and Agent Kit policies before recovery is allowed. The receipt shows the approved action, policy basis, approval id, audit transaction, schedule id, and HashScan proof. The Week 5 verifier page then shows the official Agent Kit policies plus HBAR and USDC x402 settlement proof and a bounded wallet-funded USDC allowance. This is not raw autonomous custody. It is useful recovery under explicit policy with Hedera proof."

## Do Not Say

- "Fully autonomous wallet custody."
- "Production fiat refunds."
- "Every app action is an Agent Kit tool."
- "OpenClaw is live."
- "USDC is a fiat onramp."
