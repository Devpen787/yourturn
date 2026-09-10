# Journey Registry

Status vocabulary: `candidate`, `review`, `GOLDEN-READY`, `Golden`, `implemented`, `blocked`.

| Journey | User outcome | Status | ETHOnline priority |
| --- | --- | --- | --- |
| YT-01 Understand & enter | Visitor understands YourTurn and can enter the product | GOLDEN-READY | P0 |
| YT-02 My Bookings | Holder sees owned bookings and their meaningful states | GOLDEN-READY | P0 |
| YT-03 Booking detail | Holder can use a booking or change plans | GOLDEN-READY | P0 |
| YT-04 Recovery setup | Holder defines what YourTurn may do | GOLDEN-READY | P0 |
| YT-05 Delegate | Holder understands and authorizes the mandate with Ledger | queued | P0 |
| YT-06 Agent working | Holder sees the exact human-backed delegated agent working | queued | P0 |
| YT-07 Block / escalate | Out-of-scope offer is blocked and escalation boundary is clear | queued | P0 |
| YT-08 Successful recovery | In-scope offer completes transfer + settlement | queued | P0 |
| YT-09 New holder | Buyer sees and can use the transferred booking | queued | P1 |
| YT-10 Activity & proof | Both parties can understand what happened; reviewer can inspect evidence | queued | P1 |

## Current review set

**YT-01 → YT-04**

Canonical candidate route: `/product-preview`.

Exact reviewed candidate: `e3905833ec456ecc08e7733e0ec746686fd6b7e4`.

Current independent classification: **GOLDEN-READY**, not `Golden`. Human freeze approval is still required.

The candidate runs as one continuous customer story:

`Landing → enter → My Bookings → Friday Yoga → Change plans → Let YourTurn handle it → minimum/expiry/actions → secure-approval handoff`

### Required demo fixture

Friday Yoga · 18:00  
Studio A · Zürich  
Status: Confirmed

Recovery mandate candidate:
- minimum recovery: 40 USDC
- expiry: tomorrow 17:00
- allowed: find an eligible buyer / transfer as required to complete approved recovery
- forbidden: cancel, lower the minimum, touch another booking
- authority applies only to this booking

## GOLDEN-READY evidence

Product Reviewer #34 cleared the remaining YT-01→YT-04 product findings on exact candidate `e3905833ec456ecc08e7733e0ec746686fd6b7e4`.

Exact-head proof:
- ETHOnline Continuity Gate `34437850556`: **SUCCESS**.
- Product Workbench Visual Check `34437847330`: **SUCCESS**.
- Rendered interaction verified at desktop `1440×1000` and mobile `390×844`.
- Evidence artifact `product-workbench-rendered-evidence` / `10136877079`: 12 PNG checkpoints bound to the exact candidate.
- All unauthenticated `My bookings` entry affordances converge on exact `/product-preview` before the prepared Maya entry state.
- The regression check requires exact `/product-preview` equality rather than accepting arbitrary prefixed routes.

No remaining material UX revision is requested before the human freeze gate.

## Human freeze gate

The independent reviewer has marked exact candidate `e3905833ec456ecc08e7733e0ec746686fd6b7e4` `GOLDEN-READY`.

Devinson must explicitly approve that exact candidate before YT-01→YT-04 becomes `Golden`. Do not freeze automatically and do not start a competing canonical candidate while approval is pending.

## Next set after Golden approval

**YT-05 → YT-08**

`Ledger mandate → World-backed delegated agent → 32 USDC BLOCKED → 45 USDC ALLOWED → Hedera transfer + settlement → recovered 45 USDC`

## Completion principle

The hackathon product journey is not complete until the state is visible on both sides:

- Alice no longer owns the booking and has recovered value.
- Bob owns a usable Friday Yoga booking.

A transaction receipt alone does not count as journey completion.
