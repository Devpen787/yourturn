# Internal working notes (not in git)

Strategy, planning, test-session logs, judge-only appendices, issue seeds, UI audit tables, and similar material stay **out of the committed tree**.

## `docs/internal/` (gitignored)

Create **`docs/internal/`** on your machine and keep files there (for example `ISSUES-SEED.md`, `JUDGES.md`, review checklists, exploratory test notes). Nothing under that path is tracked by git.

## `docs/review-screenshots/` (gitignored)

Optional screenshot passes for internal review; not shipped with the repo.

## Public technical reference

Agent **confirm** result shapes (including HTS transfer vs HCS audit ids) live in **`docs/AGENT-INTEGRATION.md`** (§4 Confirm). That file is for integrators and reviewers who need API-level detail without maintaining a separate private doc.
