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

### 2026-09-12 — Hedera semantic successor / isolated CI qualification
- Branch/SHA: `feature/ethonline-hedera-semantic-qual`, directly based on historical `411f703e164cac82b5498c1f25a2cf21af7bc4be`; exact candidate commit and compare posted to Security #16. Tested source hashes are in `evidence/hedera-semantic-successor-local.json`.
- Mission: implement D-008/D-009 under explicit human assignment without integrating other sponsor/product branches or disturbing historical LIVE/TESTNET evidence.
- Changed: active signed holder minimum plus independent provider floor; explicit agent/economic-source/receiver/recipient/fee-payer roles; native exact-transfer Bob preauthorization with current server-resolved account key; signed quote/operation/expiry memo commitment; persistent atomic operation/commitment/nonce reservation; raw legacy settlement and legacy live runner fail closed. RETURN_BYTES output stays unsigned with Bob's existing detached authorization separate. Requires current serial allowance and empty immutable token fee schedules for exact net economics.
- Verification actually run: isolated `npm ci --legacy-peer-deps --no-audit --no-fund`; production build; standalone `tsc --noEmit --incremental false` after build; Hedera agent, NFT delegation, HAK RETURN_BYTES, booking policy/provider-state, and 77 focused semantic cases. All final commands passed. One concurrently launched tsc encountered disappearing generated `.next/types` files; its sequential post-build rerun passed without code changes. Receipt preserves that failed attempt.
- Evidence: `docs/ethonline-2026/sponsors/HEDERA_SEMANTIC_SUCCESSOR.md` and `docs/ethonline-2026/evidence/hedera-semantic-successor-local.json`. Installed HAK 4.0.0 / SDK 2.81.0 graph and lock blob `f081d58c280485057e47cf6bcdc458157711786b` preserved. Fixture signatures use public test keys and expired 2023 transaction IDs only.
- Failed/open: independent Security review; actual Redis-service execution of Lua; authoritative production resolver/device ceremony/external signer; current network state and live settlement qualification. Candidate is limited to Bob self-funding with one native account key, agent as allowance-spender/fee payer, one node and a 30–120-second exact authorization. No live signing, submission, funding, World/Ledger/Product/Goldens changes, merge, or production deploy.
- Claim impact: CI/LOCAL semantic successor only. Historical `411f703e…` qualification remains exact historical evidence. No acceptance flag or sponsor/security qualification was self-promoted.
- Exact next action: independent Security re-attack of the posted exact SHA, diff, signature binding, minimum/provider policy intersection, replay state, and unchanged dependency graph. Do not integrate or execute live until separately selected/authorized.

### 2026-09-12 — isolated Redis runtime qualification
- Branch/base: `feature/ethonline-hedera-redis-runtime-qual`, from `38a162f0758d4306d750ef7f893b297dacae48f6`.
- Mission: close the unexecuted real Redis EVAL boundary without changing cleared semantic helpers.
- Changed: credential-free hosted Redis service, minimal loopback Upstash wire transport and default-adapter adversarial runtime harness; no product/sponsor runtime change.
- Verification actually run before publication: locked local install; script syntax and diff checks. Runtime execution is delegated to the exact-head hosted workflow; no local Redis executable is installed. Existing semantic matrix runs separately.
- Evidence: workflow uploads JSON assertion record plus SHA256; actual result/run/artifact belongs in #16 after completion.
- Failed/open: hosted Upstash/deployed Redis, authoritative resolver/current-chain, external signer and final integration remain unqualified. This transport is test infrastructure, never a hosted-service claim.
- Claim impact: pending CI/LOCAL real Redis evidence only; no LIVE/testnet/independent clearance.
- Exact next action: execute hosted real Redis matrix, repair only reproduced harness defects, and hand exact source/run/artifact to independent #16 review.

### 2026-09-12 — fresh resolver checks at Hedera RETURN_BYTES boundaries
- Branch/base: `feature/ethonline-hedera-state-recheck-qual` from cleared87938abb; claim #16 5647402799.
- Change: re-resolve authoritative state after asynchronous replay reservation and around serialization/return; permit observation timestamp refresh but reject changed authority/economic facts; re-verify the original native payment authorization. No signer/executor path added.
- Verification actually run: 87 focused semantic checks PASS locally (77 inherited plus10 fresh-resolver cases), TypeScript PASS, empty inherited environment. In-reservation revoke/replacement/provider/holder/allowance/funding/quote/scope changes return no bytes; unavailable resolver also denies. Exact CI plus inherited real Redis pending.
- Limits: trusted resolver itself and external signer recheck remain prerequisites; point-in-time rereads are not a chain lock. Existing exact-net zero-custom-fee policy remains unchanged; owner-configurable royalty support/canonical chain asset not silently selected. No credentials/device/real signing/transactions.
- Next: exact hosted evidence and independent Security review.

### 2026-09-12 — D-010 royalty-aware payment successor
- Branch/base: `feature/ethonline-hedera-royalty-qual` from independently cleared fresh-state `e4e67d91aa4abdcaffd2ca55002546cbae4638dc`; claim #16 5647686417. User authorized two bounded implementation agents; pure royalty/receipt code and root native-payment consumer have separate file ownership.
- Changed: explicit strict v2 native-body economics commitment, complete immutable fee metadata/published policy alignment, seller-net minimum protection, buyer-gross funding/body validation, exact normalized USDC/NFT/memo receipt component, same persistent replay namespace. v1 zero-fee protocol and all inherited assertions retained; no generic raw tool expansion.
- Verification actually run before commit: inherited 87 semantic cases PASS; 75 new pure royalty/receipt cases PASS; 43 new authorization cases PASS; TypeScript PASS. Public deterministic 2023 test keys only, empty inherited environment. Three additional real-Redis v2 cases wired into existing 12-case CI matrix; not locally executed because Redis server is unavailable. Exact hosted install/build/HAK/Redis run and independent review remain required.
- Evidence: local development logs/evidence at base SHA with dirty source are not exact-head proof. Exact qualification artifact will be generated after commit. No dependency change or Product/Golden edit.
- Limits/open: current-chain/provider registry/World-Ledger composition, external signer and real net receipt remain unqualified; no live chain/account selection, transaction or secret/device action. Unsupported custom fee combinations fail closed. D-010 permits provider-selected royalty; 10% is not a cap/floor.
- Exact next action: exact hosted Continuity and extended Redis/royalty qualification; independent Security review before consumer composition/adoption. Product342f46ee was human-approved separately and remains unchanged.

## 2026-09-12 — External signing validation qualification

- Branch/base: `feature/ethonline-hedera-signing-boundary-qual` from independently cleared royalty `47b8f936a3c9cc793b4ecf1de1814a6b4f900515`; claim #16 5647773575. Exact committed head and hosted evidence follow in the GitHub handoff.
- Mission/change: validate exact prepared unsigned bytes before an external signer, and exact returned Bob/executor native signatures before a later caller submits. Re-run current payment/holder policy, executor-key checks and read-only existing Redis tombstones. No signer/submission callback or new ID/reservation is introduced.
- Evidence/verification: 60 focused local synthetic checks and TypeScript PASS; exact hosted workflow adds locked install, inherited 87 semantics/75 royalty/43 authorization and actual Redis. Hosted execution must pass before any CI claim.
- Open/claim limits: validation only; canonical resolver, operation effect fence consumer, actual signing, authenticated full receipt, integration selection and LIVE settlement remain open. Indexed state cannot lock consensus. No credentials/device/funds/production action.
- Exact next action: commit/push dedicated qualification ref, inspect exact CI/artifact, then independent Security review before any consumption. See `HEDERA_EXTERNAL_SIGNING_VALIDATION.md`.

- Hosted follow-up: first exact run `34711369822` reached actual Redis then failed on a missing `paymentCommitmentMemo` test-harness import. Fixed the import without changing runtime source or assertions. That failed run is retained; successor requires a fresh full hosted run. Exact prior Continuity `34711369758` passed.
