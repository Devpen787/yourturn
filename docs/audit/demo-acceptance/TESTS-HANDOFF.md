# Corrected Demo Acceptance Tests — handoff (#17)

Delta only. This branch adds `scripts/demo-reliability/*` to the current integration head and imports **no** audit ancestor tree.

## Base and verification refs

| Ref | SHA |
| --- | --- |
| This patch base — `feature/ethonline-integration` | `1bf50c02dd3d` |
| Verified against Hedera | `40890aab7729` |
| Verified against World | `8aff17268adb` |
| Verified against Ledger | `7ac9e8ea3ba8` |

The tests import `lib/ledger/*`, `lib/world-agentkit/*` and `lib/hedera-agent-kit/*`, which the integration head does not yet contain. They therefore **cannot run on this branch alone** — apply them to an authorized candidate that carries all three sponsor surfaces.

Verification tree used here: integration `1bf50c0` + Hedera `40890aa` + World `8aff172` + Ledger `7ac9e8e`, with `app/api/agent/confirm/route.ts` composed **World gate outside, Ledger serialization inside**. `tsc --noEmit` exits 0 on that tree.

## Adapted to the current guarded loader

`loadActiveRecoveryMandate` now requires `authorityBoundaryStore` **and** `revalidateMutableAuthority`, and rejects their absence. The caller in `recovery-flow.mjs` was updated to the current contract.

The revalidator supplied by the tests is `deterministicRevalidator`, exported and documented as a **deterministic test dependency**: it performs no holder/status/provider-policy/listing revalidation and is not evidence that revalidation occurs.

**The guard is never weakened.** `assertGuardedLoaderRejectsMissingContext()` asserts the loader still rejects:

| Case | Observed rejection |
| --- | --- |
| missing `authorityBoundaryStore` | `Active recovery mandate loading requires the authoritative booking state boundary` |
| missing `revalidateMutableAuthority` | `Active recovery mandate loading requires live booking authority revalidation` |
| revalidator not a function | `Active recovery mandate loading requires live booking authority revalidation` |

These run inside `fresh-run-repeatability.mjs`, so relaxing the loader fails the suite.

## Results on the verification tree

| Script | Purpose | Result |
| --- | --- | --- |
| `replay-rejection.mjs` | fixed credentials are not reusable; refusal is success | **exit 0** |
| `fresh-run-repeatability.mjs` | fresh identities + newly minted serial, zero key deletion, plus guard-integrity coverage | **exit 0** |
| `retry-reconciliation.mjs` | retry ≠ reconcile ≠ new demonstration | **exit 0** |
| `world-verifier-local.mjs` | real `verifyWorldAgentRequest` negative paths | **exit 0** |
| `privacy-failure-scan.mjs` | no secret-shaped material on failure paths | **exit 0** |

```
node --experimental-transform-types scripts/demo-reliability/replay-rejection.mjs
node --experimental-transform-types scripts/demo-reliability/fresh-run-repeatability.mjs
node --experimental-transform-types scripts/demo-reliability/retry-reconciliation.mjs
node --experimental-transform-types scripts/demo-reliability/world-verifier-local.mjs
node --experimental-transform-types scripts/demo-reliability/privacy-failure-scan.mjs
```

## Evidence limits (retained deliberately)

- LOCAL / FIXTURE only. No LIVE, DEVICE or SANDBOX clearance is claimed or implied.
- `deterministicRevalidator` is a test dependency, not revalidation.
- The World step inside `recovery-flow.mjs` is **nonce bookkeeping, not cryptographic verification**. Real verifier evidence is isolated in `world-verifier-local.mjs` and covers **negative paths only**; positive cryptographic verification needs a genuine AgentKit-signed header.
- `retry-reconciliation.mjs` asserts **modelled state rules**. It constructs local pending/reconciled objects and is **not** an implemented receipt/Mirror reconciliation route.
- `memory-redis.mjs` records TTL but never enforces expiry, and proves nothing about Lua atomicity, concurrency or eviction.
- Holder/receipt transitions are assigned in-process after **unsigned, unsubmitted** construction. No submission occurs.
- `mintSlotNfts` is a real Hedera mint; offline only its **result** (fresh serials) is modelled.

## Security status as currently recorded (no disposition changed here)

- SEC-LEDGER-005 and SEC-LEDGER-006: **closed** in the current contract. Nothing in this patch reopens them, and the base snapshot of the earlier audit must not be read as reopening them.
- SEC-WORLD-005: **closed**; the browser-Origin cleanup regression retest is recorded CLEAN.
- A separate precautionary **signing/dependency HOLD** is in force from the current #16 triage and PR #42. It is explicitly not a reopening of the above, and this patch does not affect it.

## Remaining integration work (unchanged, not addressed here)

Real mandate projection and consumer; USDC receipt/status representation; transaction-identity reconciliation against receipt/Mirror state; actual cross-sponsor E2E.

## Consumption

Integrator: apply the `scripts/demo-reliability/` delta onto the authorized candidate, rerun the five commands, and treat `fresh-run-repeatability.mjs` as the acceptance gate. Do not implement replay-key deletion on the strength of these tests.
