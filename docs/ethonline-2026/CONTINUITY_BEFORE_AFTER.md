# ETHOnline 2026 — Continuity Before / After

## Before ETHOnline

Frozen pre-event baseline: `d0b5f875afb4f2b29af29bc5972cf1edc404d473`.

YourTurn already had Hedera booking-right NFTs, booking/recovery UI, provider controls, HCS/Mirror proof surfaces, Schedule Service proof, policy-agent work, x402 experiments and earlier Hedera payment paths.

## New during ETHOnline

ETHOnline adds the cross-sponsor authority plane:

1. **Ledger:** a replay-safe, bounded Recovery Mandate and guarded current-authority lifecycle.
2. **World AgentKit:** exact signed requester/resource/intent/freshness/replay verification plus AgentBook binding, without granting booking authority.
3. **Hedera:** current provider/payment/eligibility/chain facts, Bob-funded authorization semantics, one begin-effect boundary, exact retained unsigned transaction bytes, post-confirm/external-signing validation primitives, one-shot dispatch fencing and indexed-receipt reconciliation.

Selected/frozen software: `60a51fe09e735409a1c0b35593bc4413a49016e1`.
Whole-candidate Security: #16 `5650032923`, SOURCE/HOSTED-CI/LOCAL.

## Continuity rule

A feature is described as ETHOnline work only if it is absent from the frozen baseline, substantive, and backed by exact source/evidence. Historical Week-5/NYC evidence remains provenance, not new-work credit.
