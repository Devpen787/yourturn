# XC-02 Acceptance Contract — Fulfilment + Aftermath

## Scope

XC-02 closes the transferred-booking lifecycle after Golden XC-01 without changing any frozen Golden executable.

Connected story:
`Bob owns Friday Yoga → check-in window opens → Bob checks in → Studio A fulfils the same booking → booking/attendance/recovery records reconcile → Maya, Bob and Studio A each receive a human-readable activity/receipt view`.

## Required product behavior

### A-05 — Bob use/check-in
- Bob remains in `My bookings` throughout fulfilment;
- before the window opens, check-in is unavailable with a clear opening time;
- check-in is allowed only while Bob is still the authoritative holder;
- error/unknown holder state records no attendance and fails closed;
- successful check-in says `You’re checked in` and does not imply protocol proof.

### P-08 — Studio A fulfil/reconcile
- provider sees Bob as the expected/current holder before attendance;
- provider sees Bob checked in/fulfilled after attendance;
- attendance may not silently convert an unresolved recovery record into full reconciliation;
- reconciliation issue keeps final history incomplete;
- reconciled state requires holder + attendance + recovery handoff to agree.

### A-06 / YT-10 — aftermath
- Maya sees the recovery request, `You recovered 45 USDC`, transfer, and later fulfilment in customer language;
- Bob sees availability/commitment, transfer into `My bookings`, and check-in;
- Studio A sees provider rules, Maya→Bob holder change, fulfilment, and reconciliation without exposing Maya’s private Recovery Mandate;
- partial/unknown state must not show a completed receipt;
- technical proof remains collapsed, secondary, `FIXTURE`/non-LIVE until real integration replaces it.

## Evidence gate

`production build → real Chromium desktop/mobile → changed and adjacent material states captured → exact-head artifact → Product Reviewer #34 five-lens direct PNG review`.

No Hedera/World/Ledger backend semantic change, merge, production/mainnet deployment, funding, or secret operation is authorized.
