# Journey Registry

Status vocabulary: `candidate`, `review`, `GOLDEN-READY`, `Golden`, `implemented`, `blocked`.

| Journey | User outcome | Status | ETHOnline priority |
| --- | --- | --- | --- |
| YT-01 Understand & enter | Visitor understands YourTurn and can enter the product | review | P0 |
| YT-02 My Bookings | Holder sees owned bookings and their meaningful states | review | P0 |
| YT-03 Booking detail | Holder can use a booking or change plans | review | P0 |
| YT-04 Recovery setup | Holder defines what YourTurn may do | review | P0 |
| YT-05 Delegate | Holder understands and authorizes the mandate with Ledger | queued | P0 |
| YT-06 Agent working | Holder sees the exact human-backed delegated agent working | queued | P0 |
| YT-07 Block / escalate | Out-of-scope offer is blocked and escalation boundary is clear | queued | P0 |
| YT-08 Successful recovery | In-scope offer completes transfer + settlement | queued | P0 |
| YT-09 New holder | Buyer sees and can use the transferred booking | queued | P1 |
| YT-10 Activity & proof | Both parties can understand what happened; reviewer can inspect evidence | queued | P1 |

## Current review set

**YT-01 → YT-04**

Canonical candidate route: `/product-preview`.

Previous reviewed candidate: `e3905833ec456ecc08e7733e0ec746686fd6b7e4`.

That candidate reached `GOLDEN-READY` under the earlier gate and received Devinson's explicit approval, but the subsequently tightened rendered-visual gate reclassified it `REVISE` after direct inspection of the PNG evidence.

Active revised candidate: `24bbf0d7516499069f5102ae4bf724b0cb376b94`.

Current classification: **review pending independent rendered re-review**.

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

## Latest rendered-review findings addressed

Product Reviewer #34 inspected the actual desktop/mobile screenshot artifact for `e3905833...` and requested three bounded revisions before freeze:
1. add explicit YT-03 Booking detail screenshots at desktop and mobile widths;
2. simplify the 390 px landing header so customer entry is not dominated by mixed customer/provider navigation;
3. remove residual landing `pass` vocabulary in favor of the canonical `booking` language.

Active candidate `24bbf0d...` addresses those findings only:
- compact unauthenticated mobile landing header keeps `My bookings` and `Sign in` primary while collapsing `Browse`, `Provider dashboard`, and `Register` at 390 px;
- landing explanatory copy now uses `booking` consistently instead of `live pass` / `list your pass for resale`;
- rendered Playwright coverage now captures `04-booking-detail` at both desktop and mobile widths;
- the visual verifier also rejects the legacy landing pass phrases and checks the compact mobile header behavior.

No Hedera/World/Ledger backend semantics changed and no second candidate route was created.

## Exact-head proof

For active candidate `24bbf0d7516499069f5102ae4bf724b0cb376b94`:
- ETHOnline Continuity Gate `34472117038`: **SUCCESS**.
- Product Workbench Visual Check `34472112881`: **SUCCESS**.
- Rendered interaction verified at desktop `1440×1000` and mobile `390×844`.
- Evidence artifact `product-workbench-rendered-evidence` / `10150035697`: **14 PNG checkpoints**, seven per viewport, including YT-03 Booking detail.

## Current gate

Product Reviewer #34 must inspect artifact `10150035697` directly and classify exact candidate `24bbf0d...`.

The earlier human approval of `e3905833...` does not silently transfer to this revised executable SHA. If `24bbf0d...` (or a later revision) reaches `GOLDEN-READY`, Devinson must explicitly approve that exact candidate before YT-01→YT-04 becomes `Golden`.

## Next set after Golden approval

**YT-05 → YT-08**

`Ledger mandate → World-backed delegated agent → 32 USDC BLOCKED → 45 USDC ALLOWED → Hedera transfer + settlement → recovered 45 USDC`

## Completion principle

The hackathon product journey is not complete until the state is visible on both sides:

- Alice no longer owns the booking and has recovered value.
- Bob owns a usable Friday Yoga booking.

A transaction receipt alone does not count as journey completion.
