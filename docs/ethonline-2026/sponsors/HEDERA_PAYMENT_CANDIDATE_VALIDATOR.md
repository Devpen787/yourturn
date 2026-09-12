# Hedera current-payment candidate validator

## Scope

`createCurrentPaymentCandidateValidator` is the mandatory trusted callback for `publishCurrentPaymentRecord`. The factory receives a server-selected operation, the guarded stable Ledger authority source, an owner-reviewed public enrollment manifest, a mandatory current business-eligibility reader, and the current provider-policy and Mirror readers. A proposed payment record cannot provide any of those authorities.

The callback binds the authenticated owner to the current Ledger mandate and binds the authenticated publisher ID to the provider enrollment's issuer ID. It then checks the complete immutable v2 payment commitment: operation, provider and quote identity; booking token and serial; holder, buyer, funding, recipient, executor and native fee-payer roles; current positive eligibility; published provider version and `ALLOW` state; gross buyer payment; business-owner royalty; seller net; transaction validity; and every authority deadline.

The validator performs two complete `readCurrentRecoveryChain` calls. Each call already requires two matching indexed fact passes and fresh index watermarks. The two normalized semantic results must match, native Bob and executor public keys must be present, and the second index cannot regress. Guarded Ledger, enrollment, eligibility and policy reads repeat around that work. Drift or unavailable state denies publication.

## Result and limits

The only result is `{ authorityFingerprint, validUntilMs }`. The fingerprint binds the candidate digest, authenticated publisher, stable Ledger projection, exact agent/provider enrollments, provider policy, business eligibility and normalized native chain facts. The deadline is the earliest mandate, manifest, enrollment, policy, quote, eligibility or transaction deadline.

This component does not read or write the current-payment store, claim or begin an operation, prepare transaction bytes, verify World, sign, submit, read a receipt, move funds or return execution permission. The eligibility callback remains a mandatory business-owned source; public token readiness is not treated as buyer eligibility.

The inherited exact-payment contract permits whole-second transaction IDs ending in `.000000000`. Nonzero nanoseconds are rejected by the cleared commitment schema and remain outside this bounded increment. Royalty is supplied by the published business-owner policy. Zero, ten, twenty or another valid percentage is accepted when it exactly matches immutable token fee metadata and the seller net clears both owner and provider floors.

## Evidence

The focused matrix covers 49 positive, negative, drift, timeout and source-integrity cases. A successful validation performs 52 mocked public Mirror GETs across two complete readers. Hosted CI repeats the matrix with the Ledger and provider records in disposable Redis, then runs the inherited current-payment, canonical projection/resolver, registry, policy, preparation/retention, signing, royalty, Ledger lifecycle, build, TypeScript and baseline Agent Kit checks on the unchanged patched dependency graph.

This is deterministic source and hosted test evidence only. It uses synthetic public keys and mocked public GET responses. No credential, physical device, network transaction or funds are used, and the builder does not independently qualify the increment.
