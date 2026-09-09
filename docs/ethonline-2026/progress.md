# ETHOnline 2026 Progress Log

This is the handoff surface for hourly/overnight continuation. Keep entries terse, factual and evidence-backed.

## Current state

- Baseline frozen: `d0b5f875afb4f2b29af29bc5972cf1edc404d473`
- Foundation branch: `feature/ethonline-2026-foundation`
- Current phase: Foundation / task harness
- Primary sponsor targets: Hedera Continuity, World AgentKit Continuity, Ledger Continuity
- Product target: YourTurn Delegated Recovery

## Priority order

1. Finish foundation task surface and CI/harness.
2. Hedera spike: serial-scoped NFT allowance + revoke + transfer-with-allowance on testnet.
3. Hedera spike: non-custodial grant path (`RETURN_BYTES` or equivalent proven path).
4. Hedera spike: USDC customer settlement, with atomic USDC+NFT transfer as preferred target.
5. Domain policy + idempotency/replay guard.
6. Hero UX journey.
7. World AgentKit integration.
8. Ledger supported-path spike; kill/replace with Bazantic if blocked.
9. Independent sponsor/security reviews.
10. Integration, demo and submission proof.

## Handoff template

Append one block per meaningful run:

```md
### YYYY-MM-DD HH:MM Europe/Zurich — <worker/run>
- Branch/SHA:
- Mission:
- Changed:
- Verification actually run:
- Evidence:
- Failed/open:
- Claim impact:
- Exact next action:
```

## Foundation entries

### 2026-09-09 — foundation created
- Branch/SHA: `feature/ethonline-2026-foundation` from baseline `d0b5f875...`
- Mission: freeze continuity truth and define execution system.
- Changed: continuity baseline, master plan, build loop and machine-readable acceptance contract.
- Verification actually run: repository history/implementation inspected; no code build is claimed by this documentation-only step.
- Evidence: see `docs/ethonline-2026/`.
- Failed/open: sponsor branches and executable CI/harness still to be created.
- Claim impact: none yet; process only.
- Exact next action: create sponsor task files + CI/harness, then begin Hedera allowance testnet spike.

### 2026-09-09 22:30 Europe/Zurich — foundation CI loop
- Branch/SHA: `feature/ethonline-2026-foundation`; CI observed at `f37f70b...`, install fix at `e7ce959...` and harness alignment at `953fa19...`.
- Mission: make the process self-checking before sponsor code begins.
- Changed: added GitHub Actions continuity gate, repo-local task contracts, Hedera Harness recipe/PRDs, draft foundation PR #1, and an hourly continuation automation.
- Verification actually run: GitHub Actions executed and FAILED at `npm ci` before build. Logs were inspected rather than ignored.
- Evidence: run `34401396032`; npm reported peer conflict: `@hashgraph/hedera-wallet-connect@2.1.3` requires `@hiero-ledger/sdk@2.79.0`, while HAK v4/root use `^2.81.0`.
- Failed/open: no product-code claim is green yet. CI install was changed to `npm ci --legacy-peer-deps` to preserve the June baseline rather than silently modernizing dependencies in a process-only PR. A new CI run must prove this fix.
- Claim impact: none; this is foundation evidence that the loop catches baseline reproducibility problems.
- Exact next action: confirm new CI is green; then branch `feature/ethonline-hedera-delegation` from the reviewed foundation and start PRD 01 allowance/revoke testnet spike.
