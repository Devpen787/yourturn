# Judge Demo Fallback

Rule that governs every row: **a prerecorded LIVE artifact may be shown as prerecorded LIVE evidence; a fixture may never be presented as a live execution.** Say which one is on screen, every time.

## Current evidence inventory

| Claim | Strongest evidence that exists today |
| --- | --- |
| Hedera H1 RETURN_BYTES external signing | **LIVE/TESTNET** — run `34453253654` (proof SHA `48de5c23`, behind head `40890aa`) |
| Hedera H0 delegation lifecycle | **LIVE/TESTNET** — run `34423120299` (proof SHA `de4ccab6`) |
| Hedera 45-USDC atomic recovery | **CI/LOCAL only.** All three live runs failed at liquidity preflight (`34475817628`, `34475770954`, `34475363423`) |
| World AgentBook registration/resolution | **LIVE** — run `34424393203`; still qualifies head (`world-agentbook-live-check.mjs` unchanged, agentkit pinned 0.2.1) |
| World signed route / Sandbox | **CI/CONFIGURED.** SEC-WORLD-005 independently closed 2026-09-11T00:36; phone evidence is a separate human gate |
| Ledger mandate guards | **CI_CONFIGURED**; no device run exists. SEC-LEDGER-005 repair `96d513e` awaiting independent disposition |
| Golden YT-01→08 and XC-01 journeys | **FIXTURE**, rendered PNG evidence bound to exact SHAs |

## Fallbacks

**Hedera testnet unavailable.** Show the prerecorded H0/H1 LIVE/TESTNET run artifacts and name them as prerecorded, with run id and proof SHA on screen. Then run the local policy demo and label it CI/LOCAL. Do not describe the local run as settlement. Say plainly that the 45-USDC atomic settlement has never executed live.

**Circle / testnet USDC problem.** This is already the standing state, so it needs no improvisation: present 32-blocked / 45-allowed as **policy decisions**, which is exactly what they are. `preparePolicyAuthorizedUsdcRecovery` returns a decision plus unsigned bytes; that is a genuine, demonstrable security property. Never say "settled".

**World Sandbox / provider unavailable.** Show the AgentBook LIVE run `34424393203`. Describe the signed-route harness as CI/CONFIGURED. Do not perform or claim phone verification — that gate is unmet regardless of availability.

**Ledger USB/HID/device fails.** There is no live device evidence to fall back to, so do not imply any. Show the EIP-712 mandate structure and the CI-proven guards (one-shot replay, signer enrollment, stale-activation refusal) and label them CI_CONFIGURED. The honest line is that hardware provenance is unproven.

**Browser loses local demo state.** The hero route `/product-preview` is entirely client-side fixture and needs no env, no Redis and no session — a reload fully restores it, including all XC views. This is the most robust fallback available: if everything stateful fails, the Golden and XC-01 journeys still present end to end. Label them FIXTURE.

**Deployed preview unavailable.** Run locally: `npm ci --legacy-peer-deps && npm run build && npm start`, then open `/product-preview`. This works with **zero configuration**. Anything stateful additionally needs `AUTH_SESSION_SECRET` and a KV instance — see `COLD-START-GAPS.md`. Have that prepared beforehand; it cannot be improvised on stage.

## Do not

- Re-run a stateful demo a second time without a scoped reset — it fails at the 45-USDC step with `IDEMPOTENT_REPLAY` (see `TWO-RUN-ACCEPTANCE.md`).
- Present the fixture `/product-preview` recovery as an executed on-chain recovery.
- Describe unsigned RETURN_BYTES as a settlement.
- Show a CI/LOCAL policy result as testnet execution.
