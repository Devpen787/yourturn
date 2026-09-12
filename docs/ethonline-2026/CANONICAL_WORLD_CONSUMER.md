# Canonical World / Ledger operation consumer qualification

This increment connects the unchanged official World verifier to the actual guarded Ledger operation lifecycle. It is not a final integration selection, production route switch, real World proof or settlement.

## Exact imports

- Base `c1add7750d3eeca474a53780e86c3ec73d0057c5`: independently cleared shared Ledger/World dependency graph and three unchanged verifier files; #16 5648084430. All prior locked package entries and overrides remain unchanged.
- From independently cleared `881cfc7d3c3821005f829b677d2a27b892846eb3` (#16 5648092366): `lib/ledger/recovery-operation-authority.ts`, `scripts/ledger-owned-authority-check.mjs`, `scripts/ledger-owned-authority-redis-check.mjs`, byte-identical.
- Inherited projection1201ae68, current024e0cc5 and operation4b4189a0 are unchanged. No old ApprovalGrant consumer, retired runner, generic MCP surface or evidence-only composition is imported.

## Actual sequence

`prepareCanonicalWorldRequest` reads guarded authority, exact server agent binding and full current execution-facts digest twice under a five-second window. It returns an immutable challenge, never a permit. The digest combines a domain separator, complete canonical projection digest and mandatory authoritative execution-facts digest. That callback must bind provider publication/version/rules, full quote/payment identity/roles/economics, registry provenance and current chain/booking/eligibility facts. The consumer does not invent those facts.

The World SIWE **statement must exactly equal** `canonicalWorldStatement(operationId, intentHash)`. This binds the signature to the operation and full resolved intent; a valid signature for just the endpoint is insufficient. The unchanged official verifier checks parser/message/signature, exact URI, registered human-backed requester and one-use nonce. Use a fresh nonce for every signed retry. Local URI signatures use `domain = new URL(resourceUri).hostname` as required by pinned AgentKit0.2.1, while `uri` preserves the exact port/path. Headers use `agentkit`.

After verification, the consumer rereads stable authority/current intent during `claimRecoveryOperation`. Only a newly claimed operation can continue. `beginRecoveryOperationEffect` runs mandatory operation-owned authority, mapping/full-facts and World-expiry revalidation before its atomic transition. The new revision is revalidated again before the one trusted effect callback. The callback receives an exact owned operation and a revalidation function for its own reservation/signing boundary. It must durably retain its output before returning transaction/digest references. The consumer records those references using the existing write-once operation transition.

No callback invocation can be retried by this consumer. Lost output, timeout, provider drift or partial failure leaves the durable operation in its actual phase. A new signed nonce on the same operation returns **status only**, even for a never-started claim, expired lease or revoked mandate. It does not reset authority, replay tombstones or regenerate bytes. A separate trusted recovery procedure may prove safe abandonment of an unstarted claim or reconcile an already retained receipt using the existing primitives. Receipt-only completion remains possible after revocation; the tests exercise that primitive, not a real receipt fetcher.

## HTTP boundary

`createCanonicalWorldConfirmHandler` is a concrete Request/Response factory, tested through an actual loopback HTTP server. It requires exact configured `/api/agent/confirm` URI, POST, same-origin browser requests, bounded JSON with exactly mandateId/operationId/intentHash, an AgentKit header, and a mandatory fresh authenticated-owner callback. Owner, provider, holder, funding keys, authority records and payment facts are not accepted from JSON. Responses are no-store and omit raw verifier errors, headers and human identifiers. A 503 is deliberately not a claim of no effect; use a fresh signed nonce for same-operation status.

The existing published `app/api/agent/confirm` route is not silently switched. Final provisioning/adoption must wire this factory to freshly verified owner identity, the approved real public registry, the canonical provider/chain/quote resolver, durable nonce storage, durable effect-output retention and the reviewed Hedera preparation/signing/receipt adapter. Those dependencies are mandatory; the module offers no demo/default fallback. Static public enrollment cannot prove live cross-process revocation. Separate stores and indexed Mirror reads cannot form a consensus-wide lock.

## Evidence and remaining human preparation

Run the credential-free matrix with:

```bash
env -i PATH="$PATH" NODE_OPTIONS=--no-warnings node --experimental-transform-types scripts/canonical-world-consumer-check.mjs
```

Hosted CI repeats it with `--redis` against disposable Redis7.4.2, exercising actual claim/begin/retain/receipt Lua and SET-NX World replay semantics. The test nonce adapter uses loopback RESP; it is not a claim that deployed Upstash credentials or the production default nonce factory ran. Public deterministic fixture key11 signs synthetic EIP191 messages; AgentBook lookup and economic effect are explicit mocks. Initial local HTTP fixture incorrectly used host-with-port as AgentKit domain; pinned source checks hostname. The fixture was corrected; exact URI/origin assertions and negative cases remain strict. Original failure log is retained in the execution evidence directory.

No actual credentials, Ledger device, World agent identity, economic signing or chain transaction is used. Next: independent source/runtime review; compose the actual current provider/chain/payment resolver and retained-output adapter under a separate claim; then prepare the exact human signer request and receipt capture. This is still unfinished software until that adapter and actual provisioning are qualified. #5 remains HOLD.
