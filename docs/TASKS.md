# Tasks

This is the living implementation checklist. It is ordered by dependency, not by idea category.

## Status: merged Next.js MVP on `main` (Apr 2026)

The following already exist in-repo: **F1** primary book, **F2** resale (royalty via **HTS `CustomRoyaltyFee` only** — no manual double split), **F3** freeze/unfreeze (Mirror holder + `holderActor` must match), **F4** mark used (guest → treasury transfer then burn when needed), HCS lifecycle messages, Redis slot/listing state, demo UI (`/issuer`, `/slots`, `/resale/...`). *Still open:* testnet proof lines in `docs/TX-LOG.md`, `BookingPort`, product UX clarity (issuer/holder/resale copy), hero + `docs/DEMO.md`, submission links in `README`. **See `AGENTS.md` → “Rolling: what to do next” for parallel ownership.**

## Phase 0: lock the build target

- [x] Set repo-local canonical docs
- [x] Lock the current product direction in `docs/DECISIONS.md`
- [x] Make `docs/SPEC.md` a real execution spec
- [ ] Lock the single hero demo scenario copy
- [x] `No Solidity Allowed` proof plan: **HTS** (NFT + fees + freeze + burn), **Mirror** (reads), **HCS** (lifecycle topic — in use; narrative still HTS-first)

## Phase 1: shared foundations

- [ ] Define `BookingPort` interface and method surface *(next split: chain vs product)*
- [x] Domain types / fee preview (initial): `lib/domain/*`, `lib/types/*` — revisit when `BookingPort` lands
- [ ] Define the minimum issuer policy needed for `F1`, `F2`, and `F4` *(MVP uses fixed demo policy)*
- [x] Demo state model (guest/issuer screens) — v1 in `app/`
- [x] Mirror read helpers — `lib/hedera/mirror.ts`, `GET /api/mirror`

## Phase 2: F1 primary booking

- [x] Issuer seed path — `/api/init`, `/api/mint-slots`, `public/demo-slots.json`
- [x] Guest slot list and detail — `/slots`, `/slots/[serial]`
- [x] Primary booking path — `POST /api/book`
- [x] Booking success feedback — UI + tx id
- [ ] Log real F1 proof in `docs/TX-LOG.md`

## Phase 3: F2 transfer or resale with royalty

- [x] Royalty and seller-net math — `lib/domain/fees.ts`, resale tx in `lib/hedera/token.ts`
- [x] Resale preview UI — `/resale/[serial]`
- [x] Resale transaction path — `POST /api/resale-list`, `POST /api/resale-buy`
- [x] Post-transfer state in UI
- [ ] Log real F2 proof in `docs/TX-LOG.md`

## Phase 4: F4 mark used

- [x] Issuer can act on serial — `/issuer` + `POST /api/mark-used`
- [x] Mark-used (burn) action
- [x] Used state from Mirror / derived status
- [ ] Log real F4 proof in `docs/TX-LOG.md`

## Phase 5: strong next layer

- [x] `F3` freeze / unfreeze — `POST /api/freeze`, `POST /api/unfreeze`
- [x] Issuer UI for freeze/unfreeze
- [ ] Log real F3 proof in `docs/TX-LOG.md`
- [ ] Build `F7` cancel or refund domain math
- [ ] Build `F7` guest cancel or refund UI
- [ ] Build `F7` refund transaction path
- [ ] Log real F7 proof in `docs/TX-LOG.md`

## Phase 5b: app accounts (Sebastian — coordinate with product)

- [x] **Email auth** stored in **Upstash Redis** — `POST /api/auth/register|login|logout`, `GET /api/auth/me`, `/login`, `/register`, header session UI (`docs/AUTH-EMAIL-REDIS.md`)
- [x] Phase A: **keep** Hedera Guest A/B **Actor** demo (unchanged)

## Phase 6: polish and submission proof

- [ ] Tighten holder status language and issuer copy
- [ ] Finalize `docs/DEMO.md` against the actual shipped flow
- [x] README run steps (baseline) — proof links still TBD
- [ ] Capture demo URL, Hashscan links, and testnet ids

## Explicitly deferred until core is working

- [ ] Rebook flow
- [ ] Forwarding count enforcement beyond minimum demo support
- [x] `HCS` audit trail — basic topic messages shipped; expand only if demo needs it
- [ ] Agent-assisted booking layer
- [ ] Wallet integration expansion beyond what the chosen demo needs
