# ETHOnline 2026 Build Loop — YourTurn

This loop is deliberately small. It borrows the strongest parts of TrailPassport, ChopDot, Anthropic's long-running-agent guidance, OpenAI's harness engineering approach, and Hedera Harness.

## Operating principle

Humans steer. Agents execute. **The environment decides whether the work passed; the author does not.**

One task = one branch/worktree = one bounded mission.

Repository state, commits, PRs, task files and test evidence are the shared truth. Tool-local memory is not.

## Read order for every worker

1. `AGENTS.md`
2. `docs/ethonline-2026/CONTINUITY_BASELINE.md`
3. `docs/ethonline-2026/MASTER_PLAN.md`
4. `docs/ethonline-2026/ACCEPTANCE.json`
5. the assigned file under `.knowns/tasks/`
6. the assigned sponsor mission under `docs/ethonline-2026/sponsors/`
7. relevant current implementation files only

Do not read the entire repo before starting. Pull context on demand.

## Inner loop

For one increment only:

1. **Gather** — inspect current branch, task state, implementation and latest evidence.
2. **Plan** — state the smallest change that can turn one acceptance item from false to evidence-backed true.
3. **Build** — implement only that increment.
4. **Verify** — deterministic checks first, then UI/onchain checks where required.
5. **Self-critique** — inspect diff, failure modes, truthfulness and security boundary.
6. **Repair** — iterate until deterministic checks pass or a real blocker is proven.
7. **Handoff** — commit, update the task/progress artifact, and leave exact evidence/blockers.

Never continue into a second large increment merely because time remains in the run.

## Independent evaluator gate

The builder does not grade its own sponsor qualification.

A fresh evaluator must attempt to disprove the claim.

Evaluator rules:

- fail on uncertainty;
- distinguish `not tested` from `failed`;
- do not edit acceptance criteria to make work pass;
- cite concrete files, commits, CI runs, testnet txs, screenshots or logs;
- check at least one negative/adversarial case for every authority or value-moving feature;
- if a requirement was already present at the baseline SHA, mark it **baseline**, not ETHOnline work.

Only a separate repair run may respond to evaluator findings.

## UX loop

For user-facing work, the builder must first preserve this product hierarchy:

1. user problem;
2. mandate/decision;
3. agent status;
4. outcome;
5. technical proof.

Do not expose sponsor primitives as the primary UI language.

Before accepting a user-facing increment:

- desktop pass;
- ~390 px mobile pass;
- keyboard/focus pass;
- loading/error/blocked state;
- plain-language copy review;
- visual self-critique: spacing, hierarchy, contrast, wrapping and consistency.

## Security / one-way-door gate

Treat these as one-way or high-risk changes:

- transaction signing/custody model;
- allowance creation/revocation semantics;
- new agent write surface;
- policy bypass paths;
- World/Ledger identity assertions;
- any mainnet deployment;
- secrets or production credentials;
- any change that can move value without a human in the immediate loop.

They require an independent security review before merge.

## Verification tiers

### Tier 0 — static truth

- files and schemas exist;
- no obvious secret material;
- acceptance item points to an implementation path;
- diff is scoped to the task.

### Tier 1 — build truth

Minimum when available:

```bash
npm ci
npm run build
npm run hedera:agent-check
```

Add focused unit/integration tests for every new policy or transaction builder.

### Tier 2 — browser truth

Use Playwright/browser automation for the user journey and negative states. A rendered page is not enough; drive the actual interaction.

### Tier 3 — semantic evaluator

Fresh agent drives the app and grades numbered assertions. Fail if evidence cannot be reached.

### Tier 3.5 — Hedera testnet truth

For new Hedera authority/settlement claims, execute real testnet transactions and independently verify through Mirror Node/HashScan. Prefer Hedera Harness `chainValidation` where practical.

## Hourly continuation contract

Each hourly run must:

1. inspect latest commits/PRs and `progress.md`;
2. check whether a prior run left a failing CI/evaluator result;
3. repair that before starting new scope;
4. otherwise pick the highest-priority unblocked acceptance item;
5. perform one bounded increment;
6. leave a commit or a documented blocker;
7. update `progress.md` with:
   - branch/SHA;
   - what changed;
   - checks run;
   - evidence;
   - open failures;
   - exact next action.

If a run cannot execute code/tests in its environment, it must **not** pretend to have implemented or verified anything. It may review, refine tasks, inspect GitHub/CI, or document a precise blocker.

## Concurrency rules

- Foundation/integration branch is not a shared scratchpad.
- Sponsor implementation branches must remain isolated until independently reviewed.
- Hedera may change shared domain interfaces only through a small foundation PR first.
- World and Ledger must not rewrite the Hedera transaction core.
- Integrator merges only green, non-overlapping work.

Canonical branch pattern:

- `feature/ethonline-2026-foundation`
- `feature/ethonline-hedera`
- `feature/ethonline-world`
- `feature/ethonline-ledger`
- `feature/ethonline-integration`

Do not invent alternate sponsor branch names; this list must remain aligned with `AGENTS.md`, Command Center #2 and Worker Branch Policy #15.

## Forbidden unattended actions

Automated/overnight workers must not:

- merge to the submission/default branch;
- deploy mainnet or production;
- rotate/create real production secrets;
- spend real funds;
- change prize/continuity eligibility claims without source evidence;
- weaken tests/acceptance assertions to make a run pass;
- delete baseline history;
- claim a mocked path as live.

## Morning brief

The orchestrator should summarize only:

- what actually shipped;
- what passed independently;
- what failed;
- what is blocked externally;
- sponsor eligibility impact;
- next three human decisions/actions.

No research-volume reporting. Progress means working product/evidence.
