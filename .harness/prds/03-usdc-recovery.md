# PRD 03 — Hedera USDC Recovery Settlement

## Goal

Make USDC a real customer-visible recovery settlement path for delegated booking resale/recovery.

## Official test asset

Circle Hedera testnet USDC: `0.0.429274`.

## Preferred target

Prove a single Hedera `TransferTransaction` that combines:

- approved NFT transfer from booking owner to buyer;
- approved USDC transfer from buyer to booking owner.

Both sides must have granted the required bounded allowances and YourTurn policy must pass before submission.

## Assertions

1. The app verifies the expected token ID/decimals before settlement.
2. A compliant recovery amount can settle in USDC on testnet.
3. Insufficient/missing buyer USDC allowance is blocked.
4. Missing/revoked seller NFT authority is blocked.
5. Price below the owner's mandate is blocked before network execution.
6. If atomic settlement is claimed, both NFT and USDC movement are evidenced in one transaction.
7. Customer receipt shows amount, currency, participants and proof links in plain language.

## Fallback

If atomic composition cannot be proven safely in time, implement a staged settlement with explicit pending/failed/compensating states. Do not call a multi-transaction flow atomic.

## Out of scope

Mainnet funds, fiat on/off-ramp, Circle Mint onboarding, cross-chain settlement.
