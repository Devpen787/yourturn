# ETHGlobal NYC 2026 Public Packet

Status: final public packet for the YourTurn continuity submission.

Prepared for: ETHGlobal NYC 2026.

Public demo: [https://yourturn-sage.vercel.app](https://yourturn-sage.vercel.app)

Final public branch: [codex/ethglobal-final-public](https://github.com/Devpen787/yourturn/tree/codex/ethglobal-final-public)

## Submission Frame

YourTurn Concierge helps a customer recover value from a booked service slot they cannot use. A provider sets the session and recovery policy. The customer books a tokenized pass. Concierge checks holder state and policy, asks for explicit approval, executes the Hedera-backed action, and returns proof.

The repo is a continuity submission, not a from-scratch repo. Pre-existing YourTurn booking and tokenization work is disclosed in [CONTINUITY-PACKET.md](CONTINUITY-PACKET.md). The ETHGlobal delta is the Concierge recovery layer, Telegram transport, Hedera Schedule Service proof, Agent Kit proof surface, and final proof documentation.

## Public Packet Files

| File | Purpose |
| --- | --- |
| [FINAL-PROOF-PACK.md](FINAL-PROOF-PACK.md) | Final proof ids, HashScan links, screenshots, verification commands, and honest gaps. |
| [HEDERA-BOUNTY-MAP.md](HEDERA-BOUNTY-MAP.md) | Hedera track qualification mapping and claim rules. |
| [HEDERA-BOUNTY-SCORECARD.md](HEDERA-BOUNTY-SCORECARD.md) | Current self-rating by Hedera bounty track. |
| [HEDERA-AGENT-KIT-INTEGRATION.md](HEDERA-AGENT-KIT-INTEGRATION.md) | Agent identity, Agent Kit runtime adapter, HCS-14 id, tool manifest, policy gates, and claim boundaries. |
| [CAPABILITY-STATUS.md](CAPABILITY-STATUS.md) | Current live, tested, and not-claimed capabilities. |
| [TELEGRAM-OPENCLAW-SETUP.md](TELEGRAM-OPENCLAW-SETUP.md) | Telegram setup, command list, mutation gate, and OpenClaw/x402 boundaries. |
| [CONTINUITY-PACKET.md](CONTINUITY-PACKET.md) | What existed before ETHGlobal and what was added during the continuity build. |
| [SUBMISSION-CHECKLIST.md](SUBMISSION-CHECKLIST.md) | Final submission artifact checklist. |

Root-level public docs:

- [../../README.md](../../README.md)
- [../SUBMISSION.md](../SUBMISSION.md)
- [../FINAL-DEMO-SCRIPT.md](../FINAL-DEMO-SCRIPT.md)
- [../DEMO.md](../DEMO.md)
- [../UI-MAP.md](../UI-MAP.md)
- [../ARCHITECTURE.md](../ARCHITECTURE.md)

## Primary Hedera Claims

1. **Autonomous On-Chain Automation Platform**: user-approved recovery creates a Hedera Schedule Service proof that executed on testnet.
2. **AI & Agentic Payments on Hedera**: YourTurn Concierge applies policy and approval gates before executing real Hedera financial/token lifecycle actions.
3. **"No Solidity Allowed" - Build with Hedera SDKs**: the proof path uses Hedera native services through SDK/server routes, not Solidity.

Supporting:

- **Tokenization on Hedera**: booked service slots are HTS NFT rights with lifecycle operations.

## Final Proof Anchors

Telegram-assisted proof:

- Listing recovery booking: `193`
- Schedule id: `0.0.9228236`
- Scheduled execution tx: `0.0.8504300-1781403839-567406004`
- Refund/release booking: `194`
- Refund/release tx: `0.0.8504300@1781404315.316217004`

Automated E2E proof:

- Main serial: `196`
- Refund/release serial: `197`
- Guardrail serial: `198`
- Schedule id: `0.0.9228519`
- Scheduled execution tx: `0.0.8504300-1781406966-580404829`

## Verification Commands

```bash
npm run ethglobal:preflight
npm run hedera:agent-check
npm run telegram:fixture
npm run ethglobal:e2e
npm run build
```

## Claim Boundaries

Do not claim these as live:

- OpenClaw ACP gateway runtime.
- x402 facilitator-backed settlement.
- Wallet connect or wallet-funded user allowance.
- Fiat/stablecoin onramp.
- Fully autonomous LLM negotiation.
- Production-grade account custody.

These are documented as boundaries or future work, not live proof.
