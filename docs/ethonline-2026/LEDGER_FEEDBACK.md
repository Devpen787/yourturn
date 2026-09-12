# Ledger Tooling / DX Feedback — YourTurn ETHOnline 2026

This feedback is grounded in the Ledger Recovery Mandate integration attempted in YourTurn. The integration uses Ledger to authorize an EIP-712-style bounded Recovery Mandate; it does **not** claim that Ledger signs the Hedera HTS settlement transaction.

## What worked well

- Typed structured authorization is a strong fit for delegated-agent products because the human can authorize a bounded capability rather than hand an agent a private key.
- EIP-712 domain separation gives the application a concrete way to bind owner, agent, booking serial, scope, minimum recovery, settlement asset, expiry and nonce into one reviewable authorization artifact.
- Keeping Ledger approval separate from downstream domain policy was useful: the device can prove the human signed the mandate while YourTurn still enforces current ownership, provider rules, replay state and settlement economics.

## Friction encountered

### 1. Cryptographic validity vs hardware provenance is too easy to conflate

Application code can prove that a valid signature came from an enrolled public address, but that alone is not proof that a physical Ledger produced it. For a sponsor submission, this distinction is critical and deserves first-class guidance in the docs.

**Suggested improvement:** provide an explicit “proof levels” section with examples for:

- valid typed-data signature;
- signature from a Ledger-enrolled address;
- live physical-device approval evidence;
- what a verifier may and may not claim from each level.

### 2. Human-readable mandate examples would reduce integration ambiguity

Delegated-agent authorization needs more than a generic typed-data example. We needed to reason carefully about fields such as action scope, one booking serial, minimum seller-net recovery, expiry, nonce and cancellation permission.

**Suggested improvement:** publish a complete capability/mandate example for an agent delegation and show the exact device-facing human language alongside the typed fields.

### 3. Rejection and replay deserve official reference flows

The positive signing path is only half the security story. A production integration must prove that rejecting on-device causes no authority change and that a captured mandate cannot be replayed.

**Suggested improvement:** include runnable approve/reject/replay test vectors and recommended application state transitions around device rejection, user cancellation and stale signatures.

### 4. Local transport / browser bridge constraints need a troubleshooting matrix

During the broader integration work, local transport and browser-origin/loopback behavior became a concrete source of complexity. A developer needs to know which host/origin combinations are expected, which are unsafe, and which failures indicate transport rather than signing problems.

**Suggested improvement:** document supported localhost/127.0.0.1 patterns, browser-origin requirements, expected device bridge behavior and common failure codes in one table.

### 5. Cross-chain authorization examples would help

Our use case intentionally uses Ledger for an authorization artifact while Hedera handles settlement. That is a legitimate architecture, but it is easy for reviewers or developers to assume the hardware must sign the final chain transaction.

**Suggested improvement:** include an example where a Ledger-signed EVM/EIP-712 authorization controls a non-EVM or server-mediated downstream action, with explicit wording about what the Ledger signature proves and what downstream policy must still verify.

## What we would keep

- explicit typed-data scope;
- no raw private-key custody by the application;
- independent replay/expiry protection in application state;
- a clear human sentence before device approval;
- downstream policy remaining fail-closed even after a valid Ledger signature.

## Evidence still required for final qualification

The final submission must attach physical-device approve and reject evidence for the exact integrated candidate. Until that exists, this document is integration/DX feedback and the software evidence remains CI/CONFIGURED rather than DEVICE.