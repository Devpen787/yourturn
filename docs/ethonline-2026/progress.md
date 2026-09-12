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

### 2026-09-12 — R2 B1–B4 implementation owner
- Branch/SHA: `feature/ethonline-ux-r2-qual`, successor of independently REVIEWABLE R1d `9ebd7a3a41f39b72410281de9e73d637dc0a4b00`; see the containing commit for exact candidate identity.
- Mission: #44 R2 only, authorized by #34 independent review 5644748597; exclusive claim 5644776955.
- Changed: same-booking use/check-in, both Maya receipt entries/return, Studio A Today/attendance, deliberate fulfilment pending/error/retry/result and returns; continuation v2 migrates v1 in place on the first fulfilment action. Historical states remain readable.
- Verification actually run at source preparation: GitHub source/contract/CI inspection only. New model/Chromium suites and explicit tsc gate are wired into the dedicated qualification workflow; results are pending.
- Evidence: exact R2 execution results, original PNG artifact and source identity will be recorded under #44 and routed to #34, never inferred from R1 results.
- Failed/open: R2 qualification not yet executed at this commit; R3/R4 and independent R2 review remain open.
- Claim impact: FIXTURE UX only; no sponsor/backend, historical Golden, default/submission or LIVE claim.
- Exact next action: run hosted qualification on this exact source, repair any new failures within R2, then hand exact source/evidence to #34 and stop.

### 2026-09-12 — R2 qualification repair
- Branch/SHA: `feature/ethonline-ux-r2-qual`; first candidate `4b21d49faf450e657ce8c868b071094dcee19fe7`.
- Mission: retain all existing assertions while qualifying B1–B4.
- Changed: restored the existing XC-01 exact timing sentence on Bob's new check-in destination; new R2 visible-text helper accounts for CSS uppercase; closed provider attendance is labelled closed; reconciliation copy explicitly preserves completed recovery.
- Verification actually run: Continuity 34684011552 SUCCESS; Visual 34684011521 FAILED. Build/tsc, 19 holder + 11 booking + 10 R2 model checks passed; holder/booking navigation passed; unchanged integrity 32/32; R2 24/26 (CSS-case comparison failed at both widths). YT-01–08 passed; XC-01 failed on its retained timing sentence, so later XC segment commands did not run in that step.
- Evidence: first artifact 10294778511, SHA-256 `a0c10748109a9ae8bf1110895b3a479e5d6b1a8ca63573612991af46ad92533f`; original returned-bookings and fulfilment pending/error/result PNGs inspected by builder.
- Failed/open: full qualification must rerun on this repair; first-candidate results are not promoted to exact repaired-source results.
- Claim impact: FIXTURE UX only; no independent acceptance or Golden change.
- Exact next action: run all hosted gates on the repaired source and hand exact source plus original evidence to #34.

### 2026-09-12 — execution lead R3 published-runtime repair
- Branch/base: `feature/ethonline-ux-r3-runtime-qual`, from `b9dec6f8d31c0f5eb6dff01fa83fefdd4543aa80`.
- Mission: resolve independent R3-01/02 without altering historical Golden records or sponsor authority.
- Changed: published settings feed customer/provider session identities, booking Today/rules and check-in timing; actions reread published policy; invalid/unsupported rules fail closed; activity opens shared prepared/current-holder facts. A single fixed Friday fixture clock derives from the existing scenario phase; publishing cannot move it or change the holder mandate.
- Verification actually run before commit: locked install, build, explicit tsc, 40 inherited holder/booking/R2 model cases, R3 provider/runtime checks, Hedera agent check using the CI's public fixture IDs; R3 browser desktop/mobile onward runtime/failed-save/cutoff checks PASS. Full segment/navigation/integrity/R2 local browser runs launched; exact committed-head hosted proof still required.
- Evidence: local screenshots/logs are developmental evidence because their recorded HEAD precedes this commit; do not present them as exact-head proof. Hosted Visual artifact on this successor will bind final review.
- Harness disposition: separate reviewer confirms #34 R3-02 supersedes the old XC-03 primary sale-path expectation. New clicked path asserts prepared Today; old pending/success assertions and PNGs remain explicitly isolated exploratory captures, not purchase provenance. All unrelated assertions and historical Golden files remain intact.
- Failed/open: independent exact-source/original-evidence Product review pending; no R4/R5, sponsor integration or LIVE claim. Initial local Hedera check used incorrect fixture environment names and failed; rerun with exact CI HEDERA_GUEST_A_ID/HEDERA_TREASURY_ID passed.
- Claim impact: R3 repair candidate only. Added requested FINISH_PHASES.md working checklist; phases remain partial/pending until evidence and independent gates close.
- Exact next action: consume exact hosted artifact and independent #34 review; repair findings or advance R4 only after REVIEWABLE.

### 2026-09-12 — R4 connected fixture execution
- Branch/base: `feature/ethonline-ux-r4-qual` from independently REVIEWABLE R3 `6125cbb912a202f5bd6033cdbc43edfe403fc351` (#34 5647312535); claim #44 5647317086.
- Changed: one-seed Maya→Bob→Studio A browser acceptance plus exact CI wiring; working phase list advances A complete/B active. No product runtime, dependency or Golden record changes.
- Verification actually run: local production build PASS. Desktop1440×1000/mobile390×844 connected journeys PASS using actual approval/payment/handoff/attendance/fulfilment controls, duplicate actions, payment storage failure, stale tabs, invalid/published provider policy, interrupted reload/Back/Forward, unknown holder/service result, retry and final receipt. Original local PNGs retained under r4; local evidence is development at base SHA with uncommitted tests, not exact committed CI proof.
- Environment: regular repo Playwright; Browser plugin unavailable. External/non-read requests blocked. One explicit unapproved Maya seed; clock/read/service-response patches only, recorded and validated with all business facts preserved. No destination reseeds, success URL entry or user actor switch.
- Identity/limits: one Friday Yoga booking, payment and fulfilment attempt counters; no claim of a general runtime operation ID or real sponsor execution. Ledger/World/Hedera remain separate.
- Next: exact hosted full inherited+R4 matrix and independent #34 original-evidence review; R5 waits for REVIEWABLE.

### 2026-09-12 — R5 final Product review repairs
- Branch/base: `feature/ethonline-ux-r5-qual`, from independently REVIEWABLE R4 `f44fc1064579df74e743eb96625bb7a562585006` (#34 5647445679); repair claim #44 5647523401 follows independent R5 REVISE #34 5647523299.
- Changed: settlement preserves the effective approved minimum and receipt reads that snapshot; old receipts with no snapshot explicitly say it was not recorded. Product logo returns to each actor's own home. Maya Use booking opens actual same-booking session/use details with explicit unavailable online check-in and no attendance mutation. Shared fixed Friday scenario time enforces mandate expiry in fixture transitions and displays its Saturday date.
- Verification actually run: production build, TypeScript, inherited 40 holder/booking/R2 model checks, R3 runtime check, 12 new R5 model checks and four R5 desktop/mobile approved/cancelled journeys PASS. New checks retain original inherited assertions; all are wired into the exact committed CI matrix. No dependency or historical Golden record change.
- Evidence: local R5 results/PNGs under artifacts/product-workbench/r5 are development evidence at base SHA with dirty runtime. Independent early source check found no blocking issue; final exact-source/full-CI/original-PNG review is still required.
- Limits/open: no rendered past-expiry or sponsor execution claim; no emulator/device/signing action. R5 is not human-approved or Golden-ready. Canonical mapping and Hedera recheck CI pass but separate review was blocked by the platform filter; formal reviews requested, no clearance inferred. Integration selection remains open.
- Claim impact: FIXTURE Product repair candidate only. Working finish checklist updated; 10% remains an owner recommendation, not a system minimum.
- Exact next action: obtain exact full hosted Product/Continuity results and original artifact, route to independent #34 final review, repair findings or present exact human Product approval packet.
