# Roadmap

This file splits the work into two tracks:

- **Demo-complete**: what must be true for the live hackathon demo to feel coherent, credible, and complete
- **Product-next**: what naturally follows after the demo works

Use this file to keep scope honest when new ideas come up.

## Demo-complete

The live demo should prove one full three-party service-right lifecycle:

1. **Issuer sets up the business**
   - initializes the demo
   - creates live slots
   - defines price and resale conditions
   - sees active inventory in the issuer console

2. **Person A buys**
   - browses available slots
   - books one
   - becomes the current holder
   - issuer can see that Person A now holds the right

3. **Person A can no longer attend**
   - sees the held pass in their booking area
   - confirms resale is allowed
   - lists the pass under issuer conditions

4. **Person B takes over**
   - sees that the pass is available for resale
   - sees the ask and the basic conditions
   - buys the pass
   - becomes the new current holder

5. **Issuer sees the movement**
   - confirms the current holder changed from Person A to Person B
   - can still apply issuer controls such as freeze or unfreeze if needed

6. **Person B redeems**
   - arrives as the current holder
   - issuer checks live state
   - issuer marks the pass **used**
   - the lifecycle is closed

7. **Everyone can verify the result**
   - issuer sees the final state
   - Person B sees the pass is no longer active
   - proof links / tx ids can be shown when needed

### Demo-complete acceptance checklist

- Issuer setup is understandable and fast
- Only live inventory looks bookable
- Person A can book and clearly becomes the holder
- Person A can list for resale only when policy allows
- Person B can buy the listed pass and clearly becomes the new holder
- Issuer can see the holder change
- Issuer must mark the pass **used** at redemption
- After `USED`, the pass no longer looks active anywhere
- A sold or used pass cannot be used by the previous holder
- The demo can be explained in plain language before chain jargon

### Demo-complete edge cases

- **Double use must fail**: only the current holder can redeem, and once used the pass is closed
- **Frozen pass must not move**: resale or transfer-like movement should clearly fail while frozen
- **Retired inventory must not look live**: after reset, old serials are history, not active supply
- **Listing must become stale when the right changes state**: if bought, used, frozen beyond movement, or retired, it should not keep looking buyable
- **Settlement language must stay honest**: resale copy should not promise seller proceeds that are not yet proven by tx results

## Product-next

These are natural next layers after the demo-complete story works.

### Identity and accounts

- sign up
- log in
- persistent user identity
- role-aware provider vs customer experience
- account-linked pass ownership history

### Discovery and marketplace

- browse classes and sessions as a normal customer
- browse active resale listings separately from primary inventory
- stronger provider pages and business presentation
- better search, filtering, and category views

### Payments and currencies

- show prices in familiar currencies such as USD or EUR
- accept payment beyond HBAR-only demo settlement
- preserve Hedera as the rights and lifecycle layer even if payment rails broaden
- keep issuer royalty and holder proceeds understandable across currencies

### Provider policy controls

- configurable royalty rate, including `0%`
- resale allowed or blocked per slot or policy group
- transfer or gifting rules
- refund or cancellation windows
- stronger provider operations and analytics

### Lifecycle depth

- cancellation / refund (`F7`)
- rebook
- richer transfer options beyond resale-first flow
- clearer holder history and audit views

## Scope rule

If a change does not make **Demo-complete** more believable or more reliable, it should usually wait for **Product-next**.
