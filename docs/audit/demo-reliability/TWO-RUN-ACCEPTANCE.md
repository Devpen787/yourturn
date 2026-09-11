# Two-Run Demo Acceptance

Evidence class: **FIXTURE / CI-LOCAL**. No Hedera submission, no World Sandbox call, no Ledger device, no network write, no secrets. Device signing is an ephemeral in-process random wallet.

## Heads under test (refreshed 2026-09-11T01:05Z)

| Lane | Head |
| --- | --- |
| integration (held, unmodified) | `1bf50c02dd3d` |
| Hedera | `40890aab7729` |
| World | `2ab04f4420cc` |
| Ledger | `96d513ef1286` |
| World Sandbox proof | `cc0ffe578286` |
| Product Workbench | `9e3168fa2db5` |

Rehearsal tree = integration + Hedera + World + Ledger, with `app/api/agent/confirm/route.ts` composed as **World gate outside, Ledger serialization inside** (the only safe resolution of that conflict). `tsc --noEmit` and `next build` both exit 0.

## Result: FAIL

`node --experimental-transform-types scripts/demo-reliability/two-run-acceptance.mjs` → **exit 1**.

Run 1 passes completely: prepare → activate → requester verified → 32 USDC `BLOCK/BELOW_MINIMUM_RECOVERY` with zero bytes → 45 USDC `ALLOW` settling 45000000 to the holder → exactly one booking movement + one USDC transfer, `signed:false, submitted:false` → holder Maya→Bob → receipt.

Reset then runs **exactly what `/api/reset-demo` implements today**. Five keys survive it:

```
bookedrights:ledger:mandate-prepared:demo-friday-yoga-mandate
bookedrights:ledger:mandate-consumed:f799274a…
bookedrights:ledger:mandate-active:demo-friday-yoga-mandate
bookedrights:world-agentkit:nonce:requester-demo-mandate-nonce
ethonline:hedera:booking-right-nonce:…:RECOVER:demo-recovery-nonce-45
```

Run 2 fails immediately: **`Recovery mandate id already exists or could not be prepared`**.

The harness does not implement a better reset. The failure is preserved deliberately.

## Per-namespace attribution

`scripts/demo-reliability/stale-state-chain.mjs` leaves exactly one namespace behind at a time. Control (all six cleared) passes both runs, so these are the only blockers.

| Namespace | Blocks run 2? | Failure surfaced |
| --- | --- | --- |
| `bookedrights:ledger:mandate-prepared` | **yes** | `Recovery mandate id already exists or could not be prepared` |
| `bookedrights:ledger:mandate-active` | **yes** | `Recovery mandate activation state already exists or could not be stored` |
| `bookedrights:ledger:mandate-consumed` | **yes** | `Recovery mandate has already been consumed` |
| `bookedrights:world-agentkit:nonce` | **yes** | `world_requester_nonce_already_consumed` |
| `ethonline:hedera:booking-right-nonce` | **yes** | `45_usdc_refused:IDEMPOTENT_REPLAY` |
| `bookedrights:ledger:authority-version` | no | monotonic counter; survives harmlessly |

**The Hedera nonce is the most dangerous of the five.** It does not fail early — run 2 reaches the stage, the 32-USDC block still renders correctly, and the failure lands precisely on the 45-USDC money shot as `IDEMPOTENT_REPLAY`.

## Reproduce

```
node --experimental-transform-types scripts/demo-reliability/two-run-acceptance.mjs   # exit 1
node --experimental-transform-types scripts/demo-reliability/stale-state-chain.mjs    # exit 1, per-namespace table
node --experimental-transform-types scripts/demo-reliability/interruption-matrix.mjs  # interruption classes
node --experimental-transform-types scripts/demo-reliability/privacy-failure-scan.mjs # exit 0
```
