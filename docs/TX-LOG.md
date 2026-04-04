# Transaction log (Hedera testnet proof)

Record **only** real testnet transactions here.  
HashScan base (default): `https://hashscan.io/testnet`

## Network & resources

| Field | Value |
|--------|--------|
| Network | `testnet` |
| Token ID | `0.0.8505698` |
| HCS topic ID | `0.0.8505699` |
| Treasury account | `0.0.8504300` |
| Fee collector (royalty) | `0.0.8504300` |
| Guest A / Person A | `0.0.8504405` |
| Guest B / Person B | `0.0.8504715` |

**Mirror (read-only):** `https://testnet.mirrornode.hedera.com/api/v1`

## Flow proofs (paste tx id + HashScan link)

| Flow | Tx ID | HashScan / notes |
|------|--------|------------------|
| **F1** Primary book (`POST /api/book`) | `0.0.8504300@1775311056.646893028` | [HashScan](https://hashscan.io/testnet/transaction/0.0.8504300-1775311056.646893028) — serial `32` moved treasury → Person A (`0.0.8504405`) |
| **F2** Resale buy (`POST /api/resale-buy`) | `0.0.8504300@1775311076.681678722` | [HashScan](https://hashscan.io/testnet/transaction/0.0.8504300-1775311076.681678722) — serial `32` moved Person A → Person B; Mirror `assessed_custom_fees` shows a single `140000000` tinybar HTS royalty to fee collector `0.0.8504300` |
| **F3** Freeze (`POST /api/freeze`) | `0.0.8504300@1775311165.395183233` | [HashScan](https://hashscan.io/testnet/transaction/0.0.8504300-1775311165.395183233) — froze serial `33` for Person A (`0.0.8504405`) |
| **F3** Unfreeze (`POST /api/unfreeze`) | `0.0.8504300@1775311174.322191867` | [HashScan](https://hashscan.io/testnet/transaction/0.0.8504300-1775311174.322191867) — unfroze serial `33` for Person A (`0.0.8504405`) |
| **F4** Mark used / return to treasury | `0.0.8504300@1775311104.625214821` | [HashScan](https://hashscan.io/testnet/transaction/0.0.8504300-1775311104.625214821) — serial `32` moved Person B → treasury during redemption |
| **F4** Burn after redemption | `0.0.8504300@1775311102.263715214` | [HashScan](https://hashscan.io/testnet/transaction/0.0.8504300-1775311102.263715214) — token burn for serial `32`; slot detail now shows `USED` and closed lifecycle |

## Demo-complete proof checks

Use these checks alongside the tx rows above:

- Person A books and becomes the current holder
- Person A lists the pass for resale
- Person B buys and becomes the new current holder
- Issuer can see the holder change
- Issuer marks the pass **used**
- After `USED`, the pass no longer looks active
- Person A no longer looks redeemable after Person B buys
- Repeating `POST /api/mark-used` on serial `32` returns `CONFLICT: Serial is already burned (USED)`
- Repeating `POST /api/book` on serial `32` returns `CONFLICT: Slot is not available for booking`

## Optional

| Item | Link / id |
|------|-----------|
| Token on HashScan | [0.0.8505698](https://hashscan.io/testnet/token/0.0.8505698) |
| Topic on HashScan | [0.0.8505699](https://hashscan.io/testnet/topic/0.0.8505699) |
| **F7** refund (if built) | _TBD_ |

## How to capture

1. After each successful API action, copy **`txId`** from the JSON response (or issuer UI message) if returned.  
2. Open HashScan: `https://hashscan.io/testnet/transaction/<tx-id-with-dashes>` (replace `@` in id with `-` if needed).  
3. Paste one row per meaningful proof transaction.
