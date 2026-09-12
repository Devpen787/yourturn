# Hedera Integration Feedback — YourTurn ETHOnline 2026

This feedback is grounded in the ETHOnline continuation work around serial-scoped booking authority, official Hedera testnet USDC, external signing and Mirror reconciliation.

## What worked well

- Hedera NFT allowances map well to one-booking delegated authority because a spender can be scoped to a specific serial instead of receiving broad wallet custody.
- A single `TransferTransaction` is expressive enough to model booking NFT movement and Bob-funded USDC economics when every role, fee and signature is explicit.
- Mirror Node provides an independently readable final evidence surface for transaction ID, NFT transfer, fungible transfers, fee payer and consensus result.

## Friction encountered

### 1. RETURN_BYTES / external-signing guidance for advanced token flows

Our safest architecture is server preparation → exact validation → external signer → exact revalidation → human-authorized submission. This is more nuanced than a normal SDK `execute()` example.

**Suggested improvement:** publish an end-to-end example for externally signing a frozen HTS `TransferTransaction`, including how to preserve the exact transaction ID/body and validate the returned signed bytes without regenerating the transaction.

### 2. NFT approval + custom-fee economics need one reference example

When a booking NFT carries a royalty, “buyer pays gross” and “seller receives net” must be distinguished. Minimum recovery belongs on seller net, not gross.

**Suggested improvement:** provide a reference transaction and Mirror response for an approved NFT transfer with fungible consideration and royalty, showing payer, buyer debit, seller net, collector credit and network-fee rows.

### 3. Mirror eventual consistency deserves an evidence pattern

Consensus success and indexed evidence are different moments. For a judged proof, developers need a safe way to reconcile the exact transaction without implying Mirror is consensus-synchronous.

**Suggested improvement:** document recommended bounded polling/read-twice patterns, immutable transaction identity checks and how to report indexing lag honestly.

### 4. Replay/unknown-submission guidance should be explicit

For a frozen transaction ID, blindly rebuilding or resubmitting after an uncertain network response can create dangerous ambiguity.

**Suggested improvement:** document an “unknown outcome” recovery pattern: preserve the exact transaction ID and signed bytes, check authoritative/indexed state first, and only create a new operation under an explicit new authorization path when absence is established.

### 5. Testnet proof recipes would help Continuity submissions

Serial-scoped approve/wrong-serial/revoke/post-revoke and settlement proofs are powerful but require multiple independent pre/post state checks to avoid false-positive evidence.

**Suggested improvement:** provide a small official harness/checklist for owner-held preconditions, allowance scope, delegated transfer, revoke, post-revoke denial and final ownership/economic verification.

## Evidence still required for the final integrated claim

The final candidate must execute one fresh Bob-funded Hedera testnet settlement from the canonical YourTurn path and attach the exact transaction ID, Mirror/HashScan references and indexed receipt. Historical Hedera testnet evidence remains useful provenance but does not prove execution of the new integrated candidate.