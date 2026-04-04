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

## Chain track

4. `Add Mirror health and booking-right read client`
   - Owner: chain side
   - Files: `src/lib/mirror-client.ts`

5. `Implement F1 primary booking transaction path`
   - Owner: chain side
   - Files: `src/hedera/`

6. `Implement F2 royalty math and transfer or resale transaction path`
   - Owner: chain side
   - Files: `src/domain/`, `src/hedera/`

7. `Implement F4 mark-used transaction path`
   - Owner: chain side
   - Files: `src/hedera/`

8. `Implement F3 freeze or unfreeze transaction path`
   - Owner: chain side
   - Files: `src/hedera/`

9. `Implement F7 refund math and refund transaction path`
   - Owner: chain side
   - Files: `src/domain/`, `src/hedera/`

## Product track

10. `Build guest slot list and booking UI for F1`
    - Owner: product side
    - Files: `src/app/`, `src/features/guest/`, `src/hooks/`

11. `Build guest transfer or resale UI with royalty preview for F2`
    - Owner: product side
    - Files: `src/features/guest/`, `src/hooks/`

12. `Build issuer holder view and mark-used UI for F4`
    - Owner: product side
    - Files: `src/features/issuer/`, `src/hooks/`

13. `Build issuer freeze or unfreeze UI for F3`
    - Owner: product side
    - Files: `src/features/issuer/`, `src/hooks/`

14. `Build guest cancel or refund UI for F7`
    - Owner: product side
    - Files: `src/features/guest/`, `src/hooks/`

## Proof and docs

15. `Wire real testnet proof logging into docs/TX-LOG.md`
    - Owner: shared
    - Outcome: one place for tx ids and Hashscan links

16. `Finalize demo script and README against shipped flows`
    - Owner: shared
    - Files: `docs/DEMO.md`, `README.md`
    - Collision warning: shared docs

## Parallel working rules

- Chain side should stay inside `src/domain/`, `src/hedera/`, `src/lib/mirror-client.ts`, `server/`, and `scripts/`
- Product side should stay inside `src/app/`, `src/features/guest/`, `src/features/issuer/`, `src/hooks/`, and styling or UX states
- Coordinate before editing:
  - `README.md`
  - `.env.example`
  - `src/adapters/booking-port.ts`
  - lockfile
