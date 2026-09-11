# Handoff — Corrected Demo Acceptance + Mode-Specific Preflight

Branch: `audit/demo-acceptance-correction-0911`
Base: `audit/demo-reliability-0911@98a674c` (itself integration `1bf50c0` + Hedera `40890aa` + World `2ab04f4` + Ledger `96d513e`, with `app/api/agent/confirm/route.ts` composed World-gate-outside / Ledger-serialization-inside).

Nothing merged. No owned branch modified. No deploy, submission, hardware, provider call, key deletion, schema change or secret read.

## What changed and why

Integration #17 established two model errors in `audit/demo-reliability-0911`:

1. the "two-run acceptance" test reused every credential **and the booking serial**, so it measured replay rejection, not repeatability;
2. the reset double restored the seeded serial, whereas `/api/reset-demo` calls `mintSlotNfts()` and saves **new serials** — it is a network-mutating bootstrap.

Both are corrected. The headline conclusion changes.

## Patch 1 — corrected acceptance tests

| File | Purpose | Result |
| --- | --- | --- |
| `scripts/demo-reliability/replay-rejection.mjs` | fixed credentials must NOT be reusable; refusal is success | **exit 0 PASS** |
| `scripts/demo-reliability/fresh-run-repeatability.mjs` | a second independently authorized run with fresh identities and the newly minted serial, retaining all consumed records | **exit 0 PASS** |
| `scripts/demo-reliability/retry-reconciliation.mjs` | retry vs reconcile vs new demonstration | **exit 0 PASS** |
| `scripts/demo-reliability/world-verifier-local.mjs` | real `verifyWorldAgentRequest` negative paths, synthetic headers, stubbed AgentBook | **exit 0 PASS** |
| `scripts/demo-reliability/privacy-failure-scan.mjs` | unchanged from the original audit | **exit 0 PASS** |
| `scripts/demo-reliability/memory-redis.mjs` | reset double corrected to model reminting; limits documented | — |
| `scripts/demo-reliability/recovery-flow.mjs` | shared flow, substitutes named inline | — |

Removed as superseded: `two-run-acceptance.mjs`, `stale-state-chain.mjs`, `interruption-matrix.mjs`, `flow.mjs`.

**Key result:** `fresh-run-repeatability.mjs` proves a second run proceeds **with zero replay-key deletion**, then re-asserts that run 1's credentials are still refused and that both consumed digests survive. Repeatability was not bought by weakening replay protection.

### Honest limits, stated in the code
- `revalidateMutableAuthority` is a **no-op**; this is not real booking/policy revalidation.
- The World step inside `recovery-flow.mjs` is **nonce bookkeeping, explicitly not cryptographic verification**. Real verifier evidence is isolated in `world-verifier-local.mjs`, and covers **negative paths only** — positive cryptographic verification needs a genuine AgentKit-signed header and is out of scope.
- The real nonce store interface is `{ isFresh, consume }`; the earlier harness used a `consumeOnce` shape that does not exist on the real type.
- `memory-redis.mjs` records TTL but **never enforces expiry**, and proves nothing about Lua atomicity, concurrency or eviction.
- Holder/receipt transitions are assigned in-process after **unsigned, unsubmitted** construction. No submission occurs.
- `mintSlotNfts` is a real Hedera mint; offline we model only its **result** (fresh serials).

## Patch 2 — mode-specific preflight

| File | Purpose | Result |
| --- | --- | --- |
| `scripts/preflight/mode-preflight.mjs` | required vs optional configuration per demo mode, derived from actual code gates | runs offline |
| `scripts/preflight/mode-preflight.test.mjs` | positive/negative tests with synthetic values | **exit 0 PASS (19 assertions)** |

Modes: `fixture-preview`, `stateful-app`, `world-signed-route`, `ledger-device-ceremony`, `hedera-testnet-recovery`.

- Reports **names and status only** (`OK` / `MISSING` / `INVALID`). A test asserts no synthetic value appears in either output format.
- Offline and non-mutating: no network call, no device open, **no `.env` file read** — `process.env` only.
- Separates configuration presence from connection health, initialized booking state, device availability and execution success; each mode prints its own "not checked" boundaries.
- `fixture-preview` is ready with an empty environment; `ledger-device-ceremony` needs no variables at all because `scripts/ledger-device-proof/` reads none — the gate is a physical device.
- `scripts/ethglobal-preflight.mjs` is **untouched** (verified), and this does not replace `scripts/submission-readiness.mjs`.

## Commands

```
node --experimental-transform-types scripts/demo-reliability/replay-rejection.mjs
node --experimental-transform-types scripts/demo-reliability/fresh-run-repeatability.mjs
node --experimental-transform-types scripts/demo-reliability/retry-reconciliation.mjs
node --experimental-transform-types scripts/demo-reliability/world-verifier-local.mjs
node --experimental-transform-types scripts/demo-reliability/privacy-failure-scan.mjs
node scripts/preflight/mode-preflight.mjs [--mode=<mode>] [--json]
node scripts/preflight/mode-preflight.test.mjs
```

## Corrected conclusion

The earlier **"NO-GO for a stateful demo run twice" is withdrawn as overbroad.** It rested on reusing credentials that must be refused. With fresh identities and the serial that bootstrap mints, a second run proceeds and replay protection stays intact.

What remains true from the original audit: the fixture hero route needs no configuration; the privacy scan passes; there is no USDC-denominated receipt/status representation; and no real settlement path is wired.

## Remaining gaps (not addressed here, deliberately)

| Gap | Owner |
| --- | --- |
| USDC receipt/status shape — trusted token/network/atomic amount/decimals plus pending / confirmed-failure / settled / unknown-reconciling, preserving legacy HBAR fields | **Integrator** |
| Real reconciliation of a submitted operation against receipt/mirror state | **Integrator** |
| Route exposing `preparePolicyAuthorizedUsdcRecovery`, and a consumer for the activated mandate | **Integrator** |
| Positive World cryptographic verification with a genuine signed header | **World worker** |
| SEC-LEDGER-005 independent disposition on `96d513e` | **Security** |
| Real Redis expiry/Lua/concurrency coverage | **Integrator**, against a real Redis |
| Documenting mode-specific configuration; adopting this checker into the readiness gate | **Submission Auditor / readiness worker** |
| Whether any replay-key cleanup is ever permitted | **Security**, not the Integrator |

## Consumers

- **Integrator (#17)** — patch 1 as the acceptance gate; do not implement replay-key deletion.
- **Submission Auditor / `ops/ethonline-submission-readiness`** — patch 2, alongside the existing manifest gate.
- **Security (#16)** — the replay-rejection test as a standing regression for credential non-reusability.
