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
| **ETHGlobal Automation** Schedule create | `0.0.8504300@1781378592.512989452` | [HashScan tx](https://hashscan.io/testnet/transaction/0.0.8504300-1781378592-512989452), [schedule 0.0.9225557](https://hashscan.io/testnet/schedule/0.0.9225557) — approved recovery flow created a `0.01` HBAR scheduled payment for serial `164` |
| **ETHGlobal Automation** Scheduled execution | `0.0.8504300-1781378592-512989452` | [HashScan](https://hashscan.io/testnet/transaction/0.0.8504300-1781378592-512989452) — Mirror shows scheduled `CRYPTOTRANSFER` success at `1781378689.009433978` |
| **ETHGlobal E2E** Primary book (`POST /api/book`) | `0.0.8504300@1781390140.373211752` | [HashScan](https://hashscan.io/testnet/transaction/0.0.8504300-1781390140-373211752) — scripted clean pass booked serial `172` for Person A |
| **ETHGlobal E2E** Schedule create | `0.0.8504300@1781390155.709394404` | [HashScan tx](https://hashscan.io/testnet/transaction/0.0.8504300-1781390155-709394404), [schedule 0.0.9226711](https://hashscan.io/testnet/schedule/0.0.9226711) — approved recovery flow created a `0.01` HBAR scheduled payment for serial `172` |
| **ETHGlobal E2E** Scheduled execution | `0.0.8504300-1781390155-709394404` | [HashScan](https://hashscan.io/testnet/transaction/0.0.8504300-1781390155-709394404) — Mirror shows scheduled `CRYPTOTRANSFER` success at `1781390252.085600004`; schedule status `executed` |
| **ETHGlobal E2E** Resale buy (`POST /api/resale-buy`) | `0.0.8504300@1781390264.368450881` | [HashScan](https://hashscan.io/testnet/transaction/0.0.8504300-1781390264-368450881) — scripted clean pass moved serial `172` from Person A to Person B before provider check-in |
| **Wave 8 E2E** Primary book (`POST /api/book`) | `0.0.8504300@1781393148.007129848` | [HashScan](https://hashscan.io/testnet/transaction/0.0.8504300-1781393148-007129848) — scripted clean pass booked serial `178` for Person A |
| **Wave 8 E2E** Real refund release | `0.0.8504300@1781393158.862791239` | [HashScan](https://hashscan.io/testnet/transaction/0.0.8504300-1781393158-862791239) — serial `179` moved Person A → treasury and `18` HBAR moved treasury → Person A in one testnet transfer |
| **Wave 8 E2E** Refund release close/burn | `0.0.8504300@1781393162.787231448` | [HashScan](https://hashscan.io/testnet/transaction/0.0.8504300-1781393162-787231448) — serial `179` was closed after release |
| **Wave 8 E2E** Refund audit event | `0.0.8504300@1781393166.653109817` | [HashScan](https://hashscan.io/testnet/transaction/0.0.8504300-1781393166-653109817) — HCS `CANCEL_RELEASED` audit event for serial `179`; receipt `d857064c-618a-40fd-b798-f2f5d85a603e` |
| **Wave 8 E2E** Schedule create | `0.0.8504300@1781393179.807048329` | [HashScan tx](https://hashscan.io/testnet/transaction/0.0.8504300-1781393179-807048329), [schedule 0.0.9227051](https://hashscan.io/testnet/schedule/0.0.9227051) — approved recovery flow created a `0.01` HBAR scheduled payment for serial `178` |
| **Wave 8 E2E** Scheduled execution | `0.0.8504300-1781393179-807048329` | [HashScan](https://hashscan.io/testnet/transaction/0.0.8504300-1781393179-807048329) — Mirror shows scheduled `CRYPTOTRANSFER` success at `1781393275.186272004`; schedule status `executed` |
| **Wave 8 E2E** Resale buy (`POST /api/resale-buy`) | `0.0.8504300@1781393273.543596346` | [HashScan](https://hashscan.io/testnet/transaction/0.0.8504300-1781393273-543596346) — scripted clean pass moved serial `178` from Person A to Person B before provider check-in |
| **Wave 9 E2E** Primary book (`POST /api/book`) | `0.0.8504300@1781395625.593456264` | [HashScan](https://hashscan.io/testnet/transaction/0.0.8504300-1781395625-593456264) — scripted clean pass booked serial `184` for Person A |
| **Wave 9 E2E** Real refund release | `0.0.8504300@1781395641.257640813` | [HashScan](https://hashscan.io/testnet/transaction/0.0.8504300-1781395641-257640813) — serial `185` moved Person A -> treasury and `18` HBAR moved treasury -> Person A in one testnet transfer; receipt includes `yourturn.recovery.confirm_refund_release` agent proof |
| **Wave 9 E2E** Refund release close/burn | `0.0.8504300@1781395642.455050030` | [HashScan](https://hashscan.io/testnet/transaction/0.0.8504300-1781395642-455050030) — serial `185` was closed after release |
| **Wave 9 E2E** Refund audit event | `0.0.8504300@1781395645.637309381` | [HashScan](https://hashscan.io/testnet/transaction/0.0.8504300-1781395645-637309381) — HCS `CANCEL_RELEASED` audit event for serial `185`; receipt `dec5d96c-9f17-4c9e-abbd-ec535f53e193` |
| **Wave 9 E2E** Schedule create | `0.0.8504300@1781395660.461031693` | [HashScan tx](https://hashscan.io/testnet/transaction/0.0.8504300-1781395660-461031693), [schedule 0.0.9227309](https://hashscan.io/testnet/schedule/0.0.9227309) — approved recovery flow created a `0.01` HBAR scheduled payment for serial `184`; receipt includes `yourturn.recovery.confirm_listing` agent proof |
| **Wave 9 E2E** Scheduled execution | `0.0.8504300-1781395660-461031693` | [HashScan](https://hashscan.io/testnet/transaction/0.0.8504300-1781395660-461031693) — Mirror shows scheduled `CRYPTOTRANSFER` success at `1781395757.080553984`; schedule status `executed` |
| **Wave 9 E2E** Resale buy (`POST /api/resale-buy`) | `0.0.8504300@1781395755.740976974` | [HashScan](https://hashscan.io/testnet/transaction/0.0.8504300-1781395755-740976974) — scripted clean pass moved serial `184` from Person A to Person B before provider check-in |

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
| Latest ETHGlobal Schedule proof | [0.0.9227309](https://hashscan.io/testnet/schedule/0.0.9227309) |
| Latest **F7** refund/release proof | [0.0.8504300@1781395641.257640813](https://hashscan.io/testnet/transaction/0.0.8504300-1781395641-257640813) |

## How to capture

1. After each successful API action, copy **`txId`** from the JSON response (or issuer UI message) if returned.  
2. Open HashScan: `https://hashscan.io/testnet/transaction/<tx-id-with-dashes>` (replace `@` in id with `-` if needed).  
3. Paste one row per meaningful proof transaction.
