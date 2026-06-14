# ETHGlobal Capability Status

Date: 2026-06-14

This file is the public boundary for what YourTurn can do now, what has been tested, and what is intentionally not claimed.

## Discovery

- YourTurn is a Next.js app for tokenized service bookings on Hedera.
- The ETHGlobal build adds a bounded Concierge recovery loop on top of the existing booking-right app.
- Concierge can run through the browser recovery page and through a Telegram webhook transport.
- The final proof packet records Telegram proofs for bookings `193` and `194`, plus an automated E2E regression using serials `196`, `197`, and `198`.

## Facts

Live and tested:

- Provider can create demo service slots and set resale/recovery policy.
- Person A can book a slot represented by an HTS NFT serial.
- Person A can open recovery mode at `/resale/[serial]?mode=recovery`.
- Concierge checks holder state, slot state, provider policy, and approval requirements.
- Concierge can create a resale listing after explicit approval.
- Concierge listing recovery creates a Hedera Schedule Service payment proof.
- Schedule `0.0.9228236` executed on Hedera testnet for the Telegram-assisted proof.
- Person B can buy the listed pass through the existing resale flow.
- Provider can mark a pass used and close the lifecycle.
- Concierge can complete a policy-gated release/refund path with a real testnet HBAR transfer.
- Telegram proof booking `194` sent a real testnet HBAR refund/release transaction.
- Receipts include approval id, policy checks, Agent Kit proof fields, Hedera transaction ids, and HashScan links.
- `/.well-known/agent.json` exposes the YourTurn Concierge agent card.
- `/api/agent/capabilities` exposes identity, tools, policy boundaries, protocol descriptors, and honest claim boundaries.
- `npm run hedera:agent-check` verifies Agent Kit runtime alignment, HCS-14 identity, policy gates, approval requirements, and budget guardrails.
- `npm run telegram:fixture` verifies Telegram parser and dry-run mutation safety.
- `npm run ethglobal:e2e` passed after final screenshot capture and intentionally mutated Hedera testnet/Redis demo state.

Final Telegram proof:

- Listing booking: `193`
- Listing receipt: `bc9155e7-17dd-451d-8f4f-1ba56e4fb99f`
- Listing audit tx: `0.0.8504300@1781403839.479174338`
- Schedule id: `0.0.9228236`
- Schedule create tx: `0.0.8504300@1781403839.567406004`
- Scheduled execution tx: `0.0.8504300-1781403839-567406004`
- Refund/release booking: `194`
- Refund receipt: `143c5cee-8d08-468d-9f6e-d4f349857a08`
- Refund/release tx: `0.0.8504300@1781404315.316217004`
- Refund close/burn tx: `0.0.8504300@1781404320.752860402`
- Refund audit tx: `0.0.8504300@1781404320.697190583`

Final E2E proof:

- Main serial: `196`
- Refund/release serial: `197`
- Open guardrail serial: `198`
- E2E schedule: `0.0.9228519`
- E2E scheduled execution: `0.0.8504300-1781406966-580404829`
- E2E refund/release tx: `0.0.8504300@1781406949.343880789`
- E2E listing receipt: `6351521d-13e2-4973-9d33-08eb521fa1ca`
- E2E refund receipt: `fb0e38dd-9ed8-4d93-9bd8-82abbaa8f7aa`

Tested commands:

```bash
npm run ethglobal:preflight
npm run hedera:agent-check
npm run telegram:fixture
npm run ethglobal:e2e
npm run build
```

## Inferences

- The Automation bounty is a strong claim because a user-facing recovery flow creates, stores, inspects, and proves a Hedera Schedule Service transaction that executed on testnet.
- The Agentic Payments bounty is a strong claim because Concierge performs policy-gated Hedera financial/token lifecycle actions after explicit human approval.
- The No Solidity bounty is a strong claim because the proof path uses Hedera native services through SDK/server routes and no Solidity files are present.
- Tokenization is a supporting claim because booking rights are HTS NFT serials with book, list, resell, release/refund, and close/use lifecycle operations.

## Not Claimed

Do not describe these as live:

- OpenClaw ACP gateway execution.
- x402 facilitator-backed settlement.
- Wallet connect.
- Wallet-funded user allowances.
- Fiat/stablecoin onramp.
- Calendar conflict detection.
- Fully autonomous LLM negotiation.
- Production custody or production security model.

## Next Steps

Before final submission:

1. Add the final public GitHub branch/link to `docs/SUBMISSION.md`.
2. Add the public Vercel URL after deployment is confirmed.
3. Record or upload the optional 2-4 minute demo video.
4. Keep `TELEGRAM_ALLOW_MUTATIONS=false` outside rehearsal/demo windows.
5. Rotate the Telegram bot token after final rehearsal/submission.
