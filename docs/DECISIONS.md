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
- `2026-04-04`: Machine-facing booking actions now converge behind an initial `BookingPort` with preview → confirm semantics so future agent flows can stop at explicit approval instead of calling raw route logic directly.
- `2026-04-04`: Agent/backend confirms should use delegated approval grants scoped by action, actor, serial, and expiry; grant minting is a trusted-backend concern, not a public customer flow.
- `2026-06-13`: ETHGlobal recovery proof is hardened before Schedule Service or Telegram; Concierge listing receipts are stored as demo proof artifacts and slot detail reconstructs lifecycle proof from HCS/Mirror state.
- `2026-06-13`: ETHGlobal bounty-first goal is Schedule Service automation plus an Agent Kit-guided financial operation before final video/script; Telegram, wallet/onramp, and real refund flows remain deferred.
- `2026-06-13`: Concierge recovery confirm creates a Hedera Schedule Service testnet payment proof tied to the approved recovery listing; Mirror is the proof source for executed schedule status when SDK schedule info is no longer queryable.
- `2026-06-13`: Wave 8 supersedes the earlier refund deferral: Concierge can now execute an immediate real testnet HBAR refund/release, while scheduled token release/refund, wallet budgets, and live Telegram credential proof remain future scope.
- `2026-04-04` (chain): F2 resale must not manually split HBAR to fee collector when `CustomRoyaltyFee` is on the token — that double-charges royalty; resale atomic transfer is buyer→seller full ask + NFT leg only; HTS collects royalty.
- `2026-04-04` (chain): `TokenBurnTransaction` only burns NFT serials **in treasury**; mark-used must **transfer guest→treasury** then burn when a guest holds the serial.
- `2026-04-04` (chain): Freeze/unfreeze target account is **Mirror holder** for the serial; `holderActor` is validated against Mirror and must match (prevents freezing the wrong demo account).
- `2026-04-04` (product): Canonical logo direction = **calendar + turn** mark; brand colours and rollout rules live in `docs/BRAND-UI.md` with tokens in `app/globals.css` + `tailwind.config.ts` (`brand.*`) and `lib/ui/brand-tokens.ts` (names only).
