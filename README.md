# YourTurn — ETHOnline 2026 Continuity

YourTurn is a bounded booking-recovery system. A holder can delegate a narrowly scoped recovery mandate; a human-backed agent can request the action; provider policy and live booking/economic state are checked; and the recovery can be prepared for Hedera testnet settlement without giving the agent broad wallet authority.

This branch is the finish-line integration lane for **exactly three Continuity tracks**:

- **Hedera** — serial-scoped delegated booking authority and USDC recovery economics.
- **World AgentKit** — proves the exact requesting agent is human-backed; it does not prove booking ownership or permission.
- **Ledger** — protects the human mandate that grants the agent authority; it does not sign the Hedera settlement transaction.

## Judge entry

The human-approved Product R5 journey is available at:

```text
/product-preview
```

The canonical delegated-agent boundary is:

```text
GET  /api/agent/confirm   # read-only challenge built from current server facts
POST /api/agent/confirm   # fresh AgentKit-signed confirmation/status
```

The public confirmation path currently ends at a durable `effect-started` operation with exact retained **unsigned** Hedera transaction bytes. External signing validation and indexed-receipt reconciliation are implemented as server-side lifecycle primitives. No automatic signing, retrying, or network submission is claimed.

For current exact evidence and remaining gates, use:

- [`docs/ethonline-2026/FINAL_EVIDENCE.json`](docs/ethonline-2026/FINAL_EVIDENCE.json)
- [`docs/ethonline-2026/HUMAN_CEREMONY.md`](docs/ethonline-2026/HUMAN_CEREMONY.md)
- [`docs/ethonline-2026/COLD_JUDGE_RUNBOOK.md`](docs/ethonline-2026/COLD_JUDGE_RUNBOOK.md)
- GitHub issue **#18** for the durable finish-line ledger
- GitHub issue **#16** for independent Security dispositions
- GitHub issue **#5** for exact integration selection

## Product truth

The Product fixture is frozen at human-approved R5:

```text
342f46ee6e0c4d0f332287d8433735c5ac015528
```

The finish-line execution branch deliberately composes those exact Product blobs with the newer sponsor/runtime lineage. Product bytes are not rewritten during integration.

The journey covers Maya as holder/seller, Bob as buyer/economic source, and Studio A as provider. R5 includes the required bridge states for provider-floor changes, listing/booking coherence, expiry, retry after first payment failure, and cancellation propagation while preserving the prior receipt.

## Authorization model

The load-bearing path is:

```text
current booking + active Ledger Recovery Mandate
    ↓
canonical server-owned authority projection
    ↓
World verifies the exact requester against that projection
    ↓
current provider policy + eligibility + payment record + public enrollment + Hedera chain facts
    ↓
Bob's exact durable payment authorization
    ↓
one atomic claimed → effect-started transition
    ↓
exact Hedera transaction retained before any external signing
    ↓
BEFORE_SIGN validation → external executor signer → BEFORE_SUBMIT validation
    ↓
(one human-authorized testnet submission; not automated here)
    ↓
Mirror indexed-receipt reconciliation → completed operation
```

Important boundaries:

- World identity is never holder authority.
- Ledger approval never bypasses provider policy, current ownership, expiry, replay, economics, or Hedera allowance checks.
- Bob funds the purchase. Maya receives **seller net proceeds** after any owner-approved royalty; minimum-recovery checks apply to net proceeds.
- The server does not hold Maya's Ledger key or use Ledger to sign Hedera HTS transactions.
- Current integration code does not automatically submit transactions to Hedera.

## Verification

The integration lane has a dedicated workflow:

```text
.github/workflows/finishline-execution.yml
```

It independently proves on the same exact tree that:

- runtime/security-sensitive files remain byte-identical to the frozen runtime checkpoint;
- Product files remain byte-identical to approved R5;
- single-begin operation ownership still holds;
- business eligibility, public provisioning and durable Bob authorization fail closed;
- external-signing validation and indexed receipt verification remain green;
- TypeScript and the production build pass;
- Product R5 state, navigation, failure, Back/Forward/reload and rendered desktop/mobile journeys remain green.

## Continuity — what is new

The pre-event product already had booking NFTs, recovery UI, policy-agent work, HCS/Mirror proof surfaces, Schedule Service proof, x402 experiments and earlier Hedera payment paths.

ETHOnline adds the new cross-sponsor authority plane:

- a replay-safe Ledger Recovery Mandate and guarded owned-operation authority;
- canonical mapping from that mandate to World requester and Hedera executor identities;
- official AgentKit request verification with replay/resource/request-age boundaries;
- operation-scoped current provider/payment/eligibility records;
- configurable D-010 royalty/net-proceeds economics;
- exact Bob-funded Hedera payment authorization;
- one authoritative begin-effect boundary and durable retained transaction output;
- external-signing validation before signing and before submission;
- exact indexed-receipt reconciliation.

## Claim boundaries

### Supported by current software/CI

- Product R5 fixture and journey behavior.
- Canonical World → Ledger → Hedera preparation path at SOURCE/CI/LOCAL scope.
- Current provider/payment/eligibility/public-enrollment fail-closed checks.
- Bob-funded payment semantics and owner-approved royalty calculation.
- External-signing validation and exact indexed-receipt validation primitives.
- No server-side private signing or automatic Hedera submission in the canonical path.

### Requires final human/live evidence before it may be claimed

- Ledger physical-device provenance for the exact Recovery Mandate.
- Ledger approve **and reject** evidence on the final integrated candidate.
- A credential-bearing canonical World signed recovery request and required negative evidence.
- The final public AgentBook/Sandbox evidence attached to that canonical route.
- A fresh Bob-funded Hedera testnet settlement produced by the final integrated path.
- A final whole-candidate independent Security clearance.
- A cold-judge end-to-end PASS from this README.

Do not upgrade those statements from pending merely because CI is green.

## Sponsor feedback

Integration-grounded feedback is tracked in:

- [`docs/ethonline-2026/LEDGER_FEEDBACK.md`](docs/ethonline-2026/LEDGER_FEEDBACK.md)
- [`docs/ethonline-2026/WORLD_FEEDBACK.md`](docs/ethonline-2026/WORLD_FEEDBACK.md)
- [`docs/ethonline-2026/HEDERA_FEEDBACK.md`](docs/ethonline-2026/HEDERA_FEEDBACK.md)

## Local setup

```bash
npm ci --legacy-peer-deps
cp .env.example .env.local
npm run dev
```

The exact non-secret World/public-enrollment configuration inputs are documented in `.env.example`. Real addresses/accounts must come from reviewed live configuration; there are deliberately no production defaults.

## Historical material

Historical Week-5 and ETHGlobal NYC proof material remains in the repository for Continuity provenance. It is not the entry point for the ETHOnline 2026 submission.