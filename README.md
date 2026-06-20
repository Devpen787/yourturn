# YourTurn

YourTurn turns a booked service slot into a controlled, transferable pass on Hedera. Providers keep policy control; customers get a Concierge recovery path when they cannot attend.

This repository contains two submission surfaces for the same YourTurn codebase.

- ETHGlobal NYC 2026 continuity packet (historical): existing event submission materials and ETHGlobal proof packs.
- Hedera AI Bounty Week 5: active policy-agent entry with fresh proof claims and separate submission docs.

Public demo: [https://yourturn-sage.vercel.app](https://yourturn-sage.vercel.app)

## Submission lane separation

Use this rule during evaluation:

- **ETHGlobal NYC 2026 docs** (`docs/ethglobal-nyc-2026/*`) are historical continuity artifacts from an event process.
- **Hedera AI Bounty Week 5 docs** (`docs/HEDERA-AI-BOUNTY-WEEK5-POLICY-AGENT.md`, `docs/HEDERA-WEEK5-FINAL-STEPS.md`) are the active bounty lane.
- For bounty review, anchor claims to the live Week 5 proof surfaces:
  - `/week5-proof`
  - `/api/agent/week5-proof`
  - `/api/x402/recovery-policy`
  - `/api/nft-studio/proof`
  - `/api/wallet-budget/config`

## Submission Lanes

### ETHGlobal NYC 2026 (continuity packet)

- Objective: public ETHGlobal continuity package for the 2026 event.
- Scope docs: `docs/ethglobal-nyc-2026/*`
- Use these docs for ETHGlobal-era claims, track mapping, and ETHGlobal form work.

### Hedera AI Bounty Week 5 (active)

- Objective: policy-constrained agent with HBAR/USDC payment paths under explicit policy.
- Scope docs: `docs/HEDERA-AI-BOUNTY-WEEK5-POLICY-AGENT.md`, `docs/HEDERA-WEEK5-FINAL-STEPS.md`
- Required public proof for this bounty should come from this lane first, especially ` /week5-proof`, `/api/agent/week5-proof`, and updated route/API documentation.

## What We Built For ETHGlobal

The ETHGlobal delta is **YourTurn Concierge**:

1. A provider creates service slots and recovery policy.
2. Person A books a slot represented as an HTS NFT booking right.
3. If Person A cannot attend, Concierge checks holder state and provider policy.
4. Concierge recommends a recovery action, asks for explicit human approval, and executes through the same server-side Hedera paths as the app.
5. The app returns receipts with Hedera transaction ids, HashScan links, Agent Kit proof fields, and Schedule Service proof where applicable.

ETHGlobal primary live flows:

- Tokenized booking rights with HTS NFT serials.
- Resale listing and resale purchase with issuer royalty.
- Telegram Concierge preview and approval for recovery listing.
- Telegram Concierge approval for a real testnet HBAR refund/release.
- Hedera Schedule Service proof for an approved recovery payment.
- HCS audit events, Mirror Node reads, HashScan verification, and no Solidity in the proof path.

## Hedera Tracks

Primary tracks:

- **Autonomous On-Chain Automation Platform**: recovery listing creates and exposes an executed Hedera Schedule Service proof.
- **AI & Agentic Payments on Hedera**: bounded Concierge applies policy, requires human approval, and executes Hedera financial/token lifecycle actions.
- **"No Solidity Allowed" - Build with Hedera SDKs**: implementation uses Hedera SDK/native services, not Solidity.

Supporting story:

- **Tokenization on Hedera**: booking rights are HTS NFT serials with lifecycle operations.

ETHGlobal scorecard: [docs/ethglobal-nyc-2026/HEDERA-BOUNTY-SCORECARD.md](docs/ethglobal-nyc-2026/HEDERA-BOUNTY-SCORECARD.md)
Week 5 bounty readiness: [docs/HEDERA-AI-BOUNTY-WEEK5-POLICY-AGENT.md](docs/HEDERA-AI-BOUNTY-WEEK5-POLICY-AGENT.md)

THA-ready commercial and qualification pack: [docs/THA-ROADMAP-BUSINESS-FUNDING-PLAN.md](docs/THA-ROADMAP-BUSINESS-FUNDING-PLAN.md)

## Proof Links

ETHGlobal proof packet: [docs/ethglobal-nyc-2026/FINAL-PROOF-PACK.md](docs/ethglobal-nyc-2026/FINAL-PROOF-PACK.md)

Week 5 bounty proof packet: [docs/HEDERA-AI-BOUNTY-WEEK5-POLICY-AGENT.md](docs/HEDERA-AI-BOUNTY-WEEK5-POLICY-AGENT.md)

Key final Telegram proofs:

- Booking `193`: Telegram approval listed the pass and created Schedule Service proof `0.0.9228236`.
- Schedule proof: [HashScan schedule 0.0.9228236](https://hashscan.io/#/testnet/schedule/0.0.9228236)
- Scheduled execution: [HashScan transaction 0.0.8504300-1781403839-567406004](https://hashscan.io/#/testnet/transaction/0.0.8504300-1781403839-567406004)
- Booking `194`: Telegram approval completed a real testnet HBAR refund/release.
- Refund/release: [HashScan transaction 0.0.8504300-1781404315-316217004](https://hashscan.io/#/testnet/transaction/0.0.8504300-1781404315-316217004)

Final automated regression also passed with fresh proof:

- Main serial `196`, refund/release serial `197`, guardrail serial `198`.
- E2E Schedule Service proof: [HashScan schedule 0.0.9228519](https://hashscan.io/#/testnet/schedule/0.0.9228519)
- E2E scheduled execution: [HashScan transaction 0.0.8504300-1781406966-580404829](https://hashscan.io/#/testnet/transaction/0.0.8504300-1781406966-580404829)

## Reviewer Map

Start here:

| File | Why it matters |
| --- | --- |
| [docs/SUBMISSION.md](docs/SUBMISSION.md) | ETHGlobal submission worksheet and final copy. |
| [docs/FINAL-DEMO-SCRIPT.md](docs/FINAL-DEMO-SCRIPT.md) | Public recording checklist for the 2-4 minute demo. |
| [docs/DEMO.md](docs/DEMO.md) | Full operator runbook and route flow. |
| [docs/UI-MAP.md](docs/UI-MAP.md) | Routes, APIs, components, and user journeys. |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System boundaries and Hedera integration architecture. |
| [docs/HEDERA-AI-BOUNTY-WEEK5-POLICY-AGENT.md](docs/HEDERA-AI-BOUNTY-WEEK5-POLICY-AGENT.md) | Hedera AI Bounty Week 5 policy-agent readiness, submission positioning, and gaps. |
| [docs/ethglobal-nyc-2026/FINAL-PROOF-PACK.md](docs/ethglobal-nyc-2026/FINAL-PROOF-PACK.md) | Final proof ids, screenshots, commands, and honest gaps. |
| [docs/THA-ROADMAP-BUSINESS-FUNDING-PLAN.md](docs/THA-ROADMAP-BUSINESS-FUNDING-PLAN.md) | THA qualification narrative + 12-month roadmap, budget runway, SWOT, and moat. |
| [docs/ethglobal-nyc-2026/HEDERA-QUALIFICATION-DEFENSE.md](docs/ethglobal-nyc-2026/HEDERA-QUALIFICATION-DEFENSE.md) | Requirement-by-requirement Hedera qualification defense. |
| [docs/ethglobal-nyc-2026/HEDERA-AGENT-KIT-INTEGRATION.md](docs/ethglobal-nyc-2026/HEDERA-AGENT-KIT-INTEGRATION.md) | Agent identity, Agent Kit runtime, HCS-14 id, tool manifest, and claim boundaries. |
| [docs/ethglobal-nyc-2026/HEDERA-BOUNTY-MAP.md](docs/ethglobal-nyc-2026/HEDERA-BOUNTY-MAP.md) | Track-by-track qualification mapping. |

Agent endpoints when the app is running:

- [GET `/.well-known/agent.json`](https://yourturn-sage.vercel.app/.well-known/agent.json)
- [GET `/api/agent/capabilities`](https://yourturn-sage.vercel.app/api/agent/capabilities)

## Run Locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

- `http://localhost:3000/login`
- Demo issuer: prepares provider slots.
- Demo user A: books and recovers a pass.
- Demo user B: buys a listed pass.

Required environment values are listed in [.env.example](.env.example). The live demo uses Hedera testnet accounts, Upstash Redis, and optional Telegram bot settings.

## Verification

Final verification commands:

```bash
npm run ethglobal:preflight
npm run hedera:agent-check
npm run telegram:fixture
npm run ethglobal:e2e
npm run build
```

What they check:

- `ethglobal:preflight`: public docs, final proof packet, claim boundaries, and no Solidity files.
- `hedera:agent-check`: Agent Kit runtime adapter, HCS-14 identity, capability descriptors, policy gates, approval requirements, and budget guardrails.
- `telegram:fixture`: Telegram parser and dry-run mutation safety.
- `ethglobal:e2e`: live app flow against Hedera testnet and Redis demo state.
- `build`: production Next.js build.

## Claim Boundaries

Live and claimed:

- HTS booking-right NFTs.
- HCS audit events.
- Hedera Schedule Service recovery payment proof.
- Real testnet HBAR refund/release.
- Live Hedera x402 HBAR and HTS/USDC settlement proof.
- Optional in-app Hedera WalletConnect/Reown path for user-signed bounded HTS/USDC allowance budgets.
- Mirror Node and HashScan verification.
- Hedera Agent Kit runtime/manifest alignment.
- Agent Lab companion packet and NFT Studio metadata/risk proof artifacts for reviewers.
- Telegram Concierge as a mutation-gated transport.

Not claimed as live:

- OpenClaw ACP gateway runtime.
- Raw autonomous private-key signing or unattended wallet custody.
- Fiat or stablecoin onramp.
- Fully autonomous LLM negotiation.

## Stack

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- `@hashgraph/sdk`
- `@hashgraph/hedera-agent-kit`
- Upstash Redis
- Hedera Testnet
- Vercel

## Repo Discipline

Public docs should stay focused on reviewers, judges, partners, setup, and verification. Internal planning notes belong outside the tracked public tree.
