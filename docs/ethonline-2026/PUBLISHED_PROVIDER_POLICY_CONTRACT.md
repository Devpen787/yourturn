# Published provider policy contract

Qualification branch `feature/ethonline-foundation-provider-policy-qual`, claim #16 `5647773575`. This adds an isolated server storage primitive. It does not select a provider, establish ownership, add a route, or authorize execution.

## Trusted inputs

`publishProviderPolicy` requires an independently authenticated issuer ID, explicit provider/token/serial scope, expected published version, complete policy, and a mandatory server-owned enrollment resolver. That resolver must return the exact scope, enrolled issuer, and enrollment version. HTTP bodies and Product localStorage are not enrollment sources. `loadPublishedProviderPolicy` requires the same scoped resolver, but no publisher identity.

The runtime default uses existing `getRedis()`. Injected store and clock are test seams. Unknown or corrupt storage, missing enrollment, and resolver failure deny. There is no legacy slot/default plan/fixture fallback. Existing legacy policies and Product state are unchanged.

## Published facts

The persistent record contains schema version, monotonically increasing published version, issuer, scope, immutable enrollment version/fingerprint, Redis publication time, state (`ALLOW`, `BLOCK`, `REVIEW`), explicit net USDC floor string or null, royalty numerator/denominator int64 strings with a public collector account (null for zero royalty), transfer cutoff and validity time.

The royalty fraction may be anything from zero through one; 10% is neither forced nor a minimum. Integer strings are canonical (no signs/leading zeros/decimals). Rational fractions do not have to be reduced. Null floor and explicit zero remain distinct. Unsupported states such as `PAUSED` are rejected; an authenticated publisher represents paused/cancelled policy as explicit `BLOCK`. Nothing turns `REVIEW` into `ALLOW`.

Publishing requires `expectedVersion=0` only for a genuinely absent record and otherwise its exact current version. Validation and expected-version failures preserve prior facts. Redis Lua atomically compares every predecessor field, checks Redis TIME, and writes the next version. The record has no TTL: expiry does not erase its version or permit version-zero recreation. A current policy must remain before both cutoff and validity end. Publication is limited to at most 366 days of validity; longer product lifetimes require explicit later publication, not implicit renewal.

Records remain bound to their original enrollment fingerprint. Ownership/enrollment changes cannot silently migrate an existing record; a reviewed migration protocol is outside this increment. The fingerprint binds facts and is not proof of ownership by itself.

## Concurrency and indeterminate results

Enrollment callbacks are checked around asynchronous reads and before/after publication. They are not atomically locked with Redis when stored elsewhere. Two matching callback results prove point-in-time agreement only. A final consumer must recheck enrollment/policy at its own effect boundary; this store does not claim to solve that cross-store race.

A timeout or a failed post-commit enrollment/result check returns `PUBLISH_OUTCOME_UNKNOWN_RELOAD_REQUIRED`. The write may already have committed. Never roll back blindly or retry as version zero: reload/reconcile the durable version with the current enrollment. A changed enrollment makes the prior bound record unusable. Other validation/CAS/Redis-expiry denials before SET leave the prior record unchanged.

`loadPublishedProviderPolicy` checks enrollment, reads and validates the record, rereads the published record, and checks enrollment/time again. Matching reads are not a transaction lock. Returned policy is not an execution permit and cannot substitute for holder mandate, quote, current chain state, World verification, operation fencing, or external signer checks.

## Verification classes

`node --experimental-transform-types scripts/published-provider-policy-check.mjs --model` runs local model checks, not Redis EVAL. The dedicated hosted workflow uses disposable Redis 7.4.2 with a mandatory loopback-only test marker and records exact SHA, assertions, EVAL count and digest. Neither class performs production Redis writes, HTTP execution, signing or chain transactions. Independent review is required before another module consumes this store.
