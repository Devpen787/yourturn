# AGENTS: Booked Rights (yourturn - Inherited)

This project adopts the **AutoBots Universal Agent Baseline**.

## 1. Global Standards (AutoBots)

As of 2026, all agents entering this repo MUST follow the [PROJECT_DIRECTIVES.md](PROJECT_DIRECTIVES.md) which points to the central `AutoBots` hub for:
- [Thinking & Evidence Protocol](/Users/devinsonpena/Documents/AutoBots/foundation/thinking_protocol.md)
- [Collaboration & Worktree Standards](/Users/devinsonpena/Documents/AutoBots/foundation/collaboration_standards.md)
- [Safety & Rigor Standards](/Users/devinsonpena/Documents/AutoBots/foundation/safety_and_rigor.md)

## 2. local Overlays (Rolling: what to do next)

| Track | Owner (default) | Next concrete work | Typical paths | Notes |
|-------|-----------------|-------------------|---------------|--------|
| **Chain** | Sebastian | Investigate why slot detail can still show **no HCS events** even when lifecycle messages exist in Mirror | `lib/hedera/*`, `app/slots/[serial]/page.tsx` | Nice-to-have proof polish; do not destabilize core flow |
| **Shared** | Either (schedule) | Keep **`docs/DEMO.md`** + **`docs/UI-MAP.md`** aligned with shipped UI (happy path + route/API table) | `docs/DEMO.md`, `docs/UI-MAP.md` | Update `UI-MAP` in same PR as route/API changes |

## 3. Collaboration Protocol (Manual)

- **Issue Claiming**: Open issue -> Comment template (Owner, Branch, Status, Files).
- **Verification**: 
  - `npm run dev`
  - `docs/DEMO.md` and `docs/UI-MAP.md` MUST be in sync before PR merge.
