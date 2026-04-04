# Demo

## Hero scenario

A customer booked a yoga, physio, or coaching slot and can no longer make it. They transfer or resell the slot under the issuer's rules, and the issuer still earns on the move.

## Core stage line

Booked Rights makes a booked service slot transferable without giving up issuer control.

## Must-ship demo order (spec)

1. Issuer sets up the business and live slots
2. Person A books a slot (`F1`)
3. Person A lists it for resale and Person B buys it (`F2`)
4. Issuer redeems it by marking it used (`F4`)

## Action model in the current app

- **Two-step with review dialog:** book, list for resale, buy resale, pause pass
- **Typed confirm:** start over, check in / mark used
- **One-step:** set up business, create demo sessions, save session plan, reopen pass, refresh views

Current demo limits:

- bookings are final in this demo; there is no cancel or refund flow yet
- listing a pass is the seller approval step; there is no second approval after the buyer clicks purchase
- buying a listed pass transfers it immediately if the API accepts the action

## Economic framing for the live demo

The audience should be able to understand the incentives quickly:

- the issuer earns on the primary booking
- the issuer can also earn on secondary movement
- the current holder can resell at a premium, at cost, or at a loss
- the buyer becomes the new current holder
- the issuer must mark the pass **used** at redemption to close the lifecycle

For the current MVP, the resale royalty is a fixed **10%**.

See `docs/ECONOMICS.md` for examples and the intended product policy model.

## Shipped UI walkthrough (happy path)

This section matches the **current** Next.js app. Use it for dry runs and judges. For **component and API mapping**, see `docs/UI-MAP.md`.

**Prerequisites:** env + Redis configured per `README.md`; demo uses `guestA` / `guestB` / `issuer` underneath, but the UI frames them as **Person A**, **Person B**, and **Issuer** in `ActorSelector` (stored in `localStorage`).

### A. Issuer — prepare chain state

1. Open **`/issuer`** (Provider console).
2. Optional but now real: set the **Business name** and shape the 3 planned sessions (title, time, location, price, resale policy), then save the plan.
3. **Initialize** — `POST /api/init` (token + topic ids).
4. **Mint Demo Slots** — seeds slots and NFTs for the demo using the saved session plan.
5. Confirm the **Current slots** table shows rows with status **AVAILABLE** where expected.

### B. Person A — primary book (`F1`)

6. Open **`/slots`** (Book).
7. Set **Actor** to the guest who should become the first holder.
8. Click **Book** on an **AVAILABLE** row, review the booking dialog, then confirm — `POST /api/book`.
9. Confirm success message (includes tx id when returned).
10. Open **`/slots/[serial]`** or **`/my-bookings`** and confirm the pass now belongs to Person A.
11. Return to **`/issuer`** and confirm the issuer can also see Person A as the current holder.

### C. Person A — resale (`F2`)

12. From **`/slots/[serial]`** (if resale allowed) use **List for resale**, or open **`/resale/[serial]`** directly.
13. Ensure **Actor** is the **current holder** for **create listing** — review the listing dialog, then `POST /api/resale-list` with ask price.
14. Explain that creating the listing is the seller's approval to sell under issuer conditions.
15. Explain the economics honestly: the current MVP proves a fixed **10%** HTS royalty on resale, and the holder may list above cost, at cost, or below cost.

### D. Person B — buy the resale (`F2`)

16. Switch **Actor** to the other guest.
17. Show that Person B can see the resale offer and current ask.
18. Buy the listed pass — review the purchase dialog, then `POST /api/resale-buy`.
19. Refresh **`/slots/[serial]`** and **`/my-bookings`** to confirm Person B is now the current holder and Person A is not.
20. Return to **`/issuer`** and confirm the issuer also sees the holder change.

### E. Issuer — close lifecycle (`F4`)

21. Return to **`/issuer`**. Confirm table shows Person B as the current holder for the serial.
22. At redemption or check-in, set **Mark used** serial to that NFT — **Redeem / mark used** — `POST /api/mark-used`.
23. Show **USED** state on **`/slots/[serial]`** or the guest hub.
24. Make it explicit that the issuer is the one who closes the lifecycle, so the pass cannot be used again.
25. If needed, show the anti-double-use proof: a second `mark-used` or `book` attempt for the same serial now fails with `CONFLICT`.

### F. Optional — freeze (`F3`)

- On **`/issuer`**, set **Freeze / unfreeze** serial and **Holder** to match **Mirror holder** (UI can pre-fill from table). **Freeze** uses a confirm dialog; **Unfreeze** remains one step — `POST /api/freeze` or `POST /api/unfreeze`.
- On **`/slots/[serial]`** or **`/my-bookings`**, explain that movement is blocked until unfreeze.

## Strong optional add-ons

- Freeze / unfreeze (`F3`) — wired as above
- Cancel / refund (`F7`) — **not** in shipped UI yet (`docs/TASKS.md`)

## Demo rules

- Keep the happy path under 60 seconds
- Use plain language, not blockchain jargon
- Show at least one real Hedera testnet proof point (log tx ids in `docs/TX-LOG.md`)
- Make the three-party story obvious: issuer, Person A, Person B
- Treat **Mark used** as the live redemption step, not just cleanup
- Show that Person A is no longer the valid holder after resale
- If showing `F7` in future, use a separate booking from the one you plan to mark used
- Only show `HCS` if it helps the audience understand the story faster (topic messages appear on slot detail)

## Related docs

- `docs/UI-MAP.md` — routes, components, APIs, flow diagram
- `docs/SPEC.md` — acceptance criteria for F1, F2, F3, F4, F7
- `docs/TASKS.md` — implementation checklist and deferrals
- `docs/INTERNAL.md` — local-only working notes (gitignored `docs/internal/`), not part of the public tree
