# Hedera prepare-and-retain adapter

## Scope

`createPrepareRetainedRecoveryAdapter` connects an already claimed, operation-owned Ledger mandate to the independently qualified Hedera `RETURN_BYTES` preparation helper and durable output retention. The adapter owns the one atomic `claimed` to `effect-started` transition. Only the caller that wins that transition may reserve the exact payment commitment and prepare unsigned transaction bytes.

Before and at the effect boundary, the adapter reloads the operation-owned authority, invokes the mandatory canonical resolver, verifies the full stable intent and exact Ledger-to-Hedera projection, and validates Bob's native signature over the complete v2 transaction. After preparation, it retains the exact unsigned bytes and transaction ID before attaching their immutable references to the operation.

An existing `effect-started` record never authorizes preparation again. A missing output after an unknown begin or preparation result remains locked for reconciliation. The receipt-only read path can recover already retained bytes after expiry or revocation, but it never resolves current state, reserves payment, calls the helper, or returns an execution permit.

## Composition boundary

The current World consumer cannot consume this adapter unchanged because that consumer already owns its begin-effect transition. A later reviewed successor must route the verified World claim and claimed operation through one begin path. It must not call both begin transitions or treat `effect-started` as a fresh preparation permit.

Production composition must also supply the actual public enrollment manifest, authenticated owner selection, guarded operation-owned authority revalidation, current durable payment record, and the business-defined eligibility source. The adapter does not invent eligibility, select accounts, sign, submit, read a receipt, or move funds.

## Evidence

The source manifest pins each imported Hedera file to its independently reviewed source SHA and verifies the patched Ledger `package.json` and lockfile byte-for-byte. The focused qualification uses synthetic public keys and the actual Hedera SDK preparation helper. Hosted CI adds disposable Redis for the begin, payment reservation, retention and inherited lifecycle boundaries, plus locked install, build, TypeScript and baseline checks. No credential, physical device, signature ceremony, network transaction, or live account is used.
