# Interruption / Failure Recovery Matrix (corrected)

> **CORRECTED 2026-09-11.** Rows classified "REQUIRES RESET (not yet implemented)"
> should be read as **"requires a NEW demonstration with fresh identities"**, not as
> a request to delete replay keys. Starting a new demonstration is a different
> operation from retrying an uncertain one; see
> `scripts/demo-reliability/retry-reconciliation.mjs`, which asserts that an
> uncertain submitted operation keeps its transaction identity and that a retry
> produces no second transfer.


Evidence class: **FIXTURE / CI-LOCAL**, from `scripts/demo-reliability/interruption-matrix.mjs`.

Each row aborts the flow at that point, then asks what the next run sees under three conditions. The "scoped reset" column is a **harness-only hypothetical** used to expose residual risk; it is not implemented in product code.

| Interruption point | retry, no reset | after today's reset | after scoped reset* | Class |
| --- | --- | --- | --- | --- |
| after Ledger mandate activation | FAIL | FAIL | PASS | REQUIRES RESET (not yet implemented) |
| after mandate replay consumption | FAIL | FAIL | PASS | REQUIRES RESET (not yet implemented) |
| after World requester verification, before product mutation | FAIL | FAIL | PASS | REQUIRES RESET (not yet implemented) |
| after 32-USDC rejection | FAIL | FAIL | PASS | REQUIRES RESET (not yet implemented) |
| after 45-USDC policy approval, before Hedera submission | FAIL | FAIL | PASS | REQUIRES RESET (not yet implemented) |
| after RETURN_BYTES construction, before signing/submission | FAIL | FAIL | PASS | REQUIRES RESET (not yet implemented) |
| after holder transition, before UI/receipt reconciliation | FAIL | FAIL | PASS | **REQUIRES RECONCILIATION** |
| after settlement succeeds but receipt update fails | FAIL | FAIL | PASS | **REQUIRES RECONCILIATION** |

**Against today's reset every one of the eight points is unrecoverable**, because `prepare` always collides on the staged `mandateId` before anything else is reached.

## Why two rows are RECONCILIATION, not RESET

For the last two rows the scoped-reset "PASS" is itself misleading, and the harness cannot prove otherwise without a network:

- the harness rebuilds slots from seed, so Redis-side reset makes the booking look like Maya's again;
- if a **real** Hedera transfer had already executed, NFT ownership on testnet would still be Bob's.

Clearing Redis cannot undo an on-chain transfer. After a real settlement, a reset produces a product that claims Maya holds a booking the ledger says belongs to Bob. These two points need a reconciliation step that re-reads authoritative on-chain holder state — not a reset. **This specific hazard is asserted from code paths, not proven here**, because proving it requires a Hedera submission that is out of scope.

## Observation on demo console noise

The Hedera Agent Kit writes a line to stdout on every policy block:

```
[yourturn_delegated_recovery_settle_nft_usdc] Failed to execute Prepare atomic booking-right + USDC recovery: booking_right_delegation:BLOCK:BELOW_MINIMUM_RECOVERY
```

Not a leak, and correct behaviour — but on a shared screen the 32-USDC step prints the word "Failed" at the exact moment the product is demonstrating a *successful* protection. Worth knowing before it is on a projector.
