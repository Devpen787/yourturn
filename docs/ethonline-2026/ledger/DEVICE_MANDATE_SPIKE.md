# Ledger Device-Backed Recovery Mandate — Spike Decision

Status: **selected for implementation; not device-proven yet**.

## Why this path

Ledger Continuity should change the YourTurn authority boundary, not add a wallet logo. The selected path is a **device-signed off-chain Recovery Mandate** using Ledger's current Device Management Kit (DMK) Ethereum signer, preferably `signTypedData` for an EIP-712 structured mandate.

Official references:

- ETHOnline 2026 Continuity: https://developers.ledger.com/ethonline
- Ethereum Signer Kit: https://developers.ledger.com/docs/device-interaction/dmk-ts/references/signers/eth
- LedgerJS -> DMK migration: https://developers.ledger.com/docs/device-interaction/dmk-ts/integration/migrations/signers/eth/hw_app_eth_to_dmk

LedgerJS / `hw-app-eth` is intentionally not selected because Ledger deprecated that path in September 2026. Use `@ledgerhq/device-management-kit` + `@ledgerhq/device-signer-kit-ethereum` when device wiring begins.

## Exact claim boundary

The Ledger device will sign a YourTurn authorization artifact. **It will not be described as signing a Hedera HTS transaction.** Hedera remains responsible for booking-right authority and settlement; Ledger provides hardware-backed evidence that the owner approved creation or expansion of a Recovery Mandate.

A valid mandate signature is an additional authorization layer. It never bypasses YourTurn provider policy, Hedera allowance scope, expiry, minimum recovery price, or replay controls.

## Proposed owner enrollment

Before a device signature can authorize a booking owner, YourTurn must know which Ledger-controlled Ethereum address is an approved authorization key for that logged-in owner.

Enrollment must therefore bind:

- YourTurn owner identity/account;
- Ledger-derived Ethereum address;
- derivation path / key identifier as non-secret metadata;
- enrollment timestamp/version.

The private key never enters YourTurn.

## RecoveryMandate typed data

The human-readable mandate should encode at minimum:

- `mandateId`
- `ownerId`
- `ledgerSignerAddress`
- `agentId`
- `bookingTokenId`
- `bookingSerial`
- `allowedAction`
- `minimumRecoveryAtomicUnits`
- `settlementAsset` (for the hero path: Hedera USDC token `0.0.429274` on testnet)
- `expiresAt`
- `nonce`
- `cancellationAllowed`
- `issuedAt`

The text shown before device approval must describe the same values in plain language, for example:

> Allow Alice's Concierge to resell booking #193 for at least 40 USDC until tomorrow at 17:00. Cancellation is not allowed.

## Verification contract

YourTurn may accept a device-signed mandate only if all of these pass:

1. recovered signer equals the owner's previously enrolled Ledger authorization address;
2. `bookingSerial` and token ID match the authority being granted;
3. `agentId` matches the delegated agent;
4. mandate is not expired;
5. nonce/mandate ID has not been consumed or revoked;
6. requested action and minimum price exactly match the human-approved mandate;
7. provider policy independently permits the requested action;
8. the Hedera authority used for execution is no broader than this mandate.

## Mandatory negative cases

The implementation is not complete until it proves:

- device/user rejection results in no authority change;
- stale mandate is rejected;
- replayed/consumed mandate is rejected;
- changed serial is rejected;
- changed agent is rejected;
- changed minimum price/action is rejected;
- valid Ledger approval cannot override a failing YourTurn/Hedera domain-policy check.

## Evidence status

- **RESEARCH:** official Ledger Continuity and DMK Ethereum Signer documentation supports device message / EIP-712 signing.
- **CONFIGURED/IMPLEMENTED:** not yet.
- **LIVE/DEVICE:** not yet. A physical Ledger confirmation is required before any device-backed sponsor claim becomes green.

## First implementation seam

The current baseline `lib/server/approval-grants.ts` creates HMAC-backed approval grants from a server secret. The Ledger work should not fork Hedera delegation semantics; it should add a new verifier/authorization source at this existing approval boundary so a device-signed Recovery Mandate can authorize creation or expansion of the same domain mandate.

Do not silently replace existing approval behavior until the new path has focused positive/negative tests and an independent review.

## Next bounded increment

Implement the canonical RecoveryMandate schema + EIP-712 typed-data builder/verifier using the already-present `ethers` dependency, including expiry and nonce/replay checks with deterministic fixture tests. Keep that evidence explicitly **SIMULATED/LOCAL** until the same payload is signed and rejected on a real Ledger device via DMK.
