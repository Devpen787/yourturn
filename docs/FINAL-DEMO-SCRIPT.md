# Final Demo Script

Use this as the 2-4 minute ETHGlobal recording script.

One person speaks. One person clicks. Do not narrate every field. The goal is to make the proof path obvious:

1. owner policy controls what can happen
2. Person A owns a booked pass
3. Concierge recommends a recovery action
4. the human approves
5. Hedera executes and produces proof

## Claim Labels

- Live: in-app recovery listing, Telegram recovery/listing, Telegram refund/release, HTS pass lifecycle, HCS audit, Schedule Service proof, Agent Kit verifier.
- Configured: live Telegram requires bot credentials, webhook secret, allowlisted chat, and `TELEGRAM_ALLOW_MUTATIONS=true`.
- Roadmap: wallet-funded budgets, OpenClaw ACP gateway runtime, x402 facilitator settlement, remote A2A negotiation, scheduled token release/refund.

## Proof Objects To Show

- Telegram listing proof for booking `193`.
- Telegram refund/release proof for booking `194`.
- Schedule `0.0.9228236`.
- Scheduled execution transaction `0.0.8504300-1781403839-567406004`.
- Refund/release transaction `0.0.8504300@1781404315.316217004`.
- Listing receipt `bc9155e7-17dd-451d-8f4f-1ba56e4fb99f`.
- Refund receipt `143c5cee-8d08-468d-9f6e-d4f349857a08`.
- Agent descriptor at `/.well-known/agent.json`.
- Agent capability endpoint at `/api/agent/capabilities`.

## Recording Setup

Use these surfaces:

- Browser: `http://localhost:3000/issuer`
- Browser: `http://localhost:3000/my-bookings`
- Browser: `http://localhost:3000/resale/193?mode=recovery`
- Browser: `http://localhost:3000/resale/194?mode=recovery`
- Telegram: `t.me/YourTurnConcierge_bot`
- HashScan schedule: `https://hashscan.io/#/testnet/schedule/0.0.9228236`
- HashScan scheduled execution: `https://hashscan.io/#/testnet/transaction/0.0.8504300-1781403839-567406004`
- HashScan refund/release: `https://hashscan.io/#/testnet/transaction/0.0.8504300-1781404315-316217004`

Keep `TELEGRAM_ALLOW_MUTATIONS=false` after rehearsal. Only turn it on during the live Telegram proof step.

## Script

### 0:00-0:20 Opening

Speaker:

YourTurn helps service businesses recover value when a customer cannot attend a booked slot.

Instead of a cancellation becoming a manual support problem, the booking becomes a controlled pass. The customer gets a recovery path, the owner keeps policy control, and Hedera records the lifecycle.

### 0:20-0:45 Owner policy

Operator:

Open `/issuer` and show the live sessions table and policy-shaped inventory.

Speaker:

The provider sets which sessions can be resold or released, and those rules drive the recovery flow. This is not an open-ended resale market. The owner keeps control over the slot and the final redemption.

### 0:45-1:10 Customer pass and Telegram entry

Operator:

Open `/my-bookings` as Person A. Show the pass tile with `Booking #193` and the Telegram Concierge card.

Speaker:

Person A holds a booked pass. If they cannot attend, they do not need to understand tokens, schedules, or policy state. They can ask YourTurn Concierge for their bookings and use the booking number shown in the app.

### 1:10-1:45 Telegram listing recovery

Operator:

Show the Telegram recovery preview screenshot or live chat for `recover booking 193`, then show `approve listing 193`.

Speaker:

The Concierge checks the current holder, the owner resale policy, the expected ask, the owner royalty, and the seller net. It then asks for human approval before changing anything.

After approval, the pass is listed for resale, an audit receipt is created, and the recovery payment proof is scheduled on Hedera.

### 1:45-2:15 Schedule Service proof

Operator:

Open `/resale/193?mode=recovery`, then open HashScan schedule `0.0.9228236`.

Speaker:

This is the automation proof. The recovery action created a real Hedera Schedule Service object, and HashScan shows it executed on testnet. The app can inspect that proof and show the scheduled action status back to the user.

### 2:15-2:45 Telegram refund/release proof

Operator:

Show the Telegram `approve refund 194` success screenshot, then open `/resale/194?mode=recovery` and the refund HashScan link.

Speaker:

The second proof shows the other recovery path. For booking `194`, the Concierge performed a policy-gated refund/release after human approval. It sent a real testnet HBAR refund, closed the booking right, and wrote the audit proof.

### 2:45-3:20 Agent Kit proof

Operator:

Open `/.well-known/agent.json`, `/api/agent/capabilities`, or the terminal output from `npm run hedera:agent-check`.

Speaker:

The agent has a bounded identity, tool manifest, policy gates, approval requirements, and budget checks. The verifier confirms the live tracks: Schedule Service automation, agentic Hedera payments, native Hedera services, and no Solidity.

We are honest about what is not live: OpenClaw ACP and x402 are descriptors only, not gateway settlement runtimes in this demo.

### 3:20-3:45 Close

Speaker:

The result is a booked-rights recovery flow that normal users can operate through the app or Telegram, while Hedera provides the token lifecycle, audit trail, scheduled automation, and payment proof.

For the hackathon, our primary Hedera claims are Autonomous On-Chain Automation, AI and Agentic Payments, and No Solidity Allowed.

## Short Cut If Time Is Tight

1. Show `/my-bookings` with `Booking #193` and Telegram entry.
2. Show Telegram listing success for `193`.
3. Show `/resale/193?mode=recovery` and HashScan schedule `0.0.9228236`.
4. Show Telegram refund success for `194`.
5. Show `npm run hedera:agent-check` result or `/api/agent/capabilities`.

## Final Rehearsal Commands

Run before recording:

```bash
npm run ethglobal:preflight
npm run hedera:agent-check
npm run telegram:fixture
npm run build
```

Optional full regression, if you are comfortable mutating demo state:

```bash
npm run ethglobal:e2e
```
