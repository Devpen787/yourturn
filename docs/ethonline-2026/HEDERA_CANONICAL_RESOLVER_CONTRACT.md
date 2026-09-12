# Canonical recovery-state resolver qualification

Claim #5 5648087720. Branch `feature/ethonline-hedera-canonical-resolver-qual`, base `f78e2f2608fa081d448a4e82b592ceb903f1e72a`. No branch merge or package change.

## Exact source imports

| Path | Source | Changes |
| --- | --- | --- |
| `lib/policy/published-provider-policy.ts` and its check script | `3f1c2de645ecab51a0d38f7695360a4b2437d0a2` | Byte-identical |
| `lib/policy/public-enrollment-registry.ts` and its check script | `9791a4650013c006dbe81a52a4dee319b081e602` | Byte-identical |
| `lib/hedera-agent-kit/current-chain-reader.ts` | `6b2d4ad3362c54f6b694a35c5df701ceefdcb58d` | One call changes executor account parsing from optional to required native public key; same fixed-origin GET, limits, native parser and two-pass equality guard |
| `scripts/hedera-current-chain-reader-check.mjs` | `6b2d4ad3362c54f6b694a35c5df701ceefdcb58d` | Byte-identical |

The focused resolver check pins both imported policy module hashes. No Ledger/World source, old ApprovalGrant gate, live runner, signing callback or new transaction builder is imported. The existing exact payment, royalty, native signing and Redis code remains unchanged.

## Runtime contract

Construct `createCanonicalRecoveryStateResolver` from trusted server dependencies once. The only per-resolution argument is an operation ID, never client authority JSON. The factory snapshots a mandatory server-provisioned public enrollment manifest and captures its dependencies. It calls the actual `loadPublishedProviderPolicy`, enrollment registry and bounded `readCurrentRecoveryChain`; optional storage/fetch/clock injection exists for tests. Production defaults remain the existing Redis client and fixed Testnet Mirror origin.

Three mandatory trusted callbacks remain concrete production integration requirements:

- `resolveCanonicalAuthority(operationId)` returns the strict current Ledger canonical projection. It must perform real guarded authority reads. After an operation claim, the adapter must validate the actual owned odd version with the separately reviewed owned loader while retaining the original signed projection's stable-version field; never mask a live odd version as even.
- `readCurrentPayment(operationId)` returns `CurrentRecoveryPaymentRecord`: schema/version, authenticated owner/operation, explicit provider ID, exact quote ID/hash/expiry, persisted complete v2 commitment and explicit revocation state. The record's provider ID is the provider policy ID in this bounded contract. Version is a positive canonical int64 string. This module does not create transaction IDs, quotes or payment records.
- `readCurrentEligibility(operationId)` returns `CurrentRecoveryEligibility`: schema/version, owner/operation, token/serial/holder/buyer, explicit HELD status, true acquirer eligibility and validity deadline. A cancelled/used/unavailable booking denies. The callback must read authoritative current booking and acquirer state, not map localStorage or a request assertion to true.

No configuration factory, fixture fallback, owner/account selection or production provisioning is supplied. Missing, corrupt, expired or changed facts deny. Public manifest provisioning, current quote/payment persistence, actual lifecycle/eligibility source and guarded Ledger callback still require integration. This is not a claim that those production sources already exist.

The resolver binds agent enrollment's exact owner/internal-agent/requester/resource/holder/executor/version to the canonical projection. It performs actual public GETs for Bob and executor native Ed25519/ECDSA account keys, NFT owner and exact serial spender, complete token metadata/fee schedule, balances and usable associations. Bob funds and receives the NFT. Holder, Bob and executor are distinct; executor is the NFT spender and transaction fee payer. Third-party funding is unsupported.

The v2 royalty resolver calculates seller net using complete chain metadata and published provider royalty. Both Ledger minimum and provider minimum protect seller net. Ten percent is neither imposed nor capped. Payment validity must fit the mandate, quote, booking eligibility, agent enrollment and the earlier of provider cutoff/expiry. Exact roles, operation, quote, provider version, native transaction payer/start/duration and royalty economics must agree.

Control reads surround the internally repeated chain observations. Each successful result includes frozen `state: ResolvedUsdcRecoveryState`, stable `intent`/SHA-256 `intentHash`, executor public key and explicit indexed evidence. Full intent binds the canonical authority, public registry provenance, full published provider record, payment/revocation/version, eligibility, normalized payment state and executor key. Transport/observation timestamps are outside the stable intent; a fresh read does not silently change the commitment. The outer window is at most five seconds, with a real wall-clock timeout and rollback denial. Timed-out callbacks may still finish internally, but cannot produce a returned result or a write.

`executionPermission` is always false. Callers must re-resolve at their actual policy/signing/effect boundaries and compare the full intent. Redis policy, enrollment configuration, booking callbacks and Mirror observations are not one atomic snapshot. A recent indexed transaction watermark does not establish synchronous consensus or lock external changes. No signing, reservation, submission, hardware, credentials, funds or live chain evidence is produced by this qualification.
