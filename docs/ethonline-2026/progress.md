# ETHOnline 2026 Progress Log

This is the handoff surface for hourly/overnight continuation. Keep entries terse, factual and evidence-backed.

## Current state

- Baseline frozen: `d0b5f875afb4f2b29af29bc5972cf1edc404d473`
- Foundation branch: `feature/ethonline-2026-foundation`
- Current phase: Hedera native delegated authority
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

### 2026-09-09 22:50 Europe/Zurich — Hedera kickoff / foundation unblock
- Branch/SHA: `feature/ethonline-2026-foundation`; Node 22 repair `6162ac42...`; deterministic allowance-fixture repair `16844858...`; this handoff commit follows those changes.
- Mission: clear the red foundation gate before any Hedera sponsor branch starts.
- Changed: CI now uses Node 22 so the baseline checker can import erasable TypeScript; the Hedera Agent Kit check also receives explicit non-secret fixture owner/spender account IDs because CI has no demo-account secrets. No allowance tx id is injected, so the allowance remains `configured`, not live.
- Verification actually run: GitHub Actions run `34403437622` completed successfully: install, production build, `npm run hedera:agent-check`, and baseline-document checks all passed.
- Evidence: CI run `34403437622`; previous Node 22 run `34403136279` reached the policy checker and exposed the missing owner/spender fixture rather than a runtime/import failure.
- Failed/open: no Hedera ETHOnline sponsor acceptance item is green yet; no serial-scoped allowance, revoke, transfer, USDC recovery, or testnet claim was executed in this increment.
- Claim impact: foundation gate only. This is CI evidence, not LIVE/TESTNET Hedera evidence.
- Exact next action: create `feature/ethonline-hedera` from the latest reviewed foundation head and implement PRD 01 serial-scoped NFT allowance/revocation with real Hedera testnet evidence.

### 2026-09-09 23:11 Europe/Zurich — Hedera PRD 01 adapter + deterministic gate
- Branch/SHA: `feature/ethonline-hedera`; green code checkpoint `f277d29708b103aa05e94f965165436d501e83f9`.
- Mission: make serial-scoped HTS NFT authority a real reusable code path before attempting value-moving testnet proof.
- Changed: added `lib/hedera/delegated-nft-authority.ts` with single-serial allowance, single-serial revocation and approved-spender transfer builders using `@hiero-ledger/sdk`; added `scripts/hedera-nft-delegation-proof.mjs` with deterministic assertions plus an explicit testnet-only `--execute` lifecycle for wrong-serial, revoke/post-revoke, reapprove and permitted-transfer evidence; wired the proof into branch CI. No `approveTokenNftAllowanceAllSerials`/`approvedForAll` path is exposed.
- Verification actually run: GitHub Actions run `34405117998` completed GREEN at `f277d297...`: install, production build, baseline Agent Kit check, serial-scoped NFT delegation deterministic check, and continuity-baseline check all passed.
- Evidence: CI/LOCAL only — run `34405117998`. The implementation follows current Hiero SDK `approveTokenNftAllowance`, `AccountAllowanceDeleteTransaction.deleteAllTokenNftAllowances`, and `addApprovedNftTransfer` semantics. No Hedera transaction was submitted in this increment.
- Failed/open: `serial_scoped_nft_allowance_created_live`, `wrong_serial_transfer_blocked`, `nft_allowance_revoked_live`, `revoked_transfer_blocked`, and Mirror/HashScan evidence remain FALSE until the `--execute` lifecycle runs against owner-held testnet serials with real actors. No live acceptance boolean is promoted by deterministic CI.
- Claim impact: substantive new ETHOnline implementation exists and is CI-green, but sponsor H0 remains YELLOW because the mandatory LIVE/TESTNET evidence is still missing.
- Exact next action: execute the same lifecycle on Hedera testnet using two owner-held BOOKED serials and an associated receiver; record approve/revoke/permitted-transfer tx IDs plus the two expected `SPENDER_DOES_NOT_HAVE_ALLOWANCE` negative outcomes. If the execution environment lacks the existing testnet credentials/serial state, record that exact external blocker rather than simulating it.
