# Tasks

This is the living implementation checklist. It is ordered by dependency, not by idea category.

## Phase 0: lock the build target

- [x] Set repo-local canonical docs
- [x] Lock the current product direction in `docs/DECISIONS.md`
- [x] Make `docs/SPEC.md` a real execution spec
- [ ] Lock the single hero demo scenario copy
- [ ] Lock the exact `No Solidity Allowed` proof plan: what HTS proves, what Mirror proves, and whether `HCS` stays out

## Phase 1: shared foundations

- [ ] Define `BookingPort` interface and method surface
- [ ] Define domain types for slot, policy, lifecycle state, and fee preview
- [ ] Define the minimum issuer policy needed for `F1`, `F2`, and `F4`
- [ ] Define the demo state model for guest and issuer screens
- [ ] Add Mirror health and basic booking-right read path

## Phase 2: F1 primary booking

- [ ] Build issuer slot publish or seed path needed for the demo
- [ ] Build guest slot list and slot detail UI
- [ ] Build guest primary booking transaction path
- [ ] Show booking success state in the app
- [ ] Log real F1 proof in `docs/TX-LOG.md`

## Phase 3: F2 transfer or resale with royalty

- [ ] Implement royalty and seller-net domain math
- [ ] Build guest transfer or resale preview UI
- [ ] Build transfer or resale transaction path under issuer policy
- [ ] Show post-transfer state in the app
- [ ] Log real F2 proof in `docs/TX-LOG.md`

## Phase 4: F4 mark used

- [ ] Build issuer booking-right list or detail needed to act on a holder
- [ ] Build issuer mark-used action
- [ ] Show used state in issuer and guest views
- [ ] Log real F4 proof in `docs/TX-LOG.md`

## Phase 5: strong next layer

- [ ] Build `F3` freeze or unfreeze domain and transaction path
- [ ] Build `F3` issuer UI and blocked-state UX
- [ ] Log real F3 proof in `docs/TX-LOG.md`
- [ ] Build `F7` cancel or refund domain math
- [ ] Build `F7` guest cancel or refund UI
- [ ] Build `F7` refund transaction path
- [ ] Log real F7 proof in `docs/TX-LOG.md`

## Phase 6: polish and submission proof

- [ ] Tighten holder status language and issuer copy
- [ ] Finalize `docs/DEMO.md` against the actual shipped flow
- [ ] Finalize README run steps and proof links
- [ ] Capture demo URL, Hashscan links, and testnet ids

## Explicitly deferred until core is working

- [ ] Rebook flow
- [ ] Forwarding count enforcement beyond minimum demo support
- [ ] Optional `HCS` audit trail
- [ ] Agent-assisted booking layer
- [ ] Wallet integration expansion beyond what the chosen demo needs
