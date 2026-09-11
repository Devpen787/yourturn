# Hedera 45-USDC LIVE/TESTNET Proof Runbook + Qualification Record

Purpose: preserve the exact canonical Hedera proof contract and its reviewer-safe qualification record. This document **does not authorize funding, signing, another submission, secret changes, mainnet use, or production deployment**.

## Frozen product semantics

- Booking: Friday Yoga.
- Holder mandate minimum: **40 USDC**.
- Below-minimum negative: **32 USDC** → blocked before transfer/settlement.
- Canonical successful offer: **45 USDC**.
- Customer outcome: **`You recovered 45 USDC`**.
- Provider policy is pre-defined/load-bearing; no manual provider approval is added for a compliant recovery.

## Current qualification — COMPLETE for the exact Hedera transaction boundary

The former testnet-liquidity prerequisite is resolved. **No additional funding action is required or authorized by this runbook.**

Qualified sponsor checkpoint:

`feature/ethonline-hedera@411f703e164cac82b5498c1f25a2cf21af7bc4be`

Credential-bearing canonical transaction lineage:

`4e21ad340b9ac9d14567aeeb57f528a4353fcd83`

Exact public Hedera Testnet transaction:

`0.0.8504405@1789139309.785362819`

Verification / review:

- exact-head Continuity `34616924464` — SUCCESS;
- existing-live-proof verification `34614623240` — SUCCESS;
- independent Security attacker `12aafe157a3f854fd507b99439ef864060310165`;
- Security run `34617031728`, job `103321398168` — SUCCESS;
- Security artifact `10270457474`;
- Security disposition: #16 comment `5636886313`.

The independent review re-read public Testnet state rather than trusting filtered sponsor output. It established:

- exactly one BOOKED NFT transfer: token `0.0.8505698`, serial `213`, `0.0.8504300 -> 0.0.8504715`, `is_approval=true`;
- exactly two fungible-token transfer entries, both testnet USDC `0.0.429274`;
- exact USDC movement: `-45,000,000` from `0.0.8504405`, `+45,000,000` to `0.0.8504300`;
- transaction result `SUCCESS`;
- final owner of serial `213`: `0.0.8504715`;
- final observed USDC balances: `34,980,000` for `0.0.8504405` and `45,020,000` for `0.0.8504300`.

The independent verifier also rejected widened or incorrect in-memory variants: an extra NFT transfer, an extra unrelated fungible transfer, the wrong USDC amount, and the wrong NFT receiver.

## Policy boundary proven alongside the live settlement

The same review re-executed the policy controls without secrets or mutation:

1. **32-USDC negative**
   - decision: `BLOCK / BELOW_MINIMUM_RECOVERY`;
   - 0 nonce reservations;
   - no `RETURN_BYTES`;
   - static execution-order assertions require denial before owner-secret loading.

2. **45-USDC positive**
   - same 40-USDC minimum;
   - preparation succeeds;
   - decoded bytes pass the exact NFT + USDC semantic validator;
   - static execution-order assertions require semantic validation before spender-secret loading/signing.

H2 guarded policy/replay remains separately qualified at `CI/LOCAL + Security`; the live settlement does not relabel every H2 component as LIVE.

## Exact code / evidence mapping

| Requirement | Code path | Evidence |
| --- | --- | --- |
| 40-USDC mandate minimum / 32-USDC block | `lib/hedera-agent-kit/policy-authorized-usdc-recovery.ts`, `scripts/hedera-policy-usdc-recovery-live.mjs` | independent re-execution in Security run `34617031728` |
| Exact combined booking + USDC semantics | `lib/hedera-agent-kit/usdc-recovery-semantics.ts` | decoded transaction semantics + independent widened-transfer attacks |
| Existing live public transaction verification | `scripts/hedera-usdc-recovery-existing-proof.mjs`, workflow `.github/workflows/ethonline-hedera-usdc-recovery-existing-proof.yml` | run `34614623240`; public tx `0.0.8504405@1789139309.785362819` |
| Independent live-artifact qualification | Security attacker `12aafe157a3f854fd507b99439ef864060310165` | run `34617031728`, artifact `10270457474`, #16 comment `5636886313` |

## Claim boundary

Allowed judge-facing wording:

> On Hedera Testnet, YourTurn atomically settled the booking NFT and 45 USDC in one successful Hedera transaction.

Equivalent wording is allowed only when **atomicity is explicitly scoped to this single Hedera settlement transaction**.

Do **not** claim:

- the entire Ledger → World → Hedera recovery workflow is atomic;
- the serial-allowance setup occurred in the same transaction;
- the final cross-sponsor adversarial E2E is complete;
- the one-shot in-process replay store used for this LIVE proof is itself durable Redis replay evidence.

Durable replay remains a separate CI/Security-cleared claim, and the final integrated authority path remains a separate submission gate.

## Evidence privacy

Reviewer-safe evidence may include only exact public source SHAs, workflow/run/artifact references, public Hedera testnet transaction IDs, token/serial/account IDs needed to establish the public transaction, receipt/final state, and evidence labels.

Never publish private keys, raw environment output, secret values, recovery material, or unrelated account data.

## Reproduction rule

This record is no longer a funding or execution request. Any later reproduction must independently re-establish testnet role/state prerequisites and receive the appropriate human/security authorization before signing or submitting. A rerun is **not required for the existing qualified transaction-boundary claim** unless the qualifying code/evidence claim changes.
