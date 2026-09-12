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

### 2026-09-09 23:26 Europe/Zurich — Ledger mandate contract increment
- Branch/SHA: `feature/ethonline-ledger`; implementation `f1f7a35ad7b9bd250190b6b418bb5aba9c35fe23`, lockfile-alignment repair `86f8a980a5ee17d3e93b5a09c6c289bed08fd614`, TypeScript-target repair `10330634871fb1d28e8c6d9e69524dd93891bbd1`.
- Mission: bind a future Ledger device approval to the exact Recovery Mandate without changing or claiming Hedera transaction-signing semantics.
- Changed: added `lib/ledger/recovery-mandate.ts`, deterministic EIP-712 fixture checker, package script, and Ledger CI step. Domain separation uses Hedera testnet chainId `296` plus a fixed YourTurn mandate salt. Verification binds owner, enrolled signer, agent, booking token/serial, action, minimum recovery, settlement asset, cancellation flag, expiry and nonce; consumed mandate IDs/nonces fail closed.
- Verification actually run: initial CI `34406546208` exposed a package/lock mismatch and was repaired; CI `34406624381` then exposed the repo's pre-ES2020 TypeScript target rejecting bigint literals and was repaired. GitHub Actions run `34406767738` completed GREEN: install, production build, Hedera baseline checker, `npm run ledger:mandate-check`, and continuity baseline guard all passed.
- Evidence: CI + SIMULATED fixture only. The fixture signs with a deterministic ordinary `ethers` wallet; it proves message/schema/verifier behavior and negative cases, not Ledger hardware provenance.
- Failed/open: no physical Ledger DMK approve/reject proof; no runtime authority-gate wiring yet; no evidence yet that rejecting on device prevents an authority mutation. A valid ECDSA signature alone must not be described as proof that a Ledger device produced it.
- Claim impact: exact mandate binding/replay groundwork is now executable and CI-backed, but Ledger sponsor qualification remains RED until real device evidence, runtime integration, and independent adversarial review are complete.
- Exact next action: wire the verified mandate as an optional authorization source at the existing approval-grant boundary without bypassing provider/Hedera policy, then prepare the exact DMK payload needed for a physical approve/reject proof.

### 2026-09-10 00:35 Europe/Zurich — Ledger security gate repair
- Branch/SHA: `feature/ethonline-ledger`; security repair `f4947f6fad70c827708730921cba0850c6f50f7b`, Node-runner repair `c0ee9745223230bd4cf2829d6149444e02b1f5b1`.
- Mission: repair SEC-LEDGER-001/002 before wiring any Ledger mandate into the product authority boundary.
- Changed: split signature verification from authorization; runtime authorization now requires a complete semantic expectation over mandateId/owner/agent/token/serial/action/minimum/asset/expiry/nonce/cancellation/issuedAt plus a mandatory replay store. Added a Redis `SET NX` replay adapter keyed by a hash of mandateId+nonce until expiry and a concurrent double-submit check proving exactly one authorization succeeds.
- Docs reviewed: current Ledger ETHOnline 2026 Continuity (`https://developers.ledger.com/ethonline`); current Ethereum Signer Kit (`https://developers.ledger.com/docs/device-interaction/dmk-ts/references/signers/eth`), including `signTypedData`, observable `DeviceActionState`, `UserInteractionRequired.SignTypedData`, and `cancel`; current LedgerJS -> DMK migration (`https://developers.ledger.com/docs/device-interaction/dmk-ts/integration/migrations/signers/eth/hw_app_eth_to_dmk`), confirming the September 2026 DMK path; current Upstash Redis TypeScript docs for the repo's existing Redis storage. No Key Ring, FIDO2, or Clear Signing path was used.
- Branch archaeology: ADAPT the ETHOnline RecoveryMandate verifier. REUSE the baseline Redis/approval-boundary concept only. REFERENCE `feat/product-issuer-holder-ux`'s pre-event HMAC approval grant and historical approval commit `57b5499...`; REJECT those server-issued grants as Ledger hardware proof. `main` does not contain `lib/server/approval-grants.ts`; no pre-ETHOnline RecoveryMandate was found.
- Requirement -> code -> evidence: mandatory exact mandate binding -> `lib/ledger/recovery-mandate.ts` -> CI; mandatory one-shot replay gate -> `authorizeRecoveryMandateOnce()` + `lib/ledger/recovery-mandate-replay.ts` -> CI for authorization/atomic-one-winner behavior, CONFIGURED for production Redis persistence; device approve/reject -> not implemented -> no LIVE/DEVICE evidence.
- Verification actually run: `34412573090` failed only because direct Node could not resolve a Next `@/` alias in the new replay adapter; repaired without weakening the gate. Exact-head run `34412815808` is GREEN: install, production build, Hedera baseline, Ledger mandate checker, and continuity baseline guard all pass.
- Evidence: CI at `c0ee974...`; deterministic signer fixture remains SIMULATED. No Ledger device or live Redis transaction is claimed.
- Failed/open: independent Security must retest SEC-LEDGER-001/002; the real product authority seam still must instantiate the Redis replay adapter and preserve provider/Hedera policy; physical DMK approve/reject remains absent. Branch is currently diverged from the frozen foundation and must be realigned before integration, not merged ad hoc.
- Claim impact: builder-side security remediation is CI-green, but Ledger qualification remains RED until independent retest, runtime wiring, and physical device evidence.
- Exact next action: independent Security retest of SEC-LEDGER-001/002 at `c0ee974...`; if accepted, wire `authorizeRecoveryMandateOnce` into the existing approval-grant boundary with the existing Redis store, then prepare the identical EIP-712 payload for real DMK approve/reject.

### 2026-09-10 01:33 Europe/Zurich — Ledger durable activation seam
- Branch/SHA: `feature/ethonline-ledger@986dd0fbcb4ba1ecd9e45bdbe85081e58e6787be`.
- Mission: repair the newly identified SEC-LEDGER-003 architecture problem and the runtime portion of SEC-LEDGER-001 without routing Ledger authority through the pre-event reusable ApprovalGrant bearer seam.
- Changed: added a dedicated server-bound Recovery Mandate lifecycle. `/api/ledger/recovery-mandate/prepare` derives owner from the signed app session, reuses current-holder/provider resale checks, fixes the exact `yourturn-concierge` agent, serial/action/minimum/USDC/expiry/cancellation scope, persists that exact proposal with Redis `SET NX EX`, and returns the same structured EIP-712 object expected by current DMK `signTypedData`. `/api/ledger/recovery-mandate/activate` accepts only mandate ID + signature, reloads the server-stored proposal, instantiates the real Redis replay adapter at the authority boundary, consumes the signature once, and writes a narrow active mandate record. It never mints or accepts the legacy ApprovalGrant.
- Docs reviewed: current ETHOnline 2026 Ledger Continuity wording (`https://ethglobal.com/events/ethonline2026/prizes` and `https://developers.ledger.com/ethonline`); current Ethereum Signer Kit (`https://developers.ledger.com/docs/device-interaction/dmk-ts/references/signers/eth`) confirming structured EIP-712 `signTypedData`, Observable `DeviceActionState`/`requiredUserInteraction`, and `cancel`; current LedgerJS -> DMK migration (`https://developers.ledger.com/docs/device-interaction/dmk-ts/integration/migrations/signers/eth/hw_app_eth_to_dmk`) confirming `@ledgerhq/device-signer-kit-ethereum` is the supported September-2026 path. No Key Ring, FIDO2, OpenPGP, Clear Signing or Transaction Check was used in this increment.
- Branch archaeology: ADAPT the new ETHOnline RecoveryMandate verifier/replay contract. REUSE the baseline signed guest session/actor lock, Redis client, booking holder checks, and booked provider resale policy. REFERENCE `main` for the current auth/session seam and `feat/product-issuer-holder-ux` for existing product structure only. REJECT the pre-event `/api/agent/approval-grant` HMAC bearer token as any representation of Ledger-approved authority; it remains baseline and is deliberately isolated from the new routes.
- Requirement -> code -> evidence: exact DMK-ready mandate payload -> `app/api/ledger/recovery-mandate/prepare/route.ts` + `lib/ledger/recovery-mandate.ts` -> CI/CONFIGURED; server-bound one-shot activation through real Redis -> `app/api/ledger/recovery-mandate/activate/route.ts`, `lib/ledger/recovery-mandate-state.ts`, `lib/ledger/recovery-mandate-replay.ts` -> CI/CONFIGURED; wrong-owner/bad-signature/concurrent replay negatives -> `scripts/ledger-recovery-mandate-runtime-check.mjs` -> CI; real device approve/reject/cancel -> absent -> no LIVE/DEVICE evidence; active mandate driving Hedera recovery execution -> absent -> no runtime execution claim.
- Verification actually run: GitHub Actions run `34417278618` at exact head `986dd0fb...` completed SUCCESS. Install, production build, Hedera baseline check, existing mandate checker + new runtime activation attack, and continuity guard all passed. The new checker proves one concurrent activation winner, rejects wrong-session owner and bad signature, proves a bad signature does not consume the later-valid mandate, validates stored scope, and statically rejects legacy grant/secret fallback usage in the Ledger routes.
- Evidence: CI + CONFIGURED only. The runtime route now instantiates the real Upstash Redis-backed adapter, but CI uses an injected atomic Redis fixture; there is no external Redis runtime capture and no physical Ledger signature. Hardware provenance remains unproven.
- Failed/open: Security must independently retest SEC-LEDGER-001 and SEC-LEDGER-003. The active mandate is not yet load-bearing for the Hedera recovery execution path. A real DMK device approve plus reject/cancel run on the identical prepared payload is still mandatory, and reject-on-device has not been observed. Branch topology still requires supervisor review before integration.
- Claim impact: the previous unsafe plan to translate Ledger authority into a reusable ApprovalGrant is removed from the Ledger design, and a narrow durable authority representation now exists and is CI-green. Ledger sponsor qualification remains RED until independent security acceptance, downstream recovery enforcement, and LIVE/DEVICE evidence.
- Exact next action: independent Security retest of SEC-LEDGER-001/003 at `986dd0fb...`; if accepted, make this active mandate a required input to a new narrow delegated-recovery execution seam that preserves Hedera/provider policy and never falls back to ApprovalGrant, then prepare the physical DMK approve/reject step for the identical payload.

### 2026-09-12 — preserve failed Ledger observations and prior evidence
- Branch/base: `feature/ethonline-ledger-failure-capture-qual` from cleared checker `cf5186ece7c470d7f6385c9195bf775ae188be95`.
- Mission: prevent the observed failure-summary evidence gap recurring on a later human-operated attempt.
- Changed: write signature-free, non-qualifying allowlisted failure observations; capture Observable error states; refuse existing output paths; exclusive mode-0600 proof writes; expiry checks before discovery/signing/acceptance; runbook keeps prior output directories and documents contextual 6982/6985.
- Verification actually run: locked local install, 10 focused failure-capture checks, inherited ceremony and qualification contracts, generic loopback transport denial (exercised), syntax/diff checks. No hardware or app credentials used; generic transport is not a Next/browser-origin result.
- Evidence: exact-head Continuity workflow runs focused/inherited tests, build and pinned helper import smoke after publication. Hosted result and independent review belong in #16.
- Failed/open: original session-2 states remain absent; no device qualification promotion. The new failure schema cannot qualify or activate a mandate. Full canonical Ledger lifecycle/World integration remains separate.
- Claim impact: source/CI/local safety/evidence candidate only; no device/signer provenance or authority change.
- Exact next action: consume exact hosted result and separate Security review before any human hardware continuation; preserve old evidence and revalidate current prepared/server state.
