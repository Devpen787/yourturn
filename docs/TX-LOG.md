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
| **F2** Resale buy (`POST /api/resale-buy`) | _TBD_ | _TBD_ — confirm **single** issuer royalty (HTS `CustomRoyaltyFee`); no double HBAR split in app; confirm Person B becomes current holder |
| **F3** Freeze (`POST /api/freeze`) | _TBD_ | _TBD_ |
| **F3** Unfreeze (`POST /api/unfreeze`) | _TBD_ | _TBD_ |
| **F4** Mark used / burn (`POST /api/mark-used`) | _TBD_ | _TBD_ — if guest held NFT, expect **transfer → treasury** then **burn** (two steps server-side); confirm pass is closed after redemption |

## Demo-complete proof checks

Use these checks alongside the tx rows above:

- Person A books and becomes the current holder
- Person A lists the pass for resale
- Person B buys and becomes the new current holder
- Issuer can see the holder change
- Issuer marks the pass **used**
- After `USED`, the pass no longer looks active
- Person A no longer looks redeemable after Person B buys

## Optional

| Item | Link / id |
|------|-----------|
| Token on HashScan | _TBD_ |
| Topic on HashScan | _TBD_ |
| **F7** refund (if built) | _TBD_ |

## How to capture

1. After each successful API action, copy **`txId`** from the JSON response (or issuer UI message) if returned.  
2. Open HashScan: `https://hashscan.io/testnet/transaction/<tx-id-with-dashes>` (replace `@` in id with `-` if needed).  
3. Paste one row per meaningful proof transaction.
