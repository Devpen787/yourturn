# Transaction log (Hedera testnet proof)

Record **only** real testnet transactions here after you run the flows locally. Replace every `_TBD_` with values from your environment and from API responses (DevTools → **Network** → select the `POST` → **Response**).

**Why this file still has `_TBD_`:** Nobody can paste your real tx ids without your keys and a live `npm run dev` run. The app now returns **`txId`**, **`hashscanUrl`**, and (where applicable) **`lifecycleTxId`** / **`lifecycleHashscanUrl`** so you can copy them in one shot.

HashScan base (default): `https://hashscan.io/testnet`

---

## Network & resources

Fill this from `.env.local` and from **Issuer** after **Initialize** (or from Redis `bookedrights:tokenId` / `bookedrights:topicId`).

| Field | Value |
|--------|--------|
| Network | `testnet` |
| Token ID | _TBD_ |
| HCS topic ID | _TBD_ |
| Treasury account | _TBD_ (`HEDERA_TREASURY_ID`) |
| Fee collector (royalty) | _TBD_ (`HEDERA_FEE_COLLECTOR_ID`) |
| Guest A | _TBD_ (`HEDERA_GUEST_A_ID`) |
| Guest B | _TBD_ (`HEDERA_GUEST_B_ID`) |

**Mirror (read-only):** `https://testnet.mirrornode.hedera.com/api/v1`

---

## Flow proofs — main table (for reviewers)

| Flow | Primary proof (HTS / main tx) | HashScan | Optional HCS lifecycle tx |
|------|------------------------------|----------|-------------------------|
| **F1** Primary book | _TBD_ (`POST /api/book` → `txId`) | _TBD_ (`hashscanUrl`) | _TBD_ (`lifecycleTxId`) |
| **F2** List (app + HCS only) | — (no HTS transfer) | — | _TBD_ (`POST /api/resale-list` → `lifecycleTxId`) |
| **F2** Resale buy | _TBD_ (`POST /api/resale-buy` → `txId`) | _TBD_ (`hashscanUrl`) | _TBD_ (`lifecycleTxId`) |
| **F3** Freeze | _TBD_ (`POST /api/freeze` → `freezeTxId`) | _TBD_ (`freezeHashscanUrl`) | _TBD_ (`lifecycleTxId`) |
| **F3** Unfreeze | _TBD_ (`POST /api/unfreeze` → `unfreezeTxId`) | _TBD_ (`unfreezeHashscanUrl`) | _TBD_ (`lifecycleTxId`) |
| **F4** Mark used / burn | _TBD_ — see [F4 notes](#f4-mark-used--burn) | _TBD_ | _TBD_ (`lifecycleTxId`) |

---

## API responses — which fields to copy

| Endpoint | JSON fields (on success) |
|----------|---------------------------|
| `POST /api/book` | `txId`, `hashscanUrl`, `lifecycleTxId`, `lifecycleHashscanUrl` |
| `POST /api/resale-list` | `lifecycleTxId`, `lifecycleHashscanUrl` (listing is Redis + HCS only) |
| `POST /api/resale-buy` | `txId`, `hashscanUrl`, `lifecycleTxId`, `lifecycleHashscanUrl` |
| `POST /api/freeze` | `freezeTxId`, `freezeHashscanUrl`, `lifecycleTxId`, `lifecycleHashscanUrl` |
| `POST /api/unfreeze` | `unfreezeTxId`, `unfreezeHashscanUrl`, `lifecycleTxId`, `lifecycleHashscanUrl` |
| `POST /api/mark-used` | `returnToTreasuryTxId` (or `null` if slot was already treasury), `returnToTreasuryHashscanUrl`, `burnTxId`, `burnHashscanUrl`, `lifecycleTxId`, `lifecycleHashscanUrl` |

**Issuer UI:** After **Freeze**, **Unfreeze**, or **Burn / withdraw slot**, the green banner also appends the main tx ids when present.

---

## How to capture (quick)

1. Open Chrome/Edge **DevTools** → **Network** → filter **Fetch/XHR**.
2. Run the action in the UI (or call the API with curl).
3. Click the `book`, `resale-buy`, `freeze`, `unfreeze`, `mark-used`, or `resale-list` request → **Response** tab → copy the ids.
4. Open `hashscanUrl` / `*HashscanUrl` links; if a link 404s, paste the raw `txId` into HashScan search (SDK form uses `@`, URLs often use `-`).

---

## End-to-end runbook (F1 → F2 → F3 → F4)

Use **`npm run dev`**, funded testnet guests, and **Initialize** + **Mint Demo Slots** or **Reset Demo** on **Issuer**.

### F1 — Primary book

1. **Guests** → **Browse slots** → Actor **guestA** (or B) → **Associate** if prompted → **Book** a serial.
2. Copy from `POST /api/book`: **`txId`** (F1 HTS proof), **`hashscanUrl`**, optional **`lifecycleTxId`**.
3. Paste into the table above.

### F2 — Resale (list + buy)

1. **My bookings** as seller → **Resell** (or `/resale/<serial>`) → create listing. Copy **`lifecycleTxId`** from `POST /api/resale-list` (HCS **LISTED**).
2. Switch buyer actor → **Buy listed slot**. Copy **`txId`** + **`hashscanUrl`** from `POST /api/resale-buy` (F2 HTS proof — NFT + HBAR leg).
3. See [F2 HashScan checklist](#f2-resale--hashscan-checklist) below.

### F3 — Freeze / unfreeze

1. A guest must **hold** the NFT (after F1 or after F2 buyer holds it).
2. **Issuer** → **Freeze / unfreeze** → serial + **Auto (Mirror holder)** → **Freeze**. Copy **`freezeTxId`** + **`freezeHashscanUrl`** (+ optional HCS).
3. **Unfreeze** the same serial; copy **`unfreezeTxId`** + **`unfreezeHashscanUrl`**.

### F4 — Mark used / burn

- **If NFT is with treasury (AVAILABLE):** one **burn** tx — copy **`burnTxId`** / **`burnHashscanUrl`**. `returnToTreasuryTxId` is **`null`**.
- **If a guest holds it:** server runs **guest → treasury** transfer, then **burn** — copy **`returnToTreasuryTxId`** and **`burnTxId`** (two different HashScan txs).

**Frozen holder:** Unfreeze first (F3), then mark-used (see API error text).

---

## F2 resale — HashScan checklist

The implementation uses **one** `TransferTransaction` for resale: buyer pays seller the **full ask** once; NFT moves seller → buyer. Royalty is **HTS `CustomRoyaltyFee`**, not a second in-app HBAR leg (would double-charge).

On the **resale-buy** transaction in HashScan, confirm:

- [ ] **NFT transfer** for your **BOOKED** token: **seller → buyer** for the listed serial.
- [ ] **HBAR:** a **single** payment leg matching the listing ask (buyer → seller), subject to how HashScan shows assessed fees.
- [ ] **Royalty:** appears as **HTS-assessed** fee to the **fee collector**, not a duplicate manual split in app code.

### F2 paste block (optional detail)

| Field | Value |
|--------|--------|
| Date (UTC) | _TBD_ |
| Listed ask (ℏ) | _TBD_ |
| Serial | _TBD_ |
| **LISTED** HCS tx (`/api/resale-list`) | _TBD_ |
| **RESOLD** HTS tx (`/api/resale-buy`) | _TBD_ |
| **RESOLD** HashScan | _TBD_ |
| Checklist verified (yes/no) | _TBD_ |

---

## Optional links

| Item | Link / id |
|------|-----------|
| Token on HashScan | _TBD_ — `https://hashscan.io/testnet/token/<tokenId>` |
| Topic on HashScan | _TBD_ — `https://hashscan.io/testnet/topic/<topicId>` |
| **F7** refund (if built) | _TBD_ |

---

## F4 mark-used — tx breakdown

| Scenario | `returnToTreasuryTxId` | `burnTxId` |
|----------|------------------------|------------|
| Slot **AVAILABLE** (treasury holds NFT) | `null` | Burn only |
| Slot **HELD** (guest holds NFT) | Guest → treasury transfer | Burn after transfer |

Both scenarios emit a separate **HCS** **`USED`** message (`lifecycleTxId`).
