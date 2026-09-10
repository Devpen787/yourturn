# Product Workbench Handoff

## Canonical branch

`ux/yourturn-product-workbench`

## Current phase

**ARCHITECTURE / PRODUCT-CONTRACT REVIEW.**

The current task is not a new executable journey and not an XC-01 freeze. The post-Golden contract is now assembled in `architecture-review.md` and must be reviewed before this lane authorizes another executable candidate.

A pre-existing exploratory XC-01 executable (`eb3bcdb84ff95352adf1d0c387996f9a4692c52f`) may remain in branch history. Do not advance, freeze or treat that executable as current product truth from this handoff. Its green build/render evidence is not a substitute for architecture approval.

## Frozen Golden product truth

YourTurn is a booking product. ETHOnline adds **Delegated Recovery** inside that booking journey.

YT-01→YT-08 is human-approved Golden:

- YT-01→YT-04: `24bbf0d7516499069f5102ae4bf724b0cb376b94`;
- YT-05→YT-08: `d5309a96d532ee107011c2a5cefc3000b9e4932f`.

Golden records:

- `docs/product-workbench/golden/yt-01-04.md`;
- `docs/product-workbench/golden/yt-05-08.md`.

Do not redesign or silently mutate either executable. Later docs-only descendants do not redefine them.

### Frozen holder-recovery story

`Landing → My Bookings → Friday Yoga → Change plans → Let YourTurn handle it → 40 USDC / Tomorrow 17:00 / no-cancel scope → Ledger authorization → Recovery active with exact human-backed delegated agent → 32 USDC blocked → optional fresh reauthorization to lower minimum → 45 USDC accepted inside scope → You recovered 45 USDC → Friday Yoga no longer usable by Maya`

Important frozen semantics:

- Ledger authorizes the off-chain Recovery Mandate; it is not shown as signing Hedera HTS transactions;
- initial Ledger reject/cancel creates no authority;
- rejecting/cancelling a proposed 30-USDC replacement leaves the existing 40-USDC recovery active and unchanged;
- active authority keeps minimum, expiry, Friday-Yoga-only scope and no-cancel/no-widen rules visible;
- no raw World human identifier is rendered;
- 32 USDC produces no transfer/settlement;
- 45 USDC is inside scope and does not require another owner prompt;
- technical proof remains secondary to the customer outcome.

## Golden evidence

YT-01→04:

- Continuity `34472117038`: SUCCESS;
- Product Workbench Visual `34472112881`: SUCCESS;
- artifact `10150035697`: 14 directly reviewed PNGs.

YT-05→08:

- Continuity `34497826067`: SUCCESS;
- Product Workbench Visual `34497819955`: SUCCESS;
- artifact `10160672183`: 44 directly reviewed PNGs;
- five-lens Product Reviewer PASS + explicit human approval on 2026-09-10.

Golden freezes product behavior/presentation, **not sponsor evidence class**.

## Binding post-Golden contract

Read these before any future implementation:

- `architecture-review.md` — current review packet and exact review request;
- `DESIGN.md` — Golden-derived visual/product contract;
- `GLOSSARY.md` — preferred customer language + `Avoid:` aliases;
- `CRAFT.md` — prospective state/accessibility/responsive/copy/interaction rules;
- `integration-ledger.md` — Golden YT-05→08 fixture → real implementation acceptance map;
- `stakeholder-journeys.md` — holder/acquirer/provider architecture;
- `stakeholder-coverage-gate.md` — mandatory cross-lane gate;
- `next-slice.md` — proposed smallest connected continuation.

`architecture-review.md` normalizes the design decision vocabulary to **OBSERVED / PROVIDED / INFERRED** and **KEEP / CHANGE / DO NOT COPY**, audits every material YT-05→08 state against `integration-ledger.md`, and records the stakeholder-gate result.

## Integration evidence anchors

### Ledger

Latest inspected anchor: `feature/ethonline-ledger@dfb3fec6328c5db22aa6b6eb222b5e0a57f3b54a`.

Concrete Recovery-Mandate interfaces include:

- `POST /api/ledger/recovery-mandate/prepare`;
- `POST /api/ledger/recovery-mandate/activate`;
- active mandate/replay/live-booking-state guards.

Current runtime proof is **CI_CONFIGURED**. It does not prove Ledger hardware/device provenance or downstream Hedera recovery consumption.

### World

Latest inspected anchor: `feature/ethonline-world@2ab04f4420cccc2c090cd5f5634e447d399eb139`.

Evidence truth:

- AgentBook registration/resolution: **LIVE**;
- bounded AgentKit-signed `create_listing` harness: **CI/READY, NOT LIVE**;
- registered-agent signed recovery mutation: outstanding;
- separate World ID Sandbox proof: outstanding.

World verifies the requester/exact delegated agent. It must not become a second authority model beside the Ledger Recovery Mandate, prove provider entitlement, or expose a raw human identifier.

### Hedera

Latest inspected anchor: `feature/ethonline-hedera@40890aab7729075edbf5efac5f5367f4b5a022e1`.

Current policy/HAK seam includes `preparePolicyAuthorizedUsdcRecovery(...)`, `BookingRightDelegationPolicy`, and `yourturn_delegated_recovery_settle_nft_usdc` in RETURN_BYTES mode.

Current evidence is **CI/LOCAL** on testnet semantics. RETURN_BYTES are unsigned/unsubmitted. Do not represent this as LIVE settlement until real sign/submit/receipt/state reconciliation proves it.

## Stakeholder gate result

The smallest connected continuation proposed for later implementation is:

### XC-01 — Eligible next holder + provider-recognized handoff

`Studio A pre-defined rules → Bob finds/evaluates Friday Yoga → Bob satisfies eligibility + commits 45 USDC → the existing Golden recovery may proceed only if current provider rules + holder mandate + acquirer eligibility/payment all pass → Bob receives Friday Yoga as a normal usable booking → Studio A recognizes Bob as authoritative current holder`

Core rule:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`

Provider rules remain pre-defined and load-bearing. A normal compliant recovery must not require Studio A staff to manually approve the individual transfer.

Proposed minimum lane coverage:

- acquirer A-01→A-04, narrowly;
- provider P-03, P-06 and P-07, narrowly;
- already-Golden Maya YT-08 outcome unchanged;
- partial/unknown reconciliation must fail closed rather than display success.

YT-09/YT-10 remain bridge concepts inside this broader cross-lane architecture, not a holder-only next set.

## Exact next action

**Product Reviewer #34 reviews the architecture/product contract only.**

Review `architecture-review.md` with `DESIGN.md`, `GLOSSARY.md`, `CRAFT.md`, `integration-ledger.md`, `stakeholder-journeys.md`, `stakeholder-coverage-gate.md`, `next-slice.md`, and both Golden records. Classify the contract as:

- `REVISE` — exact contract/coverage/evidence defect; or
- `REVIEWABLE` — coherent enough to authorize one connected executable candidate.

Do not classify the exploratory `eb3bcdb...` executable from this gate, do not self-freeze it, and do not widen into another journey. After architecture review, either repair the contract or explicitly route the smallest approved executable set into the normal candidate/reviewer/human-freeze loop.

## Integration guardrail

Golden product artifacts are product/design/presentation contracts, not implementation owners. If Ledger/World/Hedera reality conflicts with Golden, record the exact mismatch in Product Workbench #31 rather than silently changing UX or backend semantics.
