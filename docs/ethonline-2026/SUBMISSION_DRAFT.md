# ETHOnline 2026 — Submission Draft

## Title

**YourTurn — Human-authorized autonomous booking recovery**

## One-line pitch

YourTurn lets a traveler safely delegate one booking recovery to a human-backed agent: Ledger authorizes the bounded mandate, World verifies the exact requester, and Hedera enforces the booking/payment outcome without giving the agent broad wallet custody.

## Problem

Travel bookings become brittle when plans change. A user may want an agent to recover value—resell a booking, satisfy provider rules, find an eligible buyer and settle payment—but today that usually means giving the agent too much authority or trusting a centralized intermediary to act correctly.

## What YourTurn adds during ETHOnline

The pre-event YourTurn product already had tokenized bookings, recovery UX and earlier Hedera/agent experiments. ETHOnline adds a new cross-sponsor authority plane:

1. **Ledger Recovery Mandate** — the holder signs a narrow, human-readable mandate for one booking serial, one `resale` action, one minimum seller-net recovery, one settlement asset, expiry and nonce.
2. **World AgentKit / AgentBook** — the canonical request verifies that the exact delegated requester is human-backed and registered. That signal never replaces YourTurn's booking authorization.
3. **Hedera** — current provider rules, booking allowance, Bob-funded USDC economics and custom royalty state are re-read before the one-time effect begins. Exact transaction bytes are retained before external signing and the final outcome is verified from indexed chain evidence.

## Core flow

Maya holds the booking and authorizes a bounded recovery mandate. A registered World-backed agent requests that exact operation. YourTurn recomputes the canonical intent from current server/chain facts, checks provider policy and Bob's eligibility/payment authorization, and atomically moves the operation into `effect-started` before preparing the exact Hedera transaction. Bob funds the purchase; Maya receives seller net proceeds; any owner-approved royalty is paid exactly as committed. External signing is validated both before signing and before submission. Final completion is based on the exact indexed Hedera receipt.

## Why the three sponsors are load-bearing

### Ledger
Ledger protects the human authorization artifact. A valid mandate alone does not bypass current booking ownership, provider policy, replay state, expiry or Hedera checks.

### World
World proves the exact requester is human-backed. It does **not** prove that requester owns Maya's booking or may sell it; the Ledger/application authority remains independent.

### Hedera
Hedera provides the serial-scoped booking authority, official testnet USDC settlement surface, transaction identity and independently readable final receipt state.

## Product experience

The approved R5 Product journey covers Maya, Bob and Studio A across listing, provider-floor changes, expiry, first-payment failure and explicit retry, successful receipt, and cancellation propagation. Product bytes are frozen at approved SHA `342f46ee6e0c4d0f332287d8433735c5ac015528` and are composed byte-for-byte with the final runtime lane.

## Security / sovereignty choices

- no agent custody of Maya's Ledger private key;
- no server signing of the canonical Hedera settlement transaction;
- no World claim used as holder authority;
- no client-supplied provider/payment/eligibility/chain authority;
- one atomic begin-effect owner;
- retained exact output before external signing;
- no automatic retry after an unknown submission outcome;
- seller minimums apply to seller **net**, not gross;
- final evidence is transaction/receipt scoped rather than inferred from UI success.

## Demo sequence

1. Start at the repository README and `/product-preview`.
2. Show Maya → Bob → Studio A R5 journey and retry/cancellation coherence.
3. Show the exact Ledger Recovery Mandate scope.
4. Show the read-only World canonical challenge and signed request binding.
5. Show the operation crossing once into retained `effect-started` Hedera output.
6. Show BEFORE_SIGN → external executor signature → BEFORE_SUBMIT.
7. Show the fresh testnet transaction and Mirror/HashScan evidence.
8. Show final receipt: booking serial owner, Bob gross debit, Maya net proceeds, royalty if configured, fee payer and completed operation.

## Continuity framing

Historical Week-5 / ETHGlobal NYC evidence remains in the repository as provenance. The ETHOnline claim is specifically the new authority, identity and settlement composition added during this event. The final README and evidence manifest distinguish pre-event, fixture/CI, DEVICE and LIVE/TESTNET evidence.

## Current claim status

This draft intentionally stays conservative until the final human ceremony is complete. The following must be inserted from the final exact candidate before submission:

- `[FINAL_SHA]`
- `[FINAL_SECURITY_DISPOSITION]`
- `[LEDGER_DEVICE_EVIDENCE]`
- `[WORLD_SIGNED_ROUTE_EVIDENCE]`
- `[HEDERA_TX_ID]`
- `[HASHSCAN_LINK]`
- `[MIRROR_EVIDENCE]`
- `[FINAL_INDEXED_RECEIPT_DIGEST]`
- `[FINAL_COLD_JUDGE_RESULT]`
- `[DEMO_VIDEO_URL]`

Do not replace these placeholders with historical evidence from a different path.

## Useful repository entry points

- `README.md`
- `docs/ethonline-2026/FINAL_EVIDENCE.json`
- `docs/ethonline-2026/HUMAN_CEREMONY.md`
- `docs/ethonline-2026/COLD_JUDGE_RUNBOOK.md`
- `docs/ethonline-2026/WORLD_CEREMONY.md`
- `docs/ethonline-2026/HEDERA_ONE_SHOT_SUBMITTER_SPEC.md`
- GitHub issues #18 (finish-line ledger), #16 (Security), #5 (integration selection)
