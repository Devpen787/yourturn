# ETHGlobal capability status

Date: 2026-06-13

This file is the current build boundary: what is live and tested, what is configured but not live in the user journey, what cannot be claimed yet, and the next implementation plan for the gaps.

## Discovery

- The repo has a live Next.js app with HTS booking rights, HCS lifecycle events, Mirror reads, resale royalties, freeze/unfreeze, mark-used, recovery receipts, Schedule Service proof, real testnet HBAR refund/release, a Telegram Concierge webhook adapter, and an Agent Kit dependency.
- The latest clean regression is automated through `npm run ethglobal:e2e`.
- Hedera Agent Kit alignment is now documented and locally checked through `docs/ethglobal-nyc-2026/HEDERA-AGENT-KIT-INTEGRATION.md` and `npm run hedera:agent-check`; this includes a real Agent Kit runtime adapter, deterministic HCS-14 identity, A2A/capabilities descriptors, and a server-enforced demo budget gate.
- Browser screenshots from the latest pass live at `/tmp/yourturn-ethglobal-qa/`.
- The in-app Browser runtime was unavailable during QA, so the screenshot pass used Chrome-channel Playwright against the same local app.

## Facts

Live and tested:

- Owner can save a 3-session policy plan and reset the demo.
- Person A can book a resale-eligible slot.
- Person A can open recovery mode, preview a Concierge recommendation, approve the listing, and receive a proof receipt.
- The recovery confirmation creates a real Hedera Schedule Service recovery payment proof.
- `/api/automation/inspect` can refresh schedule state until Mirror reports `executed`.
- Person B can buy the listed pass through the existing resale flow.
- Provider can mark the resold pass used.
- Provider can see schedule automation proof on `/issuer` for rows that have a recovery schedule.
- Person A can approve release of a no-resale held pass and receive a real testnet HBAR refund while the NFT returns to treasury and is closed.
- Provider can see recovery/refund proof on `/issuer` for rows that have a recovery receipt.
- Value-moving Concierge receipts include an `agentProof` object with agent identity, tool id, approval id, passed policy checks, Hedera services, and proof outputs.
- `npm run hedera:agent-check` validates the Agent Kit runtime adapter, manifest, HCS-14 identity, policy gates, budget gate, approval requirements, and blocked scenarios for the Concierge tools.
- `/.well-known/agent.json` exposes an A2A-style agent card with the HCS-14 `uaid:aid` identifier.
- `/api/agent/capabilities` exposes the same identity, tool manifest, A2A descriptor, and honest descriptor-only status for OpenClaw ACP and x402.
- Telegram webhook command handling is fixture-tested and mutation-gated; live Telegram delivery requires bot credentials and an allowlisted chat.
- Used, unheld, non-holder, and no-resale states block recovery.
- Terminal or policy-blocked resale pages no longer expose manual List or Buy controls.

Latest clean proof:

- Main serial: `187`
- Refund/release serial: `188`
- Open/unheld guardrail serial: `189`
- Recovery listing receipt id: `50cb1cd9-264b-47f2-b95b-3eb9f30c71db`
- Refund release receipt id: `c477475c-0982-4a44-8f39-5543d378a9fa`
- Schedule id: `0.0.9227497`
- Scheduled transaction id: `0.0.8504300@1781397488.488433669?scheduled`
- Schedule create tx: `0.0.8504300@1781397488.488433669`
- Scheduled execution tx: `0.0.8504300-1781397488-488433669`
- Executed timestamp: `1781397585.057210004`
- Agent proof tools checked in E2E: `yourturn.recovery.confirm_refund_release`, `yourturn.recovery.confirm_listing`
- Agent protocol descriptors checked in E2E: A2A/HCS-14 card, OpenClaw descriptor-only status, x402 descriptor-only status
- Primary book tx: `0.0.8504300@1781397455.868752258`
- Refund/release transfer tx: `0.0.8504300@1781397472.551738960`
- Refund close/burn tx: `0.0.8504300@1781397474.102316916`
- Refund audit tx: `0.0.8504300@1781397476.746514442`
- Resale buy tx: `0.0.8504300@1781397584.036844283`

Tested commands:

- `npm run ethglobal:preflight`
- `npx tsc --noEmit`
- `npm run telegram:fixture`
- `npm run hedera:agent-check`
- `npm run lint`
- `npm run build`
- `npm run ethglobal:e2e`

## Inferences

- The Automation bounty is now claimable if the final demo shows the Schedule Service schedule id, executed transaction, and user-facing approval/inspect flow.
- The Agentic Payments bounty is now stronger because the Concierge path performs real Hedera financial operations after policy checks and human approval: a scheduled HBAR recovery payment and a real testnet HBAR refund/release. Copy must stay honest: this is a bounded Agent Kit runtime/tool workflow, not a fully autonomous Telegram/LLM agent.
- The No Solidity bounty is a strong supporting claim because the path stays SDK-only and uses multiple native Hedera services.
- Tokenization is supporting evidence unless a later wave adds a new HTS lifecycle or policy feature beyond the existing booking-right token.

## Cannot Do Yet

Do not claim these as shipped:

- Live Telegram Concierge transport with bot credentials and a verified allowlisted chat.
- OpenClaw ACP Gateway runtime. Current status: descriptor only.
- x402 facilitator-backed settlement. Current status: descriptor only.
- Wallet connect or user-funded budget allowance. Current status: server-enforced demo budget only.
- Fiat/stablecoin onramp.
- Scheduled release, refund, expiry, or transfer of the booking-right token itself.
- Calendar conflict detection.
- Fully autonomous LLM or multi-agent negotiation.
- Production-grade security model. The current app uses signed demo sessions plus server-side demo accounts.

## Plan For What Cannot Do Yet

### Remaining implementation: live Telegram credential test

Scope:

- Configure `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ALLOWED_CHAT_IDS`, and only then enable `TELEGRAM_ALLOW_MUTATIONS=true`.
- Send a real allowlisted Telegram message such as "I cannot attend" and confirm the bot returns the same recovery link or receipt used by `/resale/[serial]?mode=recovery`.
- Keep approval bounded to YourTurn's action allowlist; Telegram must not hold keys or execute arbitrary transactions.

Exit criteria:

- Fixture/dry-run webhook test proves commands are parsed and mutation-gated.
- If credentials are available, one live Telegram message returns a recovery link or receipt.
- Docs say Telegram is live only if this test passes.

### Deferred implementation: wallet-funded budgets

Scope:

- Design only unless time remains after Telegram and owner proof.
- Add UI copy and docs only when a real wallet or allowance flow exists.

Exit criteria:

- User can connect/fund a real testnet account or grant a bounded allowance.
- Agent can book only inside budget/policy boundaries.

### Deferred implementation: scheduled release/expiry of the booking right

Scope:

- Do not ship claim copy until the booking-right token operation itself is scheduled, not only executed immediately or paired with a scheduled payment.

Exit criteria:

- Confirm creates a real scheduled token release/expiry action.
- Proof receipt shows tx id, schedule id, HashScan links, and final state.

## Next Steps

1. Keep `npm run ethglobal:e2e` as the regression gate before demo recording.
2. Add Telegram as a thin transport only after the in-app recovery loop stays green.
3. Keep the public demo script focused on the live tested loop: owner policy, book, recover, schedule proof, resale, used.
