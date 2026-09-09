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

## Sponsor entries

### 2026-09-09 22:52 Europe/Zurich — Ledger first worker cycle
- Branch/SHA: `feature/ethonline-ledger`; initial Ledger decision commit `7b296c06c4235194b4cfcb33e7bc5d02d87a3fe2`, branched from green foundation head `168448587d569e220b56a751827cde6bb41507ee`.
- Mission: unblock the shared foundation gate first, then select an honest Ledger path that changes the Recovery Mandate authority boundary without claiming Hedera transaction signing.
- Changed: foundation CI moved from Node 20 to Node 22 to execute the existing erasable TypeScript imports; a concurrent foundation repair supplied deterministic non-secret allowance identities. Ledger branch now records the selected DMK Ethereum Signer / EIP-712 off-chain Recovery Mandate path and its claim boundary in `docs/ethonline-2026/ledger/DEVICE_MANDATE_SPIKE.md`.
- Verification actually run: foundation GitHub Actions run `34403433122` completed GREEN: install, production build, Hedera Agent Kit policy/proof check, and baseline check all passed. Official Ledger 2026 docs were checked for current Continuity and DMK signer support.
- Evidence: CI run `34403433122`; official Ledger ETHOnline Continuity page and Ethereum Signer Kit documentation. This is CI + RESEARCH evidence only; no Ledger device signature has been produced.
- Failed/open: physical Ledger approve/reject proof is not yet available. The existing server-secret approval grant remains the baseline authorization seam; no product runtime has been changed by this Ledger cycle.
- Claim impact: supported Ledger integration path selected with an explicit boundary: Ledger will sign an off-chain YourTurn mandate, not a Hedera HTS transaction. Sponsor qualification remains YELLOW until implementation, negative-case tests, and real device evidence exist.
- Exact next action: implement the canonical RecoveryMandate schema + EIP-712 builder/verifier with expiry and nonce/replay rejection on `feature/ethonline-ledger`; mark fixture evidence SIMULATED/LOCAL until the same payload is approved/rejected on a physical Ledger via DMK.
