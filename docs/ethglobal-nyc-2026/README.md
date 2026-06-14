# ETHGlobal NYC 2026 continuity packet

Status: planning packet for the Continuity Track. This is not a final submission form.

Last checked: 2026-06-13.

## Decision

Use this repo as the working continuity base for ETHGlobal New York 2026 unless the team deliberately creates a new public submission repo later.

Working submission frame:

> YourTurn Concierge helps a customer recover value from a booking they cannot use. A Telegram-facing agent reads the booking right, checks provider policy, recommends resale, rebook, or cancel/release, asks for explicit approval, executes one Hedera-backed lifecycle action, and returns proof.

## Packet files

| File | Purpose |
| --- | --- |
| `CONTINUITY-PACKET.md` | Main category, product, proof, old-vs-new, and build-scope brief |
| `DOCTRINE.md` | Plain-English product doctrine, guardrails, waves, and locked language from planning conversation |
| `TECHNICAL-BLUEPRINT.md` | Implementation map: architecture, data model, user flows, proof objects, build waves, and verification gates |
| `PREMIUM-UX-COMPETITOR-RESEARCH.md` | ClassPass/Mindbody research, screenshots, premium UX doctrine, missing layers, and UX build waves |
| `COMPETITOR-JOURNEY-SCREENSHOT-MAP.md` | Full non-mutating competitor journey screenshot map and YourTurn build implications |
| `YOURTURN-PREMIUM-UX-DELTA-REPORT.md` | Live YourTurn screenshot review against ClassPass/Mindbody expectations, findings, and next-wave priorities |
| `IMPLEMENTATION-PLAN.md` | Build sequence, route/file targets, data additions, verification gates, and hackathon claim gates |
| `BUILD-GUARDRAILS.md` | Drift-control rules imported from AutoBots/AgentOps/ChopDot, thread hydration order, required closeout checks, and coded preflight command |
| `HEDERA-BOUNTY-MAP.md` | Hedera prize fit, qualification mapping, and kill conditions |
| `HEDERA-AGENT-KIT-INTEGRATION.md` | Agent identity, tool manifest, policy gates, receipt proof, and local verifier for Hedera Agent Kit alignment |
| `AGENT-AUTOMATION-INTEGRATION-PLAN.md` | Telegram/OpenClaw-inspired concierge plan plus Hedera Schedule Service proof path |
| `CAPABILITY-STATUS.md` | Current tested capabilities, not-yet-shipped claims, and implementation plan for remaining gaps |
| `SUBMISSION-CHECKLIST.md` | Deadline, required artifacts, and final pre-submit proof list |
| `UNKNOWN-QUESTIONS.md` | Items not known or not proven yet |

## Source stack

Repo-local truth:

- `README.md`
- `docs/SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/UI-MAP.md`
- `docs/AGENT-INTEGRATION.md`
- `docs/TX-LOG.md`

ETHGlobal prep truth:

- `/Users/devinsonpena/ETHGlobal/docs/ethglobal-nyc-2026/yourturn-continuity-agent-plan-2026-06-12.md`
- `/Users/devinsonpena/ETHGlobal/docs/ethglobal-nyc-2026/partner-matrix.md`
- `/Users/devinsonpena/ETHGlobal/docs/strategy/idea-certification-pipeline.md`

Live event pages checked:

- https://ethglobal.com/events/newyork2026
- https://ethglobal.com/events/newyork2026/prizes
- https://ethglobal.com/events/newyork2026/prizes/hedera

## Operating rule

Do not enter this as Classic / From Scratch. This repo has substantial pre-existing YourTurn work. The continuity submission must clearly disclose the base work and show a new, event-built feature with commit history, demo proof, and new Hedera testnet artifacts.

Before a new build thread starts, hydrate from `BUILD-GUARDRAILS.md`, then run:

```bash
npm run ethglobal:preflight
```
