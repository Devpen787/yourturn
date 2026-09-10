# Stakeholder Coverage Gate

Use this before starting any journey set after the current ETHOnline holder-recovery hero.

Canonical architecture: `docs/product-workbench/stakeholder-journeys.md`.

## Required questions

1. Which stakeholder class is the journey for: provider or customer?
2. If customer, is the user the current holder or the next holder/acquirer?
3. What provider rule makes the action valid or invalid?
4. What holder authority is required?
5. What acquirer eligibility/payment condition is required?
6. What authoritative booking state changes when the journey succeeds?
7. Can the provider understand the resulting holder/booking state without approving every compliant recovery manually?
8. Can the current holder see that the booking left their usable inventory and that value was recovered?
9. Can the new holder see the same booking as a normal usable booking?
10. Are all three perspectives consistent with one underlying state transition?

## Hard completion rule

A future end-to-end recovery/exchange journey is incomplete unless it can account for:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`

and close the state on all relevant sides:
- provider sees the valid current holder / fulfilment state;
- previous holder no longer has a usable booking and receives the correct recovery outcome;
- new holder receives a usable booking and can fulfil/check in.

A blockchain transaction, agent receipt, or holder-only success screen is not enough.

## Sequencing

Do not interrupt active YT-05→YT-08 work.

After that set becomes Golden, apply this gate before widening YT-09/YT-10. Map the acquirer lane and provider lane first, then choose the smallest connected slices needed for ETHOnline and queue the remaining productization work for after submission.