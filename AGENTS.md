# AGENTS — YourTurn ETHOnline 2026

## ETHOnline mode

When working on any `ethonline-2026` branch, this repository's **repo-local** ETHOnline files are authoritative. Do not depend on `/Users/...` AutoBots files or any other machine-local memory to continue work.

### Mandatory read order

1. `docs/ethonline-2026/CONTINUITY_BASELINE.md`
2. `docs/ethonline-2026/MASTER_PLAN.md`
3. `docs/ethonline-2026/BUILD_LOOP.md`
4. `docs/ethonline-2026/ACCEPTANCE.json`
5. `docs/ethonline-2026/progress.md`
6. your assigned `.knowns/tasks/ETHONLINE-*.md`
7. the relevant sponsor mission under `docs/ethonline-2026/sponsors/`
8. only then pull implementation context on demand

## Prime directives

- Baseline SHA is `d0b5f875afb4f2b29af29bc5972cf1edc404d473`.
- Never claim baseline functionality as ETHOnline work.
- One task = one branch/worktree = one bounded increment.
- Repository state, commits, PRs, acceptance assertions and evidence are shared truth.
- Builders do not mark their own sponsor qualification green; use an independent evaluator.
- Fail on uncertainty. `Not tested` is not `passed`.
- Never weaken acceptance criteria to make implementation pass.
- Never merge/deploy mainnet, rotate production secrets or spend real funds unattended.

## Active task branches

Use task-based names:

- `feature/ethonline-2026-foundation`
- `feature/ethonline-hedera-delegation`
- `feature/ethonline-world-agentkit`
- `feature/ethonline-ledger-approval`
- `feature/ethonline-integration`

Sponsor branches must not rewrite each other's cores. Shared interface changes land through a small foundation change first.

## Minimum verification

Run what the environment supports and report only what actually ran:

```bash
npm ci
npm run build
npm run hedera:agent-check
```

New policy/transaction code requires focused tests. User-facing work requires browser verification. New Hedera authority/settlement claims require real testnet evidence through Mirror/HashScan where feasible.

## Hourly handoff

Every meaningful run appends to `docs/ethonline-2026/progress.md`:

- branch/SHA;
- mission;
- change;
- verification actually run;
- evidence;
- failed/open items;
- claim impact;
- exact next action.

If code/test execution is unavailable, do not pretend work passed. Review, inspect CI, refine the blocker or leave a precise next action.

## Legacy project context

Outside ETHOnline branches, the inherited project directives and historical docs remain useful context. For ETHOnline execution, the repo-local rules above supersede machine-local AutoBots paths.
