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

### 2026-09-09 22:50 Europe/Zurich — Hedera kickoff / foundation unblock
- Branch/SHA: `feature/ethonline-2026-foundation`; Node 22 repair `6162ac42...`; deterministic allowance-fixture repair `16844858...`; this handoff commit follows those changes.
- Mission: clear the red foundation gate before any Hedera sponsor branch starts.
- Changed: CI now uses Node 22 so the baseline checker can import erasable TypeScript; the Hedera Agent Kit check also receives explicit non-secret fixture owner/spender account IDs because CI has no demo-account secrets. No allowance tx id is injected, so the allowance remains `configured`, not live.
- Verification actually run: GitHub Actions run `34403437622` completed successfully: install, production build, `npm run hedera:agent-check`, and baseline-document checks all passed.
- Evidence: CI run `34403437622`; previous Node 22 run `34403136279` reached the policy checker and exposed the missing owner/spender fixture rather than a runtime/import failure.
- Failed/open: no Hedera ETHOnline sponsor acceptance item is green yet; no serial-scoped allowance, revoke, transfer, USDC recovery, or testnet claim was executed in this increment.
- Claim impact: foundation gate only. This is CI evidence, not LIVE/TESTNET Hedera evidence.
- Exact next action: create `feature/ethonline-hedera` from the latest reviewed foundation head and implement PRD 01 serial-scoped NFT allowance/revocation with real Hedera testnet evidence.

## World entries

### 2026-09-09 22:56 Europe/Zurich — World worker 01
- Branch/SHA: `feature/ethonline-world` @ `5b27ec45c9b2405f3f468e33d2cd20ab6fe3e7b7`; draft PR #22.
- Mission: define a fail-closed World human-backed-agent trust boundary without changing Hedera booking/settlement semantics.
- Changed: added `lib/world-agentkit/trust-boundary.ts`, deterministic contract checks, CI coverage, and current AgentKit qualification/integration contract docs.
- Verification actually run: GitHub Actions run `34403769815` passed install, production build, inherited Hedera policy/proof check, `npm run world:contract-check`, and continuity-baseline checks.
- Evidence: CI proves the normalized post-verification gate blocks spoofed source, non-human-backed, AgentBook-unresolved, wrong-resource, expired and invalid-time evidence; public summary omits agent address and raw `humanId`.
- Failed/open: no official `@worldcoin/agentkit` runtime integration yet; no live request validation, AgentBook resolution, Sandbox proof, or feedback artifact. These remain RED.
- Claim impact: CI-green groundwork only. It narrows the trust boundary and privacy rules but is not sponsor qualification evidence by itself.
- Exact next action: implement the official low-level verifier adapter after branch/security gates are clean.

### 2026-09-09 23:16 Europe/Zurich — World security repair
- Branch/SHA: `feature/ethonline-world` @ `f41eaafcac6eabe68fafb8cd9e5eb84664c1d88b`.
- Mission: repair SEC-WORLD-001/002 before any World-backed recovery write path.
- Changed: exact equality between the World-verified requester and the independently resolved delegated agent; EVM-address validation/canonicalization; 30-second maximum future clock skew; negative fixtures for wrong/malformed agent and future timestamps; public summary remains privacy-minimized.
- Verification actually run: exact-head continuity run `34405732527` SUCCESS.
- Evidence: CI/contract only. Independent Security Attacker subsequently closed SEC-WORLD-001/002 at contract level.
- Failed/open: SEC-WORLD-003 remains OPEN; no official AgentKit cryptographic verification, live AgentBook resolution, World Sandbox evidence, sponsor feedback document, or live recovery write-path proof exists.
- Claim impact: hardened groundwork, not World qualification.
- Exact next action: realign the branch to frozen foundation `89ded956...`; then add the official `@worldcoin/agentkit` verifier/AgentBook adapter as a separate bounded increment.

### 2026-09-10 00:17 Europe/Zurich — World branch-hygiene repair
- Branch/SHA: `feature/ethonline-world` code checkpoint `4e96bb713761be6239ffc6d76494b08ad97010a9`; this handoff commit follows that checkpoint.
- Mission: clear the existing branch divergence / non-mergeable PR gate before adding another World primitive.
- Changed: rebuilt the exact World trust-boundary increment directly on frozen foundation `89ded956e67c343b7abefc36e33044c6064a7798`, preserving the security-fixed code, contract tests, CI hook and integration contract while taking the frozen foundation as the sole parent. PR #22 is now mergeable; compare is 1 ahead / 0 behind before this handoff-doc commit. No product/runtime authority behavior was expanded.
- Docs reviewed: current ETHOnline 2026 World AgentKit Continuity wording; current AgentKit integration guide + SDK reference; AgentBook registration/resolution path; World ID Sandbox semantics/access docs; official `worldcoin/agentkit` repository confirms current `@worldcoin/agentkit` and `@worldcoin/agentkit-core` package version `0.2.1`.
- Branch archaeology: immutable `codex/ethglobal-final-public@d0b5f875...` = REUSE as before-state truth; `main` + `feat/product-issuer-holder-ux` = REFERENCE only for this increment because no auth/session/customer UX seam changed; no pre-event World AgentKit integration was found to reuse.
- Verification actually run: GitHub Actions run `34411211754` SUCCESS on `4e96bb...`: install, production build, inherited Hedera Agent Kit check, `npm run world:contract-check`, and continuity-baseline guard all passed. PR #22 became mergeable after realignment.
- Evidence: CI + repository topology only. This proves branch compatibility and preserves deterministic World contract behavior; it does **not** prove AgentKit cryptography, AgentBook, Sandbox or a World-backed recovery write.
- Failed/open: SEC-WORLD-003 remains open. `@worldcoin/agentkit` is not yet installed in YourTurn; official request/signature verification, live AgentBook resolution, Sandbox remote proof, feedback document and World-gated recovery behavior remain RED.
- Claim impact: branch-hygiene blocker is cleared; World sponsor qualification remains RED.
- Exact next action: one separate bounded increment installing official `@worldcoin/agentkit@0.2.1` and implementing the low-level server verifier adapter (`parseAgentkitHeader` -> validation incl. nonce hook -> signature verification -> AgentBook lookup -> privacy-minimized `WorldAgentVerification`) with deterministic tamper/resource/unresolved/replay negatives. Do not wire Hedera settlement until that adapter is green and independently attacked.
