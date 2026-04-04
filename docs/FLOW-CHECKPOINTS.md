# Flow checkpoints

Use this as the practical review sheet for the demo path and future UI merges.

It sits alongside:

- `docs/UI-MAP.md` for route/component/API wiring
- `docs/DEMO.md` for the happy-path script
- `docs/PERSONAS-EXPECTATIONS.md` for role-by-role expectations

## Core demo checkpoints

### 1. Primary booking (`F1`)

- Guest identity is clear before booking
- Only **AVAILABLE** slots feel bookable
- Booking success gives visible confirmation
- The booking appears in the holder view afterward

### 2. Resale handoff (`F2`)

- Current holder can list when policy allows
- Other guest can buy the listed pass
- Holder clearly changes after purchase
- The old holder no longer looks like the active holder

### 3. Redemption / check-in (`F4`)

- Issuer confirms the current holder before redemption
- Issuer uses **Mark used** as the live redemption step
- After redemption, the pass is clearly **USED**
- A second use should clearly fail

### 4. Freeze / unfreeze (`F3`, optional)

- Issuer can freeze the current holder
- Holder-facing screens show movement is blocked
- Issuer can unfreeze
- The pass returns to a normal active flow afterward

## State model checkpoints

### Active vs used vs retired

These should not blur together:

- **ACTIVE / HELD** = currently usable by the live holder
- **FROZEN** = live but temporarily blocked
- **USED** = redeemed and closed
- **RETIRED** = old inventory/history, not active supply

### Inventory after reset

If reset is shown or used backstage:

- fresh slots become the active inventory
- older serials are treated as history, not bookable supply
- UI should not present retired inventory as a valid option

## Two-human demo checkpoints

Recommended live mapping:

- `guestA` = first human participant
- `guestB` = second human participant
- `issuer` = provider/operator

The flow should make these moments obvious:

1. first human books
2. first human lists for resale
3. second human buys
4. issuer redeems with **Mark used**

## Review questions

Use these before merge or before a demo run:

1. Does `/slots` show only live inventory as bookable?
2. Does `/slots/[serial]` clearly distinguish active, frozen, used, and retired states?
3. Does `/my-bookings` prioritize active holdings over history?
4. Does `/resale/[serial]` explain when a right is no longer eligible?
5. Does `/issuer` make redemption and retired-inventory state easy to understand?
6. Can two people accidentally appear to use the same pass, or does the issuer redemption step clearly close the lifecycle?

## Current expectation

For the demo to feel credible:

- only the **current holder** should be able to redeem the pass
- the issuer must mark it used at redemption
- once used, it must no longer feel active anywhere in the product
