# Product Workbench Handoff

## Canonical branch

`ux/yourturn-product-workbench`

## Current phase

**XC-01 CANDIDATE `REVISE` — narrow header-continuity repair authorized.**

<!-- pw-state: phase=XC-01_CANDIDATE_REVISE candidate=eb3bcdb84ff95352adf1d0c387996f9a4692c52f candidate-status=REVISE architecture-head=686aeb767f3c1f6ff7db14fdf7a773039cf581a9 architecture-status=REVIEWABLE golden-yt-01-04=24bbf0d7516499069f5102ae4bf724b0cb376b94 golden-yt-05-08=d5309a96d532ee107011c2a5cefc3000b9e4932f next-gate=NARROW_HEADER_CONTINUITY_REPAIR_THEN_EXACT_HEAD_EVIDENCE_THEN_34_FIVE_LENS -->

The architecture gate is closed and historical: Product Reviewer #34 classified the post-Golden architecture/product contract `REVIEWABLE` at exact docs head `686aeb767f3c1f6ff7db14fdf7a773039cf581a9`.

One XC-01 executable candidate was explicitly routed under that reviewed contract and directly reviewed. Product Reviewer #34 classified exact executable `eb3bcdb84ff95352adf1d0c387996f9a4692c52f` **`REVISE`** on 2026-09-10, after downloading artifact `10169073722` and inspecting all 72 PNGs (Visual Check `34519301160` SUCCESS, Continuity `34519307635` SUCCESS, both on that exact SHA).

Most of XC-01 passed the five-lens gate. The single blocking defect is header/product continuity on the **actual interactive** Bob path:

- the run starts at `?view=xc-find` and advances `Xc01Client` through local `step` state;
- `Refresh booking` renders `bobSuccess` but leaves the URL at `?view=xc-find`;
- `SiteHeader` derives audience/nav mode from the URL, so captures `desktop/mobile-34` and `-35` show `Find a spot` while the body reads `My bookings` / `Friday Yoga is now yours.`;
- the `xc-bob-success` header mode exists but is only reachable by direct URL, never by the tested interaction;
- `assertAudienceHeader` keys off the unchanged URL and therefore codifies `Find a spot` as correct after successful acquisition.

This is not `GOLDEN-READY`, not a Golden freeze, not sponsor integration, and not permission to widen scope or redesign XC-01.

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

**Repair the named XC-01 header-continuity defect, then re-prove it.**

1. Synchronize the successful interactive transition so the shell renders `My bookings` once Bob holds Friday Yoga, on the real `Refresh booking` → `Use booking` path.
2. Strengthen the Chromium assertion so it proves that interactive transition instead of accepting the stale `Find a spot` header.
3. Produce a new exact candidate SHA with production build + exact-head desktop/mobile rendered evidence.
4. Route that exact SHA and artifact back to Product Reviewer #34 for five-lens re-review.
5. `GOLDEN-READY` and explicit Devinson freeze approval remain separate later gates.

Preserve the same `/product-preview` route, both Golden executables, the fixture evidence boundary and all sponsor/backend semantics. Do not widen scope, redesign XC-01, merge, or deploy.

## Integration guardrail

Golden product artifacts are product/design/presentation contracts, not implementation owners. Sponsor implementation must plug into the approved behavior. If Ledger/World/Hedera reality conflicts with Golden or XC-01, record the exact mismatch in Product Workbench #31 rather than silently changing UX or weakening backend semantics.
