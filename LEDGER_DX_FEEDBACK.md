# Ledger Tooling / DX Feedback — YourTurn ETHOnline 2026

YourTurn uses Ledger to authorize a bounded EIP-712-style Recovery Mandate. Ledger is **not** claimed to sign the Hedera HTS settlement transaction.

## What worked

- Typed structured authorization is a strong fit for delegated agents: the human authorizes a narrow capability rather than sharing a private key.
- Domain-separated typed data can bind owner, exact agent, booking serial, action, minimum recovery, settlement asset, cancellation rule, expiry and nonce.
- Keeping Ledger approval separate from current provider/ownership/payment policy preserves least authority.

## Most useful DX improvements

1. Add an official “proof levels” section: valid signature → enrolled address → real physical-device approval; spell out what each proves and does not prove.
2. Publish a full delegated-capability typed-data example plus the exact human-readable device sentence.
3. Provide approve/reject/host-cancel/replay reference vectors and recommended state transitions.
4. Publish a localhost/loopback/browser-origin troubleshooting matrix for DMK/device bridge flows.
5. Include a cross-chain authorization example where Ledger proves an off-chain mandate that gates a non-EVM downstream action.

## Evidence boundary

A real physical signTypedData rejection attempt exists in the project history, but repository Security intentionally does not promote it into exact final integrated DEVICE provenance without the exact accepted artifact binding. A later exact final-candidate approve/reject ceremony is an evidence upgrade for that claim; it does not make the prior physical attempt or software evidence disappear.
