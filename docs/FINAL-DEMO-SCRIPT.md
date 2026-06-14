# Tight 3-Minute ETHGlobal Demo - Author Script + App Map

Use this for the final 2-4 minute ETHGlobal recording. The target runtime is `2:45-3:15`.

Do not expand the author script while recording. If the UI changes, update only the App Map and Verified Click Order so the spoken story stays clean.

## Golden Line

Person A cannot attend. YourTurn Concierge recovers value under provider rules. Hedera proves the policy, approval, automation, and value movement.

## Claim Labels

- Live: in-app recovery listing, Telegram recovery/listing proof, Telegram refund/release proof, HTS pass lifecycle, HCS audit trail, Hedera Schedule Service proof, Mirror/HashScan verification, Hedera Agent Kit runtime/manifest verifier.
- Configured: live Telegram mutation requires bot credentials, webhook secret, allowlisted chat, and `TELEGRAM_ALLOW_MUTATIONS=true`.
- Artifact: final Telegram screenshots, recovery receipts, HashScan links, and verifier command output recorded in the proof packet.
- Roadmap: wallet-funded user budgets, OpenClaw ACP gateway runtime, x402 facilitator settlement, remote A2A negotiation, scheduled token release/refund.

## Before Recording

Use production for the app surface:

- App: `https://yourturn-sage.vercel.app`
- Bookings: `https://yourturn-sage.vercel.app/my-bookings`
- Listing proof: `https://yourturn-sage.vercel.app/resale/193?mode=recovery`
- Refund proof: `https://yourturn-sage.vercel.app/resale/194?mode=recovery`
- Agent capabilities: `https://yourturn-sage.vercel.app/api/agent/capabilities`
- Telegram: `t.me/YourTurnConcierge_bot`
- HashScan schedule: `https://hashscan.io/#/testnet/schedule/0.0.9228236`
- HashScan scheduled execution: `https://hashscan.io/#/testnet/transaction/0.0.8504300-1781403839-567406004`
- HashScan refund/release: `https://hashscan.io/#/testnet/transaction/0.0.8504300-1781404315-316217004`

Have these local fallback screenshots ready if live Telegram or explorer loading is slow:

- `output/ethglobal-final-proof/screenshots/01-telegram-recovery-preview.png`
- `output/ethglobal-final-proof/screenshots/02-telegram-listing-success.png`
- `output/ethglobal-final-proof/screenshots/03-telegram-refund-success.png`
- `output/ethglobal-final-proof/screenshots/04-resale-193-recovery-proof.png`
- `output/ethglobal-final-proof/screenshots/05-resale-194-refund-proof.png`
- `output/ethglobal-final-proof/screenshots/08-hashscan-schedule-9228236.png`
- `output/ethglobal-final-proof/screenshots/10-hashscan-refund-release.png`

Final rehearsal commands:

```bash
npm run ethglobal:preflight
npm run hedera:agent-check
npm run telegram:fixture
npm run build
```

Do not run `npm run ethglobal:e2e` immediately before recording unless you intentionally want fresh demo/testnet state. It mutates demo state.

## Author Script (Verbatim)

### 0:00-0:15 - Open

"YourTurn turns booked service slots into controlled booking rights. The demo starts with one simple problem: Person A cannot attend, and the provider does not want a manual support mess."

Show: `https://yourturn-sage.vercel.app/my-bookings`

### 0:15-0:35 - Human Story

"The user sees a normal booking experience. Behind it, the booking is a pass with provider rules: whether it can be resold, how owner royalties work, and which recovery actions are allowed."

Show: booked pass or recovery entry point in `My bookings`.

### 0:35-1:05 - Concierge Recovery

"Now Person A asks YourTurn Concierge to recover the booking. The Concierge checks holder state, provider resale policy, ask price, owner royalty, and seller net. Nothing changes until the human approves."

Show: Telegram recovery preview for booking `193`.

### 1:05-1:25 - Approved Listing

"After approval, the Concierge lists the pass for resale and creates a receipt. This is the product value: the customer can recover value, the provider keeps policy control, and the next buyer can take the slot."

Show: Telegram listing success for booking `193`.

### 1:25-1:55 - In-App Proof

"The same proof is visible inside the app. This receipt shows the recovery action, approval id, price math, owner royalty, audit proof, and Hedera references without making the user think about chain state first."

Show: `https://yourturn-sage.vercel.app/resale/193?mode=recovery`

### 1:55-2:20 - Schedule Service Proof

"For the automation bounty, this recovery flow creates a real Hedera Schedule Service proof. HashScan shows schedule `0.0.9228236` executed on testnet. The scheduled amount is small because it proves the provider-policy automation path; the separate refund proof shows larger value movement."

Show: HashScan schedule `0.0.9228236`.

### 2:20-2:45 - Refund/Release Proof

"The second path is refund and release. For booking `194`, the Concierge performed a policy-gated refund/release after approval, sent a real `18 HBAR` testnet refund, closed the booking right, and returned a HashScan proof."

Show: Telegram refund success, then HashScan refund/release transaction.

### 2:45-3:05 - Agent Proof

"The agent is bounded. It has an identity, tool manifest, policy gates, approval requirements, and budget checks. The repo verifier confirms the live Hedera tracks: automation, agentic payments, native services, and no Solidity."

Show: `https://yourturn-sage.vercel.app/api/agent/capabilities` or terminal output from `npm run hedera:agent-check`.

### 3:05-3:15 - Close

"What is live today is the Hedera-backed recovery loop: tokenized booking rights, audit trail, scheduled automation, and approved testnet value movement. OpenClaw ACP and x402 are documented as future gateway integrations, not claimed as live settlement in this demo."

Show: final receipt or capability endpoint.

## App Map

| Author phrase | Surface to show |
| --- | --- |
| "Person A cannot attend" | `/my-bookings` with the booked pass / recovery entry point |
| "Concierge checks holder state" | Telegram recovery preview screenshot or live chat for booking `193` |
| "After approval" | Telegram listing success for booking `193` |
| "same proof is visible inside the app" | `/resale/193?mode=recovery` |
| "Schedule Service proof" | HashScan schedule `0.0.9228236` |
| "refund and release" | Telegram refund success for booking `194`, then HashScan refund tx |
| "agent is bounded" | `/api/agent/capabilities` or `npm run hedera:agent-check` |
| "not claimed as live settlement" | Stay on capabilities/proof packet; do not open OpenClaw/x402 pages |

## Verified Click Order

1. Open `https://yourturn-sage.vercel.app/my-bookings`.
2. Show Telegram recovery preview for `recover booking ref 193`.
3. Show Telegram approval success for `approve listing ref 193`.
4. Open `https://yourturn-sage.vercel.app/resale/193?mode=recovery`.
5. Open `https://hashscan.io/#/testnet/schedule/0.0.9228236`.
6. Open Telegram refund success for `approve refund ref 194`.
7. Open `https://hashscan.io/#/testnet/transaction/0.0.8504300-1781404315-316217004`.
8. Open `https://yourturn-sage.vercel.app/api/agent/capabilities` or show `npm run hedera:agent-check`.

## If Time Is Tight

Cut the owner-policy explanation, not the proof. Keep these five shots:

1. `/my-bookings`.
2. Telegram listing success for `193`.
3. `/resale/193?mode=recovery`.
4. HashScan schedule `0.0.9228236`.
5. Telegram refund success for `194` plus HashScan refund/release.

## If Asked What Is Real

- Real: Hedera SDK transactions, HTS pass lifecycle, HCS audit events, Schedule Service proof, Mirror/HashScan verification, Telegram approval transport, Agent Kit runtime/manifest verifier.
- Real but demo-scoped: testnet HBAR value movement and demo user identity.
- Not live: wallet-funded customer budgets, OpenClaw ACP gateway runtime, x402 facilitator settlement, remote A2A negotiation, production fiat refunds.
