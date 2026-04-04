# Decisions

Use short dated bullets only. If a decision changes, add a new bullet instead of rewriting history.

- `2026-04-04`: This repo is now the canonical source of truth for the booked-rights hack build; prep docs are upstream reference, not the live working archive.
- `2026-04-04`: Primary target track = Hedera `No Solidity Allowed`.
- `2026-04-04`: Minimum honest technical fit = `HTS + Mirror Node`.
- `2026-04-04`: `HCS` is optional only if it materially improves the demo or audit story.
- `2026-04-04`: Hero customer = SMB services and classes such as yoga studios, physical therapy practices, and handstand or movement coaching.
- `2026-04-04`: Core product sentence = booked service slots become transferable rights under issuer rules.
- `2026-04-04`: Issuer earns royalty on secondary resale, including premium resale.
- `2026-04-04`: Issuer controls resale, transfer or gifting, forwarding count, rebook window, and expiry or lock deadline.
- `2026-04-04`: Current must-ship flows = `F1` primary booking, `F2` transfer or resale with royalty, and `F4` mark used.
- `2026-04-04`: Strong next layer = `F3` freeze or unfreeze and `F7` cancel or refund.
- `2026-04-04`: Rebook remains an important product rule, but it is not currently inside the minimum must-ship slice.
- `2026-04-04`: Agent is a schedule-and-budget helper for booking, resale, and rebooking; no autonomous signing.
- `2026-04-04` (chain): F2 resale must not manually split HBAR to fee collector when `CustomRoyaltyFee` is on the token — that double-charges royalty; resale atomic transfer is buyer→seller full ask + NFT leg only; HTS collects royalty.
- `2026-04-04` (chain): `TokenBurnTransaction` only burns NFT serials **in treasury**; mark-used must **transfer guest→treasury** then burn when a guest holds the serial.
- `2026-04-04` (chain): Freeze/unfreeze target account is **Mirror holder** for the serial; `holderActor` is validated against Mirror and must match (prevents freezing the wrong demo account).
