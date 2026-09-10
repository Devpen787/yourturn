# Journey Registry

Status vocabulary: `candidate`, `review`, `Golden`, `implemented`, `blocked`.

| Journey | User outcome | Status | ETHOnline priority |
| --- | --- | --- | --- |
| YT-01 Understand & enter | Visitor understands YourTurn and can enter the product | candidate | P0 |
| YT-02 My Bookings | Holder sees owned bookings and their meaningful states | candidate | P0 |
| YT-03 Booking detail | Holder can use a booking or change plans | candidate | P0 |
| YT-04 Recovery setup | Holder defines what YourTurn may do | candidate | P0 |
| YT-05 Delegate | Holder understands and authorizes the mandate with Ledger | queued | P0 |
| YT-06 Agent working | Holder sees the exact human-backed delegated agent working | queued | P0 |
| YT-07 Block / escalate | Out-of-scope offer is blocked and escalation boundary is clear | queued | P0 |
| YT-08 Successful recovery | In-scope offer completes transfer + settlement | queued | P0 |
| YT-09 New holder | Buyer sees and can use the transferred booking | queued | P1 |
| YT-10 Activity & proof | Both parties can understand what happened; reviewer can inspect evidence | queued | P1 |

## Current review set

**YT-01 → YT-04**

Review this as one continuous customer story:

`Landing → enter → My Bookings → Friday Yoga → Change plans → Let YourTurn handle it → minimum/expiry/actions → continue to authorization`

### Required demo fixture

Friday Yoga · 18:00  
Studio A · Zürich  
Status: Confirmed

Recovery mandate candidate:
- minimum recovery: 40 USDC
- expiry: tomorrow 17:00
- allowed: resell / transfer as required to complete approved recovery
- forbidden: cancel
- authority applies only to this booking

## Next set after approval

**YT-05 → YT-08**

`Ledger mandate → World-backed delegated agent → 32 USDC BLOCKED → 45 USDC ALLOWED → Hedera transfer + settlement → recovered 45 USDC`

## Completion principle

The hackathon product journey is not complete until the state is visible on both sides:

- Alice no longer owns the booking and has recovered value.
- Bob owns a usable Friday Yoga booking.

A transaction receipt alone does not count as journey completion.
