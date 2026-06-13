# Build guardrails

Status: active before implementation waves.
Date: 2026-06-13.

This file is the drift-control surface for the ETHGlobal NYC 2026 YourTurn build.

## Imported Prior Patterns

This is not a new operating model. It imports the repo discipline already used in AutoBots, AgentOps, and ChopDot:

- keep one compact mission-control surface with current state, next actions, locked decisions, and explicit facts/inferences/assumptions
- use a compact repo-first read order before planning or summarizing
- treat gates as real only when failure stops the pass
- keep active execution queues separate from long-horizon strategy documents
- require fresh browser evidence for frontstage UI changes, not only mechanical build checks

Atlas can help recover browser/session context when the source of truth is an Atlas tab or browser trail. For repo drift, the durable controls are this packet, memory hydration, and coded preflight.

## Thread Hydration Contract

Before a new thread plans or builds for this hackathon lane, it must read this compact set first:

1. `AGENTS.md`
2. `PROJECT_DIRECTIVES.md`
3. `docs/ethglobal-nyc-2026/README.md`
4. `docs/ethglobal-nyc-2026/BUILD-GUARDRAILS.md`
5. `docs/ethglobal-nyc-2026/IMPLEMENTATION-PLAN.md`
6. `docs/ethglobal-nyc-2026/DOCTRINE.md`
7. `docs/ethglobal-nyc-2026/TECHNICAL-BLUEPRINT.md`
8. `docs/ethglobal-nyc-2026/YOURTURN-PREMIUM-UX-DELTA-REPORT.md`
9. `docs/UI-MAP.md`
10. `docs/DEMO.md`

Then run:

```bash
npm run ethglobal:preflight
```

If memory is available, search for `YourTurn ETHGlobal continuity`, `AgentOps drift`, and `ChopDot Atlas` before making architecture claims.

## Mission Control

Active execution belongs in:

- `IMPLEMENTATION-PLAN.md` for waves, routes, files, and verification gates
- `BUILD-GUARDRAILS.md` for drift controls and stop conditions
- `UNKNOWN-QUESTIONS.md` for unresolved assumptions

Long-horizon strategy, competitor notes, and submission packaging stay in their dedicated packet files. Do not bury the next action inside broad strategy notes.

## Required Response Structure

For non-trivial build turns, use:

1. Discovery
2. Facts
3. Inferences
4. Decisions
5. Next Steps

Short tactical updates can stay concise, but the final closeout for a build slice must include:

- Decision Check
- Proof Check
- Drift Check

## Active Goal

Ship a polished continuity-track demo where:

1. Owner sets booking inventory and policy.
2. Booker discovers and books a tokenized slot.
3. Booker cannot attend.
4. Concierge recommends a policy-valid recovery action.
5. Booker approves.
6. Hedera records or executes the lifecycle action.
7. UI shows a recovery receipt and proof.

## Drift Boundaries

Stop and reassess if a proposed change:

- does not improve `/slots`, `/slots/[serial]`, `/my-bookings`, `/resale/[serial]`, `/issuer`, agent APIs, or proof docs
- adds a new sponsor before the Hedera proof loop works
- adds wallet/payment/Telegram before the in-app recovery loop works
- says "refund" without a real value-return transaction
- claims Automation without a real Schedule Service schedule id and execution proof
- claims Agentic Payments without an agent trace and Hedera operation
- exposes HashScan/HCS/Mirror details as primary consumer copy
- changes route/API behavior without updating `docs/UI-MAP.md` and `docs/DEMO.md`
- adds Solidity or EVM contracts

## Build Slice Gate

Before editing code, state:

- current wave
- route(s) touched
- files likely touched
- user-visible outcome
- proof artifact expected
- verification commands
- docs that must update

## Closeout Gate

Every build slice must answer:

### Decision Check

- What changed?
- What stayed locked?
- What is explicitly deferred?

### Proof Check

- What test/build/browser evidence was produced?
- What screenshots, receipts, tx ids, or HCS events were produced?
- Which proof is live, artifact, configured, or roadmap?

### Drift Check

- Does this advance the anchor demo?
- Does it preserve owner policy, human approval, and Hedera proof?
- Did it avoid new side quests?

## Coded Preflight

Run before a build wave:

```bash
npm run ethglobal:preflight
```

This checks that the ETHGlobal packet, doctrine, technical blueprint, bounty rules, implementation plan, and no-Solidity boundary are present.

If this command fails, stop the pass, report the failing guardrail, and fix the guardrail or the implementation before continuing. Do not explain past a failed gate.

Run before claiming a slice is done:

```bash
npm run ethglobal:preflight
npx tsc --noEmit
npm run build
```

For UI changes, also run a browser screenshot pass on changed routes.

## First Build Wave Guardrail

Do not start with Telegram, wallet connect, Schedule Service, or new payment integrations.

Start with:

1. Fix `/my-bookings` runtime error.
2. Preserve existing booking/resale/Hedera behavior.
3. Move premium UX from `/brand-lab` into shipped routes.
4. Verify desktop and mobile screenshots.
