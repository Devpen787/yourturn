# Demo

## Hero scenario

A customer booked a yoga, physio, or coaching slot and can no longer make it. They transfer or resell the slot under the issuer's rules, and the issuer still earns on the move.

## Core stage line

Booked Rights makes a booked service slot transferable without giving up issuer control.

## Must-ship demo order (spec)

1. Show listed slot
2. Primary booking (`F1`)
3. Transfer or resale with issuer royalty (`F2`)
4. Mark used (`F4`)

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

**Prerequisites:** env + Redis configured per `README.md`; demo uses `guestA` / `guestB` / `issuer` from `ActorSelector` (stored in `localStorage`).

### A. Issuer — prepare chain state

1. Open **`/issuer`** (Provider console).
2. **Initialize** — `POST /api/init` (token + topic ids).
3. **Mint Demo Slots** — seeds slots and NFTs for the demo.
4. Confirm the **Current slots** table shows rows with status **AVAILABLE** where expected.

### B. Guest — primary book (`F1`)

5. Open **`/slots`** (Book).
6. Set **Actor** to **guestA** or **guestB** (must match who should hold the NFT).
7. Click **Book** on an **AVAILABLE** row — `POST /api/book`.
8. Confirm success message (includes tx id when returned).
9. Optional: open **`/slots/[serial]`** for that serial — status **HELD**, holder account visible; use HashScan links under **Proof links** if demonstrating verification.

### C. Guest — resale (`F2`)

10. From **`/slots/[serial]`** (if resale allowed) use **List for resale**, or open **`/resale/[serial]`** directly.
11. Ensure **Actor** is the **current holder** (guestA or guestB) for **create listing** — `POST /api/resale-list` with ask price.
12. Switch **Actor** to the **other** guest (or same flow as your script) and **Buy** — `POST /api/resale-buy`.
13. Refresh or revisit **`/slots/[serial]`** and **`/my-bookings`** to show updated holder / status.

### D. Issuer — close lifecycle (`F4`)

14. Return to **`/issuer`**. Confirm table shows correct holder for the serial (guestA/guestB mapping from env ids).
15. Set **Mark used** serial to that NFT — **Mark used** — `POST /api/mark-used`.
16. Show **USED** state on **`/slots/[serial]`** or guest hub as appropriate.

### E. Optional — freeze (`F3`)

- On **`/issuer`**, set **Freeze / unfreeze** serial and **Holder** to match **Mirror holder** (UI can pre-fill from table). **Freeze** / **Unfreeze** — `POST /api/freeze` or `POST /api/unfreeze`.
- On **`/slots/[serial]`** or **`/my-bookings`**, explain that movement is blocked until unfreeze.

## Strong optional add-ons

- Freeze / unfreeze (`F3`) — wired as above
- Cancel / refund (`F7`) — **not** in shipped UI yet (`docs/TASKS.md`)

## Demo rules

- Keep the happy path under 60 seconds
- Use plain language, not blockchain jargon
- Show at least one real Hedera testnet proof point (log tx ids in `docs/TX-LOG.md`)
- If showing `F7` in future, use a separate booking from the one you plan to mark used
- Only show `HCS` if it helps the audience understand the story faster (topic messages appear on slot detail)

## Related docs

- `docs/UI-MAP.md` — routes, components, APIs, flow diagram
- `docs/PERSONAS-EXPECTATIONS.md` — expectations by role (customer, holder, issuer, judge, operator)
- `docs/SPEC.md` — acceptance criteria for F1, F2, F3, F4, F7
- `docs/TASKS.md` — implementation checklist and deferrals
