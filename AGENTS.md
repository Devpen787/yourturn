# Booked Rights Repo Instructions

This file governs the entire repository rooted at `/Users/devinsonpena/yourturn`.

## Repo purpose

- This is the real Booked Rights hack repo only.
- Keep it strictly focused on this project.
- Do not import unrelated prep notes or old idea archives.
- Use the repo-local docs here as the live source of truth.

## Read order

Before making material changes, read these files in order:

1. `README.md`
2. `docs/SPEC.md`
3. `docs/DECISIONS.md`
4. `docs/TASKS.md`
5. `docs/ARCHITECTURE.md`
6. `docs/DEMO.md`
7. `docs/TX-LOG.md`

## Current locked direction

- Primary target track: Hedera `No Solidity Allowed`
- Minimum honest technical fit: `HTS + Mirror Node`
- `HCS` only if it clearly improves the demo
- Hero customer: SMB services and classes like yoga studios, physical therapy, and handstand or movement coaching
- Core product: booked service slots become transferable rights under issuer rules
- Issuer earns royalty on secondary resale, including premium resale
- Issuer controls resale, transfer or gifting, forwarding count, rebook window, and expiry or lock deadline
- Agent is a schedule-and-budget helper for booking, resale, and rebooking, with no autonomous signing

## Current build priority

- Must-ship flows: `F1` primary booking, `F2` transfer or resale with royalty, `F4` mark used
- Strong next layer: `F3` freeze or unfreeze and `F7` cancel or refund
- Rebook is important but not currently in the minimum must-ship slice

## Build workflow

- `main` only receives coherent slices
- local commits can be frequent
- push when a slice is reviewable or needed for backup
- open draft PRs early when context sharing helps
- merge deliberately
- coordinate before editing shared glue files:
  - `README.md`
  - `.env.example`
  - `src/adapters/booking-port.ts`
  - lockfile

## Ownership split

### Chain side

- `src/domain/`
- `src/hedera/`
- `src/lib/mirror-client.ts`
- `server/`
- `scripts/`

### Product side

- `src/app/`
- `src/features/guest/`
- `src/features/issuer/`
- `src/hooks/`
- styling and UX states

### Shared

- `src/adapters/booking-port.ts`
- env docs
- top-level `README.md`
- first real primary booking transaction flow

## External repos and helpers

Prefer these as implementation references when relevant:

- `https://github.com/hedera-dev/hedera-skills`
- `https://github.com/hedera-dev/hedera-code-snippets`
- `https://github.com/hiero-ledger/hiero-sdk-js`

Use WalletConnect or HashConnect only if wallet integration is actually in scope.

## Agent implementation guardrails

- No autonomous signing
- Agent only proposes, previews, and helps compare booking options
- Agent can use calendar context, booking budget, and desired session count
- Agent can help with booking, rebooking, resale, or transfer
- All value-moving actions require explicit human approval

## Working protocol

- For any non-trivial strategy, review, architecture, or implementation task, start with a short `discovery_plan` before doing broad work.
- Separate conclusions into explicit `FACTS`, `INFERENCES`, and `ASSUMPTIONS`.
- Treat `FACTS` as observed repo state, code behavior, command output, or user-provided source material.
- Treat `INFERENCES` as conclusions drawn from facts rather than direct observations.
- Treat `ASSUMPTIONS` as uncertain inputs, defaults, or unresolved points that could change the recommendation.
- Be explicit when a recommendation depends on assumptions rather than facts.
- Prefer narrowing decisions over expanding possibilities.
- End meaningful analysis with a concrete next move, decision, or implementation step rather than stopping at exploration.

## Decision discipline

- If a product, scope, or implementation boundary changes, update the relevant repo-local docs in the read order above rather than leaving the change only in chat.
- Use `docs/DECISIONS.md` for short dated decisions.
- Use `docs/TASKS.md` for current execution order and explicit deferrals.
- When discussing future work, classify each item as one of:
  - active now
  - strong next layer
  - explicitly deferred
  - rejected for this build
- If a decision is being made, note what would need to change for that decision to be revisited.

## Process guardrails

- Keep hackathon scope pressure visible: default to the current must-ship flows unless a change clearly improves the locked demo.
- Prefer one clear proof-bearing slice over multiple half-finished tracks.
- Do not let agent, wallet, auth, or data-layer complexity outrun one real Hedera-backed booking flow.
- When a thread starts to branch, pull it back to:
  - what is the current locked build target
  - what proof does this add
  - what current task or decision doc should change

## Thread checks

- Decision check:
  - what changed
  - what stayed locked
  - what is explicitly deferred
- Proof check:
  - what proof does this add to the demo, product, or implementation confidence
- Drift check:
  - is this helping the current must-ship flow, or is this a side quest

## Documentation rule

If you change product direction, scope, or implementation boundaries, update the relevant repo-local docs in the read order above instead of leaving the change only in chat.
