# Tasks

This is the living implementation checklist. It is ordered by dependency, not by idea category.

## Status: merged Next.js MVP on `main` (Apr 2026)

The following already exist in-repo: **F1** primary book, **F2** resale (royalty via **HTS `CustomRoyaltyFee` only** — no manual double split), **F3** freeze/unfreeze (Mirror holder + `holderActor` must match), **F4** mark used (guest → treasury transfer then burn when needed), HCS lifecycle messages, Redis slot/listing state, demo UI (`/issuer`, `/slots`, `/resale/...`), and real proof lines in `docs/TX-LOG.md`. *Still open:* `BookingPort` follow-through, final v1 UX cleanup, submission packaging, and broader product-next work. **See `AGENTS.md` → “Rolling: what to do next” for parallel ownership.**

## Phase 0: lock the build target

- [x] Set repo-local canonical docs
- [x] Lock the current product direction in `docs/DECISIONS.md`
- [x] Make `docs/SPEC.md` a real execution spec
- [x] Lock the single hero demo scenario copy
- [x] `No Solidity Allowed` proof plan: **HTS** (NFT + fees + freeze + burn), **Mirror** (reads), **HCS** (lifecycle topic — in use; narrative still HTS-first)

## Phase 1: shared foundations

- [x] Define initial `BookingPort` interface and method surface — `lib/adapters/booking-port.ts`, `lib/types/booking-port.ts`
- [x] Add initial agent-safe API surface over `BookingPort` — `app/api/agent/*` read / preview / confirm + delegated approval grant minting
- [x] Document agent/backend integration flow — `docs/AGENT-INTEGRATION.md`
- [x] Domain types / fee preview (initial): `lib/domain/*`, `lib/types/*` — revisit when `BookingPort` lands
- [ ] Define the minimum issuer policy needed for `F1`, `F2`, and `F4` *(MVP uses fixed demo policy)*
- [x] Demo state model (guest/issuer screens) — v1 in `app/`
- [x] Mirror read helpers — `lib/hedera/mirror.ts`, `GET /api/mirror`

## Phase 2: F1 primary booking

- [x] Issuer seed path — `/api/init`, `/api/mint-slots`, `public/demo-slots.json`
- [x] Guest slot list and detail — `/slots`, `/slots/[serial]`
- [x] Primary booking path — `POST /api/book`
- [x] Booking success feedback — UI + tx id
- [x] Log real F1 proof in `docs/TX-LOG.md`

## Phase 3: F2 transfer or resale with royalty

- [x] Royalty and seller-net math — `lib/domain/fees.ts`, resale tx in `lib/hedera/token.ts`
- [x] Resale preview UI — `/resale/[serial]`
- [x] Resale transaction path — `POST /api/resale-list`, `POST /api/resale-buy`
- [x] Post-transfer state in UI
- [x] Log real F2 proof in `docs/TX-LOG.md`

## Phase 4: F4 mark used

- [x] Issuer can act on serial — `/issuer` + `POST /api/mark-used`
- [x] Mark-used (burn) action
- [x] Used state from Mirror / derived status
- [x] Log real F4 proof in `docs/TX-LOG.md`

## Phase 5: strong next layer

- [x] `F3` freeze / unfreeze — `POST /api/freeze`, `POST /api/unfreeze`
- [x] Issuer UI for freeze/unfreeze
- [x] Log real F3 proof in `docs/TX-LOG.md`
- [ ] Build `F7` cancel or refund domain math
- [ ] Build `F7` guest cancel or refund UI
- [ ] Build `F7` refund transaction path
- [ ] Log real F7 proof in `docs/TX-LOG.md`

## Phase 6: polish and submission proof

- [x] Tighten holder status language and issuer copy
- [x] Finalize `docs/DEMO.md` against the actual shipped flow (see `docs/UI-MAP.md` for route/API map)
- [x] README run steps and proof links
- [ ] Fill `docs/SUBMISSION.md` with final form copy, assets, tech stack, and prize selections
- [ ] Capture demo URL, Hashscan links, and testnet ids

## Explicitly deferred until core is working

- [ ] Rebook flow
- [ ] Forwarding count enforcement beyond minimum demo support
- [x] `HCS` audit trail — basic topic messages shipped; expand only if demo needs it
- [ ] Agent-assisted booking layer
- [ ] Wallet integration expansion beyond what the chosen demo needs
