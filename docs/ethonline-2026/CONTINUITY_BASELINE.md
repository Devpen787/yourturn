# ETHOnline 2026 Continuity Baseline — YourTurn

## Immutable baseline

- Repository: `Devpen787/yourturn`
- Baseline branch at event start: `codex/ethglobal-final-public`
- Baseline SHA: `d0b5f875afb4f2b29af29bc5972cf1edc404d473`
- Baseline date: 2026-06-20
- ETHOnline implementation branch root: `feature/ethonline-2026-foundation`

Do not rewrite, squash away, or blur this baseline. Every ETHOnline claim must be provable as a diff from the SHA above.

## What already existed before ETHOnline

The following are PRE-EXISTING and MUST NOT be claimed as new ETHOnline work:

- Hedera Token Service booking-right NFTs
- booking, transfer/resale, cancel/release and used-state lifecycle
- Hedera Consensus Service lifecycle/audit events
- Mirror Node and HashScan verification
- Hedera Schedule Service recovery-payment proof
- real testnet HBAR refund/release paths
- Hedera Agent Kit v4 runtime
- `MaxRecipientsPolicy(1)`, `RejectToolPolicy`, `HcsAuditTrailHook`
- YourTurn provider/recovery policy checks
- server-issued delegated approval grants
- bounded HBAR/HTS budget logic
- wallet-funded HTS/USDC allowance proof
- Hedera x402 `recovery-policy` endpoint
- successful HBAR and Hedera-USDC x402 settlement through Blocky402
- A2A-style `/.well-known/agent.json`
- `/api/agent/capabilities`, `/api/agent/read`, `/api/agent/preview`, `/api/agent/confirm`
- Telegram Concierge transport
- reviewer proof pages and machine-readable proof bundle

## Known baseline limitations that ETHOnline may legitimately fix

These are explicitly documented in the existing repository and are strong Continuity targets:

1. Write actions are still centered on server-managed demo accounts.
2. There is no production-style end-user wallet delegation for agent authority.
3. Agent approval grants are minted by trusted backend code.
4. Agent confirm lacks an idempotency/replay key.
5. User-facing recovery is still much less polished than the reviewer proof surface.
6. Existing x402 support proves a payable service, but not a complete external-agent discovery -> paid policy request -> delegated execution journey.
7. Hedera-USDC exists in proof paths, but the core customer recovery UX does not yet make USDC settlement a first-class, comprehensible choice.

## Continuity rule

A feature counts as ETHOnline work only when all three are true:

1. It was not present at the baseline SHA.
2. The implementation is substantive product, protocol, or architecture work — not polish alone.
3. The new behavior has evidence: tests, live/testnet proof, UI proof, or independently reviewable artifacts.

## Claim labels

Use these labels in docs, UI and submission material:

- `baseline` — existed before ETHOnline.
- `new-live` — built during ETHOnline and verified against a live service/testnet.
- `new-local` — built during ETHOnline and deterministically verified locally.
- `new-simulated` — built during ETHOnline but only simulated; never imply live execution.
- `blocked` — intended but not completed because an external dependency or access path is unavailable.
- `roadmap` — not part of the judged implementation.

## Submission defense

The submission must include:

- the baseline SHA above;
- a concise before/after table;
- a link to the ETHOnline branch/PR history;
- a machine-readable acceptance/evidence summary;
- explicit sponsor-specific evidence pages or sections;
- no claim that old Hedera/x402/Agent Kit work was built during ETHOnline.
