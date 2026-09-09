# ETHONLINE-10 — Hedera Native Delegated Recovery

## Objective

Overdeliver on Hedera Continuity by making booking authority natively delegatable, revocable and USDC-settleable on Hedera, with agent execution bounded by YourTurn policy.

## Read first

- `docs/ethonline-2026/CONTINUITY_BASELINE.md`
- `docs/ethonline-2026/MASTER_PLAN.md`
- `docs/ethonline-2026/sponsors/HEDERA.md`
- `docs/ethonline-2026/ACCEPTANCE.json`

## Build order

1. serial-scoped NFT allowance spike;
2. revoke + negative serial tests;
3. non-custodial allowance creation (`RETURN_BYTES` preferred);
4. `BookingRightDelegationPolicy` + replay/idempotency guard;
5. HCS delegation lifecycle;
6. customer-visible USDC settlement;
7. atomic USDC+NFT settlement spike;
8. new agent consumes existing x402 policy service;
9. Playwright + adversarial + testnet proof.

## Hard done-when

Do not call this task done until the corresponding Hedera acceptance assertions are backed by exact evidence. Atomic settlement and x402-consumer assertions may remain false if timeboxed and honestly documented; the core Continuity requirement is a substantive, verified new Hedera capability.

## Never

- use `approvedForAll` for the hero delegation path;
- claim old x402/Agent Kit work as new;
- put private identity/secret data on HCS;
- weaken policy tests to make a transaction pass;
- deploy mainnet unattended.

## Handoff

Every run updates `docs/ethonline-2026/progress.md` with SHA, tests, testnet evidence and the single next action.
