# Economics

This file describes the intended pricing and incentive model for the current `YourTurn` / Booked Rights MVP.

Use it to keep product copy, demo narration, and implementation decisions aligned.

## Current MVP truth

- The issuer sets the **primary price** for each slot.
- The issuer sets whether **resale is allowed** for each slot.
- The current MVP uses a **fixed 10% issuer royalty** on secondary resale.
- The current holder can set any positive **resale ask**.
- A holder may resell:
  - above cost
  - at cost
  - below cost
- The issuer must mark the pass **used** at redemption to close the lifecycle.

## Actor economics

| Actor | What they control | What they pay or earn | What they need to understand |
|-------|-------------------|-----------------------|------------------------------|
| Issuer / provider | Primary price, resale allowed, lifecycle controls | Earns on the primary booking and earns a royalty on secondary resale when enabled | Secondary movement can still benefit the issuer, not just the reseller |
| Primary buyer / current holder | Whether to keep or resell, and at what ask | Pays the primary price; may later recover value, break even, profit, or take a loss | They hold the right until it is transferred, frozen, used, or retired |
| Resale seller | The resale ask | Intended economics: seller proceeds = ask minus issuer royalty | A premium resale increases proceeds; a discounted resale reduces recovery |
| Resale buyer | Whether to buy at the current ask | Pays the resale ask | They become the new current holder and only the current holder should be redeemable |

## Current pricing model

### Primary sale

- Buyer pays the slot's primary price.
- Issuer receives the booking revenue.
- Buyer becomes the current holder of the booking right.

### Secondary sale

- Seller sets the resale ask.
- Buyer pays the ask.
- Issuer royalty applies on the move.
- Intended product economics:
  - `issuer royalty = ask × royalty rate`
  - `seller proceeds = ask - issuer royalty`

### Redemption

- The current holder may attend or use the service.
- The issuer must mark the pass **used** at redemption or check-in.
- After `USED`, the pass should no longer look active anywhere in the product.

## Examples

These examples use the current MVP royalty of **10%**.

| Scenario | Original primary price | Resale ask | Issuer royalty | Seller proceeds | Buyer pays |
|----------|------------------------|------------|----------------|-----------------|-----------|
| At cost | 10 | 10 | 1.0 | 9.0 | 10 |
| Premium resale | 10 | 15 | 1.5 | 13.5 | 15 |
| Discounted resale | 10 | 7 | 0.7 | 6.3 | 7 |

These examples are useful for the live demo because they show:

- the issuer still participates in secondary value
- holders can sell at a premium when demand is strong
- holders can cut losses when plans change

## Product direction after the MVP

The intended product model is broader than the current hardcoded demo:

- The issuer should be able to set:
  - primary price
  - resale allowed: yes or no
  - royalty rate: for example `0%`, `5%`, `10%`, `15%`
- The holder should still be able to set:
  - the resale ask

That means the long-term pricing model should support:

- **no royalty** if the issuer wants secondary movement without a take
- **modest royalty** if the issuer wants to participate in resale
- **premium, at-cost, or discounted resale** by the holder

## Important implementation note

The economic model above is the intended product story.

The current MVP still needs one thing to stay disciplined:

- resale UI copy and settlement preview must match the actual Hedera transaction outcome

Until that is fully proven in testnet logs, the safest demo wording is:

- the holder sets the resale ask
- the issuer royalty applies on secondary movement
- the final settlement should be verified from the transaction result and `docs/TX-LOG.md`

## Demo framing

For a strong live demo:

1. Show a primary booking.
2. Show a resale listing at a clear ask.
3. Explain who benefits:
   - issuer still earns on the move
   - seller can sell above cost, at cost, or below cost
   - buyer becomes the only valid current holder
4. Show issuer redemption via **Mark used**.

This keeps the economics tied to a real lifecycle, not just a fee calculator.
