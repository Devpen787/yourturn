# Hedera Agent Kit integration

Status: live verifier layer for ETHGlobal NYC 2026.

Date: 2026-06-13.

## Discovery

The Hedera AI & Agentic Payments bounty asks for an AI agent or multi-agent system that executes at least one payment, token transfer, or financial operation on Hedera testnet. Hedera's current Agent Kit docs describe a plugin/tool model, hooks and policies, and Hedera-native actions such as HBAR transfers, token actions, and schedule-service actions.

YourTurn's shipped path is a bounded Concierge agent, not an unconstrained autonomous LLM:

1. Read booking-right state.
2. Preview the recovery action.
3. Apply policy gates.
4. Ask the human for approval.
5. Execute the Hedera action server-side.
6. Return a proof receipt and HCS lifecycle evidence.

## Facts

- Package: `@hashgraph/hedera-agent-kit` is installed at version `4.0.0`.
- Agent identity: `yourturn-concierge`, version `2026.06.13-wave9`.
- Tool manifest: `lib/hedera-agent-kit/tool-manifest.ts`.
- Policy gates: `lib/hedera-agent-kit/policies.ts`.
- Proof builder: `lib/hedera-agent-kit/agent-proof.ts`.
- Verifier command: `npm run hedera:agent-check`.
- Live receipt surface: `RecoveryProofCard` shows the Hedera Agent Kit proof in the resale/detail receipt.
- Live E2E gate: `npm run ethglobal:e2e` now fails if the refund or listing receipts are missing agent-proof fields.

## Tool manifest

The manifest defines the Concierge tools as reviewer-readable capabilities:

| Tool | Mutation | Hedera services | Human approval |
| --- | --- | --- | --- |
| `yourturn.recovery.preview_listing` | none | Mirror Node | No |
| `yourturn.recovery.confirm_listing` | schedule_create | Hedera Agent Kit, HCS, Schedule Service, Mirror Node, HashScan | Yes |
| `yourturn.recovery.preview_refund_release` | none | Mirror Node | No |
| `yourturn.recovery.confirm_refund_release` | hbar_transfer_and_token_close | Hedera Agent Kit, HTS, HCS, Mirror Node, HashScan | Yes |
| `yourturn.automation.inspect_schedule` | none | Schedule Service, Mirror Node, HashScan | No |

## Policy gates

The current policy layer checks:

- actor is the current holder
- slot is held, not open or used
- resale is allowed before listing
- release is allowed before refund/release
- schedule automation is allowed before creating a schedule
- no duplicate active listing exists
- refund value matches the booked price
- approval id exists before value-moving confirm
- schedule inspection is tied to the requested serial and actor

These checks are intentionally boring: judges should be able to see why the Concierge is allowed to act.

## Agent proof receipt

Every value-moving Concierge confirm now returns an `agentProof` object with:

- agent name and version
- manifest version
- selected tool id and description
- execution mode
- Hedera services used
- mutation type
- approval id
- policy check results
- proof outputs such as schedule id, tx id, audit tx id, refund tx id, and HashScan links when available

The same proof is stored in the demo proof record and appears inside the user-facing proof drawer.

## Verifier

Run:

```bash
npm run hedera:agent-check
```

Expected result:

- `ok: true`
- five manifest tools checked
- all mutation tools require human approval
- valid listing policies pass
- valid refund policies pass
- non-holder, resale-disabled, and duplicate-listing scenarios block correctly
- schedule inspection policies pass

This verifier is intentionally local and deterministic. It does not replace the testnet E2E run; it checks that the agent boundary, manifest, policy gates, and bounty coverage remain coherent.

## Bounty mapping

Automation track:

- Load-bearing primitive: Hedera Schedule Service.
- Product state change: approved recovery listing creates a schedule proof.
- Verifier: `/api/automation/inspect`, Mirror state, HashScan schedule link, `npm run ethglobal:e2e`.

AI & Agentic Payments track:

- Load-bearing primitive: bounded Concierge agent tool execution.
- Product state change: after policy and approval, the Concierge performs a real Hedera financial operation.
- Verifier: `agentProof`, HCS lifecycle proof, HashScan transaction links, `npm run hedera:agent-check`, `npm run ethglobal:e2e`.

No Solidity track:

- Load-bearing primitive: Hedera SDK/native services.
- Product state change: HTS NFT booking rights, HCS lifecycle audit, Schedule Service proof, Mirror verification.
- Verifier: source tree contains no Solidity files; `npm run ethglobal:preflight`.

## Not claimed

- OpenClaw ACP is not integrated.
- x402 is not integrated.
- A2A, UCP, and HCS-14 agent identity are not integrated.
- Wallet-funded user budgets are not integrated.
- Calendar conflict detection is not integrated.
- This is not a fully autonomous LLM agent. It is a bounded, policy-gated Concierge with human approval before value movement.

## Next proof step

The best next upgrade is not more copy. It is either:

1. Add a real Agent Kit runtime adapter around the existing manifest tools, or
2. Add HCS-14 style agent identity/provenance to the receipts, or
3. Add wallet-funded budget allowance for one approved booking action.

Only claim these after they are wired and verified.
