# Booked Rights Repo Instructions

This file governs the entire **Booked Rights** repository (clone root on your machine).

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
7. `docs/UI-MAP.md` — route / component / API index and flow diagram; **keep in sync** when pages or browser-invoked APIs change (see “After you finish a slice”)
8. `docs/UI-RULES.md` — lightweight product/UI defaults; use as guidance, not a rigid constraint system
9. `docs/TX-LOG.md`
10. `docs/REVIEW-CHECKLIST.md` — **single master checklist** for product, flows, progressive disclosure, gaps, and demo/submission review (optional pass before ship)
11. `docs/SCORECARD.md` — dated **1–5** health snapshot; re-score after `TX-LOG` proof or major scope/UX changes (optional)

---

## Parallel collaboration (humans + AI agents)

**Goal:** Sebastian and the product partner always see **who owns what** and **what is next**, without editing the same files blindly.

### Before you start a slice

1. **Open or claim one GitHub issue** per slice (titles like `Improve issuer freeze UX`, `Log F2 testnet proof in TX-LOG.md`). Use `ISSUES-SEED.md` for ideas.
2. **Comment on that issue** using this template (edit as you go):

```md
Owner: <name>
Branch: <branch-name>
Status: TODO | RESERVED | IN_PROGRESS | BLOCKED | READY_REVIEW | DONE
Files: <paths — be specific>
Blocked by: <issue # or none>
Last updated: <ISO date>
```

3. **Stay inside your track’s paths** (see [Ownership split](#ownership-split-working-agreement) below). If you must touch **shared** files, say so in the issue and wait for a quick OK or do it in a paired PR.

### After you finish a slice

- Set issue **Status: DONE** (or **READY_REVIEW** if PR open).
- Update checkboxes in **`docs/TASKS.md`**.
- If the slice added or changed **routes**, **`*Client.tsx` actions**, or **`app/api/*` used from the browser**, update **`docs/UI-MAP.md`** in the same PR (and **`docs/DEMO.md`** if the shipped happy path changed). Say so in the PR description (`Updated docs/UI-MAP.md` or why N/A).
- Update the **[Rolling: what to do next](#rolling-what-to-do-next)** table below (remove done rows, add new ones). If you cannot edit `AGENTS.md`, put “Update AGENTS rolling table” in your PR description for the other person.

### Rolling: what to do next

| Track | Owner (default) | Next concrete work | Typical paths | Notes |
|-------|-----------------|-------------------|---------------|--------|
| **Chain** | Sebastian | Investigate why slot detail can still show **no HCS events** even when lifecycle messages exist in Mirror | `lib/hedera/*`, `app/slots/[serial]/page.tsx` | Nice-to-have proof polish; do not destabilize core flow |
| **Chain** | Sebastian | Optional: small **API response** improvements if product needs them (e.g. return tx ids on freeze / unfreeze / mark-used) | `app/api/*` | Coordinate if it changes contracts |
| **Chain** | Sebastian | **BookingPort** + typed boundary (RFC or `lib/adapters/booking-port.ts`) | `lib/`, `docs/DECISIONS.md` | **Shared** — agree interface in an issue before coding |
| **Product** | Partner | **Issuer / freeze UX:** show **current Mirror holder** for the serial (and match `holderActor` dropdown or auto-select) to avoid 409s | `app/issuer/*` | API now validates `holderActor` vs Mirror |
| **Product** | Partner | **Holder & status clarity:** `/slots/[serial]`, `/my-bookings` — labels for AVAILABLE / HELD / FROZEN / USED, copy that matches chain | `app/slots/*`, `app/my-bookings/*`, `components/*` | No wallet scope |
| **Product** | Partner | Final **plain-English v1 polish** across browse, pass hub, resale, and provider screens | `app/*`, `components/*` | Avoid chain jargon and operator phrasing on customer paths |
| **Product** | Partner | Keep `docs/DEMO.md`, `docs/REVIEW-CHECKLIST.md`, and persona copy aligned with the shipped UI language | `docs/DEMO.md`, `docs/REVIEW-CHECKLIST.md`, `docs/PERSONAS-EXPECTATIONS.md` | Product-facing docs should read like the app |
| **Shared** | Either (schedule) | Fill the **submission package**: Vercel URL, final assets, prize selections, and review bundle | `README.md`, `docs/SUBMISSION.md`, `docs/TX-LOG.md` | One PR or paired commit |
| **Shared** | Either (schedule) | Keep **`docs/DEMO.md`** + **`docs/UI-MAP.md`** aligned with shipped UI (happy path + route/API table) | `docs/DEMO.md`, `docs/UI-MAP.md` | Update `UI-MAP` in the same PR as route or client API changes |

**Intentionally parallel:** Chain can run testnet proofs and BookingPort design while Product improves issuer/slots/resale UX — **no file overlap** if shared docs are coordinated via issues.

---

## Current locked direction

- Primary target track: Hedera `No Solidity Allowed`
- Minimum honest technical fit: `HTS + Mirror Node`
- **`HCS` is in use** in the merged Next.js MVP for lifecycle audit messages on one topic (`docs/booked-rights-build-spec.txt`); keep narrative emphasis on HTS + Mirror for track alignment
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
  - `package.json` / lockfile
  - future `BookingPort` adapter (planned; not yet in tree — see `docs/TASKS.md`)

## Code layout today (merged MVP)

Next.js App Router lives under `app/`; Hedera + Mirror + domain under `lib/` (not the older `src/` layout in some docs).

| Area | Paths |
|------|--------|
| API / pages | `app/api/*`, `app/*/page.tsx`, `components/` |
| UI / flow registry (living) | `docs/UI-MAP.md` (with `docs/DEMO.md` for walkthrough steps) |
| Stakeholder expectations | `docs/PERSONAS-EXPECTATIONS.md` — update when a persona gains/loses a capability |
| Market vocabulary | `docs/MARKET-VOCABULARY.md` — Web2 parallels (Calendly, ClassPass, tickets, Wallet pass) vs product copy |
| Page-level UI audit | `docs/PAGE-OVERVIEW.md` — purpose, controls, copy, clarity, status per route; update when buttons/copy change |
| Master review checklist | `docs/REVIEW-CHECKLIST.md` — consolidate checklist for reviews / demos; keep aligned with `UI-MAP` + `DEMO` |
| Scorecard (dated) | `docs/SCORECARD.md` — high-level 1–5 scores; **re-score** after TX-LOG proof, major UX, or deploy hardening |
| Chain + Mirror | `lib/hedera/*`, `lib/server/slotChain.ts` |
| Domain (pure) | `lib/domain/*`, `lib/types/*` |
| App state (Redis) | `lib/store/*` |
| Validation | `lib/validation/api.ts` |

## Ownership split (working agreement)

### Chain track

- `lib/hedera/`, `lib/server/`, `lib/store/` (persistence keys), Hedera-related `app/api/*`

### Product track

- `app/` UI routes, `components/`, copy and layout

### Shared (coordinate)

- `lib/domain/*` (types, fees, status), future **`BookingPort`** surface and adapters
- env docs, `README.md`, primary booking / resale transaction contracts

### Aspirational layout in `docs/ARCHITECTURE.md`

The `src/domain`, `src/adapters/booking-port.ts` structure describes the **target** factoring after `BookingPort` extraction — not the current tree.

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

**Agents and contributors:** treat **`docs/UI-MAP.md`** as the canonical map from screens to APIs and spec flows (`F1`–`F7`). After material UI or client-visible API changes, read it and update it so flow review and “what’s missing?” checks stay trustworthy — without duplicating this in `README.md`.
