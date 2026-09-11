# XC-03 Acceptance Contract — Provider Lifecycle

## Scope

XC-03 closes the provider UX/UI lifecycle requested after Golden XC-01 and the XC-02 fulfilment/aftermath slice. It covers P-01/P-02/P-04/P-05 without redesigning the already-established provider rules/recovery/holder-change/fulfilment semantics in P-03/P-06/P-07/P-08.

Connected story:
`Studio A joins YourTurn → completes the business profile → connects session inventory → configures and publishes Friday Yoga with reusable booking rules → a customer booking moves pending → confirmed → Studio A operates Friday Yoga in Today with current holder and attendance state`.

## Required product behavior

### P-01 — Join YourTurn
- provider setup identifies Studio A as the business, not an `issuer`/wallet/account object;
- incomplete setup and complete profile are distinct states;
- provider promise remains control through reusable rules, not per-recovery approval.

### P-02 — Create/connect inventory
- empty inventory explains the missing object and offers connect/create as the next action;
- connecting/loading does not publish customer inventory early;
- connection failure creates no customer inventory and preserves provider setup;
- connected state identifies the session inventory in ordinary service language.

### P-04 — Issue/sell booking
- Friday Yoga is draft before publish and `Published` only after provider action;
- reusable recovery/transfer/eligibility/cutoff/no-cancel rules exist before customer recovery;
- pending booking does not count Maya as authoritative holder before confirmation;
- failed booking returns the place to available inventory and does not show Maya as holder;
- success shows Maya with a normal confirmed Friday Yoga booking.

### P-05 — Operate today's bookings
- Today can be legitimately empty;
- populated state shows service, current holder, booking state, attendance and relevant recovery allowance without protocol clutter;
- stale/unknown holder state blocks holder-sensitive actions rather than showing an outdated customer as authoritative.

## Compatibility invariants

- P-03/P-06/P-07 remain compatible with Golden XC-01: provider rules are pre-defined/load-bearing and there is no per-recovery Studio A approval click;
- P-08 remains compatible with XC-02: provider fulfilment/reconciliation consumes the same booking/current-holder state;
- customer object remains `booking`, provider-facing object remains service/session/booking/customer rather than NFT/pass/serial/account IDs;
- proof remains collapsed and truthfully `FIXTURE` / non-LIVE until real integrations replace it.

## Evidence gate

`production build → real Chromium desktop/mobile → material happy/empty/loading/error/stale states → exact-head artifact → Product Reviewer #34 direct five-lens PNG review`.

No Hedera/World/Ledger backend semantic change, merge, production/mainnet deployment, funding, or secret operation is authorized.
