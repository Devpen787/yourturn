# Demo State / Reset Matrix

Evidence class: **AUDIT / CI-LOCAL**. No reset implementation is proposed in product code.

## What `/api/reset-demo` does today

`app/api/reset-demo/route.ts` requires provider auth, then calls exactly:
`clearAllListings()`, `clearAutomationProofs()`, `clearRecoveryReceipts()`, and rebuilds slots via `saveSlots()`.
Each `clear*` is a whole-collection overwrite (`saveX([])`) — already demo-scoped, no wildcard deletion.

## Matrix

| Namespace | Created by | Consumed by | Cleared today? | Should reset? | Risk of clearing | Recommended scoped behaviour |
| --- | --- | --- | --- | --- | --- | --- |
| `bookedrights:slots` | `/api/init`, `reset-demo` | product read model | **yes** | yes | none — demo inventory | keep |
| `bookedrights:listings` | resale-list | resale/product | **yes** | yes | none | keep |
| automation proofs | agent flows | proof UI | **yes** | yes | none | keep |
| recovery receipts | `/api/recovery/confirm` | proof UI | **yes** | yes | none | keep |
| `bookedrights:ledger:mandate-prepared:<mandateId>` | `storePreparedRecoveryMandate` | `activatePreparedRecoveryMandate` | **NO** | **yes** | Low. Deleting a *prepared* mandate destroys no authority — it only forces a fresh ceremony. | delete **only the staged demo mandateId(s)**, never by wildcard |
| `bookedrights:ledger:mandate-active:<mandateId>` | activation | `loadActiveRecoveryMandate` | **NO** | **yes** | **Medium.** This is live holder authority. Clearing it for a real user would silently revoke authority they signed for. | delete only staged demo mandateIds; never scan-and-delete |
| `bookedrights:ledger:mandate-consumed:<digest>` | replay store | one-shot signature guard | **NO** | **yes** | **High if over-scoped.** This is the replay defence; clearing another user's digest re-enables replay of their signature. | delete only digests belonging to the staged demo mandate |
| `bookedrights:ledger:authority-version:<serial>` | SEC-LEDGER-005 boundary | activation + mutation serialization | **NO** | optional | **High.** Resetting a version counter can make a stale in-flight mutation look current. | **do not reset**; harness shows it is harmless if left |
| `bookedrights:world-agentkit:nonce:<nonce>` | World verifier | requester replay guard | **NO** | **yes** | **High if over-scoped.** Same class as above for World requests. | delete only the staged demo nonce values |
| `ethonline:hedera:booking-right:<delegationId>:<action>:<nonce>` | `BookingRightDelegationPolicy` | recovery replay/idempotency | **NO** | **yes** | **High if over-scoped.** | delete only keys whose `delegationId` is the staged demo mandate |
| `bookedrights:user:*` | auth | sessions | no | **no** | **Critical** — unrelated users | never touch |
| `telegram:<actor>` | telegram webhook | telegram flow | no | optional | low | out of scope |

## Design constraint

Every namespace that must be reset is keyed by `mandateId` / `delegationId` / explicit nonce. A correct reset therefore **derives the staged demo identifiers and deletes those exact keys** — it never needs `SCAN`/`KEYS` wildcards, and must not use them. Wildcard deletion over `bookedrights:ledger:*` would destroy replay protection for any non-demo user sharing the instance.

Because the demo re-uses one staged `mandateId` and fixed nonces, the deletion set is small, deterministic and enumerable ahead of time.

## Regression test for the Integrator

`scripts/demo-reliability/two-run-acceptance.mjs` is the acceptance gate: it must go from exit 1 to exit 0 **without** the harness's reset model being weakened. `scripts/demo-reliability/memory-redis.mjs::productionResetDemo` must be updated to mirror whatever the real reset does, so the test keeps measuring production rather than intent.
