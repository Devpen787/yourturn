# Suggested GitHub issues

Open these as small slices. Keep ownership disjoint where possible.

## Shared setup and contracts

1. `Lock hero demo scenario and No Solidity proof plan`
   - Owner: shared
   - Outcome: final copy for the one demo scenario and exact HTS + Mirror proof stance

2. `Define BookingPort interface for F1 F2 F4`
   - Owner: shared
   - Outcome: stable method boundary for product and chain work
   - Collision warning: shared glue file

3. `Add domain types for slot policy lifecycle and fee preview`
   - Owner: chain side
   - Outcome: single typed contract imported by both tracks

## Auth / platform (Sebastian)

- `Email login with Redis (Upstash) — Phase A`
  - Owner: Sebastian
  - Plan: `docs/AUTH-EMAIL-REDIS.md`
  - Outcome: register/login + session cookie; **no** replacement of Hedera Guest A/B actor demo in Phase A
  - Collision warning: may touch `app/layout.tsx` / `components/SiteHeader.tsx` — coordinate with product partner

## Chain track

4. `Add Mirror health and booking-right read client` *(largely done — verify / extend if needed)*
   - Owner: chain side
   - Files: `lib/hedera/mirror.ts`, `app/api/mirror/route.ts`

5. `Implement F1 primary booking transaction path` *(done — proof only)*
   - Owner: chain side
   - Files: `lib/hedera/token.ts`, `app/api/book/route.ts`

6. `Implement F2 resale + HTS royalty path` *(done — verify single royalty on testnet)*
   - Owner: chain side
   - Files: `lib/hedera/token.ts`, `app/api/resale-buy/route.ts`

7. `Implement F4 mark-used (return-to-treasury + burn)` *(done)*
   - Owner: chain side
   - Files: `lib/hedera/token.ts`, `app/api/mark-used/route.ts`

8. `Implement F3 freeze or unfreeze (Mirror holder target)` *(done — product: show holder in UI)*
   - Owner: chain side
   - Files: `app/api/freeze/route.ts`, `app/api/unfreeze/route.ts`

9. `Implement F7 refund math and refund transaction path`
   - Owner: chain side
   - Files: `lib/domain/`, `lib/hedera/`, `app/api/` *(new routes if added)*

## Product track

10. `Build guest slot list and booking UI for F1` *(baseline done — polish / copy)*
    - Owner: product side
    - Files: `app/slots/`, `components/`

11. `Build guest transfer or resale UI with royalty preview for F2` *(baseline done — align copy with HTS royalty)*
    - Owner: product side
    - Files: `app/resale/`, `components/`

12. `Build issuer holder view and mark-used UI for F4` *(baseline done — clarity)*
    - Owner: product side
    - Files: `app/issuer/`

13. `Build issuer freeze or unfreeze UI for F3` *(show Mirror holder; reduce wrong-actor freezes)*
    - Owner: product side
    - Files: `app/issuer/`

14. `Build guest cancel or refund UI for F7`
    - Owner: product side
    - Files: `app/`, `components/`

## Proof and docs

15. `Wire real testnet proof logging into docs/TX-LOG.md`
    - Owner: shared
    - Outcome: one place for tx ids and Hashscan links

16. `Finalize demo script and README against shipped flows`
    - Owner: shared
    - Files: `docs/DEMO.md`, `README.md`
    - Collision warning: shared docs

## Parallel working rules

- **Chain** stays mainly in `lib/hedera/`, `lib/server/`, `lib/store/`, `lib/domain/` (with coordination), Hedera-related `app/api/*`
- **Product** stays mainly in `app/issuer/`, `app/slots/`, `app/my-bookings/`, `app/resale/`, `components/`, styling/copy
- **Always** follow **`AGENTS.md` → “Parallel collaboration”** (issue claim, status comment, rolling next table)
- Coordinate before editing:
  - `README.md`
  - `.env.example`
  - `AGENTS.md` (rolling table)
  - future `lib/adapters/booking-port.ts` (or agreed path)
  - lockfile
