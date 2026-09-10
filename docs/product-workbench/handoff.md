# Product Workbench Handoff

## Canonical branch

`ux/yourturn-product-workbench`

## Current phase

**XC-01 CANDIDATE BUILD — architecture gate cleared.**

Product Reviewer #34 independently classified the post-Golden architecture/product contract at exact docs head `686aeb767f3c1f6ff7db14fdf7a773039cf581a9` as **REVIEWABLE**. This authorizes exactly one smallest connected XC-01 executable candidate to enter the normal candidate/review loop.

This is not `GOLDEN-READY`, not a Golden freeze, not sponsor integration, and not permission to widen scope. Historical exploratory executable `eb3bcdb84ff95352adf1d0c387996f9a4692c52f` may be mined as prior work but is not automatically adopted or advanced.

## Frozen Golden product truth

YT-01→YT-08 is human-approved Golden:

- YT-01→YT-04: `24bbf0d7516499069f5102ae4bf724b0cb376b94`;
- YT-05→YT-08: `d5309a96d532ee107011c2a5cefc3000b9e4932f`.

Golden records live under `docs/product-workbench/golden/`. Do not redesign or silently mutate either executable. Golden freezes product behavior/presentation, **not sponsor evidence class**; sponsor-dependent YT-05→YT-08 transitions remain fixture-backed until `integration-ledger.md` is satisfied.

Frozen holder-recovery semantics remain unchanged: Friday Yoga only; 40-USDC minimum; Tomorrow 17:00 expiry; no cancellation; Ledger authorizes the off-chain Recovery Mandate; exact human-backed delegated agent is shown without raw World human identity; 32 USDC is blocked with no transfer/settlement; 45 USDC is inside scope; completion is `You recovered 45 USDC` and Maya no longer has the usable booking.

## Binding post-Golden contract

Read before changing the XC-01 candidate:

- `DESIGN.md` — Golden-derived visual/product contract;
- `GLOSSARY.md` — preferred customer language + `Avoid:` aliases;
- `CRAFT.md` — prospective state/accessibility/responsive/copy/interaction rules;
- `integration-ledger.md` — Golden YT-05→08 fixture → real implementation acceptance map;
- `stakeholder-journeys.md` — holder/acquirer/provider architecture;
- `stakeholder-coverage-gate.md` — mandatory cross-lane gate;
- `next-slice.md` — reviewed XC-01 scope and build boundary;
- `architecture-review.md` — review packet independently classified `REVIEWABLE` by Product Reviewer #34.

## Sponsor evidence anchors

- **Ledger:** `feature/ethonline-ledger@dfb3fec6328c5db22aa6b6eb222b5e0a57f3b54a`; runtime proof remains CI/CONFIGURED; SEC-LEDGER-005 remains OPEN/MEDIUM on the final validation → active-authority-write TOCTOU; device/downstream qualification remains blocked.
- **World:** `feature/ethonline-world@2ab04f4420cccc2c090cd5f5634e447d399eb139`; AgentBook registration/resolution LIVE; signed route harness CI/READY, NOT LIVE; registered-agent signed recovery mutation and Sandbox proof outstanding. World verifies requester identity; it must not become parallel holder authority.
- **Hedera:** `feature/ethonline-hedera@40890aab7729075edbf5efac5f5367f4b5a022e1`; H2/USDC policy/RETURN_BYTES is CI/LOCAL + Security for its exact surface; canonical 45-USDC LIVE/TESTNET recovery remains externally blocked and unsigned/unsubmitted bytes are not settlement.

## Reviewed XC-01 architecture

**XC-01 — Eligible next holder + provider-recognized handoff**

`Studio A pre-defined rules → Bob finds/evaluates Friday Yoga → Bob satisfies eligibility + commits 45 USDC → Golden Maya recovery may proceed only if current provider rules + holder mandate + acquirer eligibility/payment all pass → Bob receives Friday Yoga as a normal usable booking → Studio A recognizes Bob as authoritative current holder`

Core rule:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`

Provider rules remain pre-defined and load-bearing. A compliant recovery must not require Studio A staff to approve each individual transfer.

Authorized candidate scope is narrow:

- acquirer A-01→A-04;
- provider P-03, P-06 and P-07;
- already-Golden Maya YT-08 outcome unchanged;
- partial/unknown reconciliation fails closed rather than displaying success.

YT-09/YT-10 remain bridge concepts inside this cross-lane architecture, not a holder-only next set.

## Exact next action

**Build exactly one canonical XC-01 executable candidate.**

1. Start from the reviewed contract and mine historical `eb3bcdb...` only as prior work.
2. Preserve only the parts that satisfy `DESIGN.md`, `GLOSSARY.md`, `CRAFT.md`, `integration-ledger.md`, stakeholder mapping and the reviewed XC-01 scope; revise concrete gaps.
3. Do not change either frozen Golden executable or sponsor/backend semantics from this lane.
4. Render material provider/acquirer/partial-state paths at canonical desktop/mobile widths.
5. Run production build + exact-head Chromium evidence.
6. Route the exact executable and PNG artifact to Product Reviewer #34 for five-lens review.
7. Only a later `GOLDEN-READY` classification plus explicit Devinson approval may freeze the executable.

## Integration guardrail

Golden product artifacts are product/design/presentation contracts, not implementation owners. Sponsor implementation must plug into the approved behavior. If Ledger/World/Hedera reality conflicts with Golden or XC-01, record the exact mismatch in Product Workbench #31 rather than silently changing UX or weakening backend semantics.
