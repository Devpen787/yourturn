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

### 2026-09-10 00:06 Europe/Zurich — Hedera H0 proof-runner security hardening
- Branch/SHA: `feature/ethonline-hedera`; code checkpoint `35c1960ee3da3da84963d4c529df5a434b224b6c`.
- Mission: repair SEC-HEDERA-001/002 before any H0 testnet evidence is allowed to count.
- Changed: the live lifecycle now proves both the delegated target serial and the negative-test serial are owned by the declared owner before approval; confirms the wrong serial remains owner-held after the expected allowance denial; tracks whether a serial allowance may still be live; and performs best-effort owner revocation in `finally` when a failed/interrupted proof may have left delegated authority active. Cleanup failure is surfaced and cannot be reported as a successful proof.
- Docs reviewed: current ETHOnline 2026 Hedera Continuity wording; current Hedera Agent Kit v4/transaction-mode docs; Hedera allowance deletion/HIP-336 signing docs; approved NFT transfer SDK reference; current Hiero JS SDK NFT-info query surface. Repo versions remain `@hashgraph/hedera-agent-kit ^4.0.0`, `@hashgraph/sdk 2.81.0`, `@hiero-ledger/sdk ^2.81.0`.
- Branch archaeology: REFERENCE baseline `scripts/hedera-usdc-allowance-proof.mjs` for explicit dry-run/execute, actor resolution, owner signing and client cleanup patterns; REJECT that June USDC allowance/x402 path as H0 proof/new work; no pre-ETHOnline serial-scoped NFT delegation lifecycle was found in active-history search.
- Verification actually run: exact code checkpoint push workflow `34410218342` completed SUCCESS: install, production build, baseline Hedera Agent Kit policy/proof check, serial-scoped NFT deterministic check and continuity baseline all passed. No live transaction was submitted.
- Evidence: CI for the hardening; CONFIGURED for pre/post ownership assertions and cleanup behavior until the corrected `--execute` path actually exercises them on testnet. PR #24 now records `Docs reviewed` and `Requirement -> code -> evidence`.
- Failed/open: SEC-HEDERA-001/002 are builder-repaired but remain open until independent Security retest; H0 LIVE/TESTNET evidence is still absent. No human credential/serial blocker is proven yet.
- Claim impact: improves the integrity and operational safety of the eventual H0 testnet proof; does not promote Hedera qualification or any LIVE assertion.
- Exact next action: independent Security retest of SEC-HEDERA-001/002 at `35c1960...`; if accepted, execute the corrected lifecycle against two owner-held BOOKED testnet serials and an associated receiver. Escalate #6 only if that corrected execution proves an exact external credential/serial/association blocker.

### 2026-09-10 01:09 Europe/Zurich — Hedera H0 uncertain-submit cleanup repair
- Branch/SHA: `feature/ethonline-hedera`; code checkpoint `b20a5de7640fd7b2eaaefb4fb0e6a1c2b8164f1e`.
- Mission: close the remaining SEC-HEDERA-002 submit-vs-receipt uncertainty before any value-changing H0 testnet run.
- Changed: `scripts/hedera-nft-delegation-proof.mjs` now pessimistically marks serial authority as possibly live **before** both owner approval and reapproval submission. If `execute()` reaches Hedera but receipt retrieval/helper return fails, `finally` still enters the owner-signed single-serial cleanup revocation path. Existing cleanup failures remain surfaced through the lifecycle error instead of being reported as success.
- Docs reviewed: current ETHOnline 2026 Hedera Continuity wording; current Hedera/Hiero NFT allowance-deletion/HIP-336 owner-signing semantics; current SDK execute-then-receipt flow; previously pinned current HAK v4/transaction-mode and approved-NFT-transfer references on PR #24. Repo versions remain `@hiero-ledger/sdk ^2.81.0` / `@hashgraph/sdk 2.81.0`.
- Branch archaeology: ADAPT the current ETHOnline H0 runner; REFERENCE the immutable Week-5 USDC allowance proof for explicit signing/execution/cleanup patterns; REJECT all June HAK/x402/USDC allowance evidence as H0/new-work proof because it predates ETHOnline and does not prove serial-scoped NFT authority.
- Verification actually run: exact code checkpoint push workflow `34415435645` completed SUCCESS: install, production build, baseline HAK policy/proof check, serial-scoped NFT deterministic check, and continuity baseline all passed.
- Evidence: CI for the code repair only. No Hedera testnet transaction was submitted. Safe final network authority state remains CONFIGURED until independent Security retests this failure window and the corrected lifecycle runs on testnet.
- Failed/open: SEC-HEDERA-002 is builder-repaired but **not self-closed**; independent Security re-attack is requested in #16. H0 LIVE/TESTNET allowance, wrong-serial denial, revoke, post-revoke denial, permitted spender transfer and Mirror/HashScan evidence remain absent.
- Claim impact: removes the known code-level window where a submitted-but-unreceipted approval could bypass cleanup; it does not promote any LIVE acceptance or sponsor qualification.
- Exact next action: independent Security retest of SEC-HEDERA-002 at `b20a5de...`; only if accepted, execute the exact H0 `--execute` lifecycle and capture tx/Mirror/HashScan evidence. Do not start H1/H2/USDC before that H0 gate is resolved.
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

### 2026-09-10 01:27 Europe/Zurich — World official AgentKit verifier adapter
- Branch/SHA: `feature/ethonline-world`; verified code checkpoint `51bb8040bdffa58b962bcaa598368076600c2003`; documentation/cleanup commits follow this checkpoint.
- Mission: replace the internal-object-only trust boundary with an official AgentKit cryptographic request-verification path, without claiming live AgentBook/Sandbox qualification.
- Changed: pinned official `@worldcoin/agentkit@0.2.1`; added `server-verifier.ts` using official `parseAgentkitHeader` -> `validateAgentkitMessage` -> `verifyAgentkitSignature` -> AgentBook lookup; added an explicit exact full-resource URI check because AgentKit 0.2.1 validation currently compares the signed URI host; reduced the returned AgentBook result to a boolean so the raw anonymous human identifier does not escape; added a Redis-backed nonce store using hashed resource+nonce keys plus atomic `SET NX EX`; fail closed on nonce-store errors; expanded CI tests with real SIWE/EIP-191 signatures, replay, tampered signature, same-host wrong endpoint, unresolved AgentBook, valid-but-wrong agent and missing-header negatives.
- Docs reviewed: current ETHOnline 2026 World AgentKit Continuity qualification; current World `Integrate AgentKit` and `SDK Reference`; official `worldcoin/agentkit` 0.2.1 parser/validator/signature/AgentBook source; current AgentBook registration guide; current Sandbox access/semantics docs. Current online integration docs say default registration is World Chain and lookup always World Chain, while the repository's current `cli/REGISTRATION.md` text describes Base as the default automatic registration path; treat that docs/repo discrepancy as unresolved until the live Sandbox/AgentBook proof uses one confirmed canonical path.
- Branch archaeology: immutable pre-event branch = REUSE as before-state truth; no pre-event World AgentKit integration found; `main` + `feat/product-issuer-holder-ux` = REFERENCE only because this increment touches no auth/session/account or user-facing UX seam.
- Verification actually run: continuity run `34416821760` SUCCESS on `51bb804...`: dependency install, production build, inherited Hedera check, expanded World AgentKit contract check, and continuity baseline guard all passed. The first expanded-test runs correctly failed on a SIWE-invalid non-alphanumeric test nonce; the diagnostic identified the exact issue and the final test uses protocol-valid alphanumeric nonces.
- Evidence: CI only. Cryptographic EIP-191/SIWE request signing and official AgentKit verification are exercised with the installed SDK. AgentBook resolution in deterministic CI is intentionally injected/mocked; the production adapter defaults to official `createAgentBookVerifier()`, but no live AgentBook registration/lookup or World ID Sandbox flow has yet been proven. The Redis nonce implementation is code/CI evidence, not deployed persistence evidence.
- Failed/open: SEC-WORLD-003 should remain OPEN pending independent security retest plus live AgentBook/Sandbox evidence. World-backed recovery write behavior is not wired; required feedback is incomplete; no live human-level counters are claimed.
- Claim impact: official AgentKit requester cryptography moves from RED/unimplemented to CI-proven groundwork. World sponsor qualification remains RED/YELLOW because AgentBook + Sandbox + load-bearing app integration are still absent.
- Exact next action: register/resolve one dedicated test agent through the canonical World AgentBook path using the World ID Sandbox App, capture reproducible live evidence, and independently retest SEC-WORLD-003 before wiring the World result into recovery execution.
