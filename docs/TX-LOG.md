# Transaction log (Hedera testnet proof)

Record **only** real testnet transactions here. Replace `_TBD_` after you run the demo flows.  
HashScan base (default): `https://hashscan.io/testnet`

## Network & resources

| Field | Value |
|--------|--------|
| Network | `testnet` |
| Token ID | _TBD_ (also `bookedrights:tokenId` in Redis after `/api/init`) |
| HCS topic ID | _TBD_ (also `bookedrights:topicId` in Redis) |
| Treasury account | _TBD_ (`HEDERA_TREASURY_ID`) |
| Fee collector (royalty) | _TBD_ (`HEDERA_FEE_COLLECTOR_ID`) |
| Guest A | _TBD_ (`HEDERA_GUEST_A_ID`) |
| Guest B | _TBD_ (`HEDERA_GUEST_B_ID`) |

**Mirror (read-only):** `https://testnet.mirrornode.hedera.com/api/v1`

## Flow proofs (paste tx id + HashScan link)

| Flow | Tx ID | HashScan / notes |
|------|--------|------------------|
| **F1** Primary book (`POST /api/book`) | _TBD_ | _TBD_ |
| **F2** Resale buy (`POST /api/resale-buy`) | _TBD_ (paste below) | _TBD_ — see [F2 runbook](#f2-resale--testnet-proof-runbook) |
| **F3** Freeze (`POST /api/freeze`) | _TBD_ | _TBD_ |
| **F3** Unfreeze (`POST /api/unfreeze`) | _TBD_ | _TBD_ |
| **F4** Mark used / burn (`POST /api/mark-used`) | _TBD_ | _TBD_ — if guest held NFT, expect **transfer → treasury** then **burn** (two steps server-side) |

## Optional

| Item | Link / id |
|------|-----------|
| Token on HashScan | _TBD_ |
| Topic on HashScan | _TBD_ |
| **F7** refund (if built) | _TBD_ |

## F2 resale — testnet proof (runbook)

Do this on **your machine** with `npm run dev`, `.env.local`, and guests funded on **testnet**. The app cannot record a real tx id until you run the flow once.

### Preconditions

- **Issuer:** Initialize + **Mint Demo Slots** or **Reset Demo** so you have three **AVAILABLE** slots on `/slots`.
- **Guest A** and **Guest B** have enough **ℏ** for fees + book + buy (book uses primary price from seed; resale uses your chosen ask).
- If guests are **ECDSA**, `HEDERA_GUEST_*_KEY_TYPE=ECDSA` is set (see `.env.example`).

### Steps (UI)

1. **Book as Guest A**  
   - Open **Public slots** (`/slots`).  
   - **Actor:** `guestA` → **Book** one slot.  
   - Optional: **My bookings** → confirm status **HELD** for that serial.

2. **List for resale (seller = Guest A)**  
   - From **My bookings** → **Resell**, or go to `/resale/<serial>` (use the **current** serial from the slots list).  
   - **Actor:** `guestA` (must be the holder).  
   - Set **Ask (ℏ)** (e.g. `20`) → **Create listing**.

3. **Buy as Guest B (F2 transaction)**  
   - On the same resale page, switch **Actor** to **`guestB`**.  
   - **Buy listed slot** → wait for success.  
   - The green line shows `Purchased. Tx: …` — that **tx id** is the F2 proof.

4. **Copy the proof**  
   - Prefer **`hashscanUrl`** from the browser **Network** tab → response JSON of `POST /api/resale-buy` (`hashscanUrl` + `txId`).  
   - Or paste the `txId` from the UI and open HashScan manually.

### HashScan — what to confirm (single royalty path)

The implementation uses **one** `TransferTransaction`: buyer sends the **full ask** to seller **once**, and the **NFT** moves seller → buyer. Issuer royalty is **not** implemented as a second in-app HBAR leg (that would **double** charge with HTS `CustomRoyaltyFee`).

On the transaction in HashScan, check:

- [ ] **NFT transfer** for your **BOOKED** token: **seller (Guest A) → buyer (Guest B)** for the listed serial.
- [ ] **HBAR:** a **single** payment leg matching the **listing ask** from buyer to seller (exact amount depends on how HashScan displays assessed fees; the **app** does not add a separate `addHbarTransfer` royalty line).
- [ ] **Royalty / fee collector:** issuer royalty appears as **HTS-assessed fee** tied to the token’s **custom royalty** (fee collector account), **not** as a duplicate manual split of the same ask in application code.

If anything fails, read the JSON **error** from `resale-buy` and confirm listing **ask** matches what you expect.

### Paste your F2 proof here (replace `_TBD_`)

| Field | Value |
|--------|--------|
| Date (UTC) | _TBD_ |
| Listed ask (ℏ) | _TBD_ |
| Serial | _TBD_ |
| **Transaction ID** | _TBD_ |
| **HashScan** | _TBD_ |
| Verified checklist (yes/no) | _TBD_ (see bullets above) |

Then copy the **Transaction ID** and **HashScan** link into the **F2 row** in the table at the top of this file.

---

## How to capture

1. After each successful API action, copy **`txId`** from the JSON response (or UI message). For resale, use **`hashscanUrl`** from `POST /api/resale-buy` when present.  
2. HashScan path: `https://hashscan.io/testnet/transaction/<id>` — if the link 404s, paste the tx id into HashScan’s search; SDK ids use `@` between account and valid start (e.g. `0.0.x@y.z`).  
3. Paste one row per meaningful proof transaction in the table above, and fill section templates (e.g. F2) for judges/teammates.
