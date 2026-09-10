# Product Workbench Handoff

## Canonical branch

`ux/yourturn-product-workbench`

## Current phase

**XC-01 REVISE — narrow continuity repair only.**

Product Reviewer #34 directly inspected the explicitly routed executable `eb3bcdb84ff95352adf1d0c387996f9a4692c52f` after exact-head Continuity `34519307635` and Product Workbench Visual `34519301160` both succeeded. Artifact `10169073722` contains 72 rendered PNGs and was reviewed under the five-lens gate.

The candidate is not `GOLDEN-READY`. One blocking real-flow defect remains: after Bob's interactive `Refresh booking` path reaches authoritative success, local state changes to the owned-booking state while the URL/header context remains `?view=xc-find`. The body says `My bookings` / `Friday Yoga is now yours`, but `SiteHeader` still says `Find a spot`, including the subsequent `Use booking` state. The direct-loaded `xc-bob-success` fixture is not a substitute for the real interaction.

No redesign or new journey set is authorized. Repair only that success/header transition and the browser assertion, then rerun exact-head rendered evidence and return the changed executable SHA to #34.

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
- `next-slice.md` — reviewed XC-01 scope and current repair boundary;
- `architecture-review.md` — architecture packet independently classified `REVIEWABLE` by Product Reviewer #34.

## Sponsor evidence anchors

- **Ledger:** `feature/ethonline-ledger@dfb3fec6328c5db22aa6b6eb222b5e0a57f3b54a`; runtime proof remains CI/CONFIGURED; SEC-LEDGER-005 remains OPEN/MEDIUM on the final validation → active-authority-write TOCTOU; device/downstream qualification remains blocked.
- **World:** core `feature/ethonline-world@2ab04f4420cccc2c090cd5f5634e447d399eb139`; AgentBook registration/resolution LIVE; registered-agent signed recovery harness CI/READY, NOT LIVE. Sandbox candidate `feature/ethonline-world-sandbox-proof@403f2dcb1e185455b5fb09e76caab1e40f7d0ebc` remains CI/CONFIGURED and **SECURITY-BLOCKED** by SEC-WORLD-005 until its supported launch is transport-bound to loopback, fails closed outside intended development mode, and an independent retest closes the finding. World verifies requester identity; it must not become parallel holder authority.
- **Hedera:** `feature/ethonline-hedera@40890aab7729075edbf5efac5f5367f4b5a022e1`; H2/USDC policy/RETURN_BYTES is CI/LOCAL + Security for its exact surface; canonical 45-USDC LIVE/TESTNET recovery remains externally blocked and unsigned/unsubmitted bytes are not settlement.

## Reviewed XC-01 architecture

**XC-01 — Eligible next holder + provider-recognized handoff**

`Studio A pre-defined rules → Bob finds/evaluates Friday Yoga → Bob satisfies eligibility + commits 45 USDC → Golden Maya recovery may proceed only if current provider rules + holder mandate + acquirer eligibility/payment all pass → Bob receives Friday Yoga as a normal usable booking → Studio A recognizes Bob as authoritative current holder`

Core rule:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`

Provider rules remain pre-defined and load-bearing. A compliant recovery must not require Studio A staff to approve each individual transfer.

Authorized candidate scope remains narrow:

- acquirer A-01→A-04;
- provider P-03, P-06 and P-07;
- already-Golden Maya YT-08 outcome unchanged;
- partial/unknown reconciliation fails closed rather than displaying success.

YT-09/YT-10 remain bridge concepts inside this cross-lane architecture, not a holder-only next set.

## Exact next action

**Repair the reviewed XC-01 executable; do not start another candidate.**

1. In the actual interactive Bob success path, synchronize the route/shell context from acquisition (`Find a spot`) to ownership (`My bookings`) when authoritative reconciliation establishes Bob as holder.
2. Preserve that ownership shell through the subsequent `Use booking` state.
3. Strengthen the Chromium journey so it asserts `My bookings` after the real interaction, rather than accepting the stale `xc-find` URL/header or relying on a direct fixture URL.
4. Do not change either frozen Golden executable, provider/holder/acquirer semantics, `/product-preview`, sponsor/backend behavior, or evidence-class labels.
5. Rerun the strongest production build plus exact-head desktop/mobile rendered evidence and responsive smoke.
6. Route the changed exact executable SHA and artifact to Product Reviewer #34 for direct PNG five-lens re-review.
7. Only a later `GOLDEN-READY` classification plus explicit Devinson approval may freeze the executable.

## Integration guardrail

Golden product artifacts are product/design/presentation contracts, not implementation owners. Sponsor implementation must plug into the approved behavior. If Ledger/World/Hedera reality conflicts with Golden or XC-01, record the exact mismatch in Product Workbench #31 rather than silently changing UX or weakening backend semantics.
