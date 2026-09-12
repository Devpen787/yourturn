# Public enrollment registry contract

Claim #16 `5647885248`, qualification branch `feature/ethonline-foundation-public-enrollment-qual`, based on independently cleared provider store `3f1c2de645ecab51a0d38f7695360a4b2437d0a2`.

`createPublicEnrollmentRegistry(trustedManifest)` snapshots one owner-reviewed, server-provisioned public manifest. It supplies registered identity facts only. It has no HTTP/configuration loader, environment lookup, provisioning endpoint, authentication callback framework, signer, dynamic update API, persistent store or default records. It does not import or implement the pending canonical projection. No actual enrollment is supplied by this change.

## Manifest and exact lookups

Manifest fields are exactly: schemaVersion=1, version, issuedAtMs, expiresAtMs, revokedAtMs and records. Manifest and record versions are positive canonical int64 decimal strings. Timestamps are positive safe integer milliseconds within JavaScript Date range. Future manifest issuance and future scheduled revocation are refused. At most 256 records are supported. A correctly configured empty manifest returns null for both lookups.

Two record kinds are supported:

- `provider`: providerId, tokenId, serial, issuerId, version, expiresAtMs and revokedAtMs. `resolveProvider({providerId,tokenId,serial})` returns only the exact five-field `ProviderEnrollment` shape consumed by the cleared published-provider store. An app issuer role by itself does not prove ownership; the trusted provisioner must establish the actual issuer/provider/booking binding.
- `agent`: ownerId, internalAgentId, holderAccountId, worldRequester, hederaExecutorAccountId, resourceUri, version, expiresAtMs and revokedAtMs. `resolveAgent({ownerId,internalAgentId})` returns the exact public record plus manifest version/digest/source provenance and `executionAuthority:false`. It has no action, mandate, signature or policy scope. World addresses normalize to lowercase; holder and executor must differ. Resources require the exact canonical `/api/agent/confirm` path, HTTPS or exact loopback HTTP, and no credentials/query/fragment/noncanonical URL spelling.

Identifiers cannot be empty, whitespace-padded, malformed or overlong. Hedera IDs are explicit nonzero `0.0.N` int64 entities; serials are positive safe integers. Unknown fields/kinds and malformed records reject the entire manifest. No record is silently omitted. JSON tuple keys prevent delimiter collisions. Exact duplicate agent keys reject, and a booking can have only one provider record in the same manifest—even when an older duplicate is revoked or expired. No first/last-match fallback occurs.

Manifest input is detached with structuredClone. Closure-owned maps are never exposed. Registry methods, provenance and returned records are frozen. Caller mutations and lookup-body extra fields cannot override provisioned facts. An unknown, revoked or expired entry returns null; invalid lookup input throws. The provider store turns absent enrollment into a denial.

## Time, revocation and provisioning limits

A record cannot outlive its manifest. Cutoff is exclusive: at `expiresAtMs`, lookup returns null. Any explicit past/present revokedAtMs disables the record or entire manifest. The instance tracks its latest observed clock and rejects rollback, so previously observed expiry cannot reactivate through an in-process clock change.

This is an immutable in-process configuration view. It **cannot observe later changes to a file or another process**, authenticate the provisioner, enforce monotonic versions across deployments, or prevent deployment rollback. Owner-reviewed provisioning must issue new versions for changed bindings, replace all prior instances when applying revocation, and prevent rollback to old manifests. Prior still-running instances retain their original snapshot until replaced or expired. Do not claim immediate cross-process revocation from this component alone. No runtime production registry is active merely because these helpers pass tests.

Consumers must reread their current trusted registry at the effect boundary, check enrollment together with mandate/provider/quote/chain/operation facts, and keep registration separate from execution permission. These lookups do not lock those systems or substitute for the pending canonical mapping review. Provider/owner reassignment and active-process coordination need explicit provisioning and integration decisions; no migration is performed.

## Qualification

`node --experimental-transform-types scripts/public-enrollment-registry-check.mjs` uses only synthetic public manifests and a model store. It exercises the actual cleared provider publish/load code through the registry callback, including a still-persisted policy becoming unusable at enrollment expiry. This is not real provisioning or Redis evidence. The earlier provider-store exact Redis evidence remains its separate qualified scope. Dedicated exact-head CI performs locked install, build, TypeScript, baseline Agent Kit and the registry contract matrix. Independent review precedes consumer adoption.
