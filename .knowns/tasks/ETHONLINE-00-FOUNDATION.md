# ETHONLINE-00 — Foundation

## Objective

Prepare a clean Continuity execution surface before sponsor implementation.

## In scope

- freeze baseline SHA and old/new claims;
- repo-local agent instructions;
- acceptance contract;
- hourly handoff/progress log;
- CI/build gate;
- Hedera Harness feasibility/doctor setup;
- sponsor mission files;
- branch/worktree conventions.

## Out of scope

- sponsor production code;
- UX redesign;
- mainnet deployment.

## Done when

- [ ] `docs/ethonline-2026/*` exists and is internally consistent;
- [ ] `AGENTS.md` routes ETHOnline workers to repo-local instructions;
- [ ] CI runs deterministic build/agent checks on ETHOnline branches/PRs;
- [ ] Hedera Harness adoption decision is recorded (working or precise blocker);
- [ ] sponsor implementation branches can start without editing the same foundation files.

## Handoff

Update `docs/ethonline-2026/progress.md`; do not mark sponsor acceptance items true here.
