# Stakeholder Coverage Gate

Use this before starting any journey set after the Golden ETHOnline holder-recovery hero.

Canonical architecture: `docs/product-workbench/stakeholder-journeys.md`.

## Required questions

1. Which stakeholder class is the journey for: provider or customer?
2. If customer, is the user the current holder or the next holder/acquirer?
3. What provider rule makes the action valid or invalid?
4. What holder authority is required?
5. What acquirer eligibility/payment condition is required?
6. What authoritative booking state changes when the journey succeeds?
7. Can the provider understand the resulting holder/booking state without approving every compliant recovery manually?
8. Can the current holder see that the booking left their usable inventory and that value was recovered?
9. Can the new holder see the same booking as a normal usable booking?
10. Are all three perspectives consistent with one underlying state transition?

## Hard completion rule

A future end-to-end recovery/exchange journey is incomplete unless it can account for:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`

and close the state on all relevant sides:
- provider sees the valid current holder / fulfilment state;
- previous holder no longer has a usable booking and receives the correct recovery outcome;
- new holder receives a usable booking and can fulfil/check in.

A blockchain transaction, agent receipt, or holder-only success screen is not enough.

## Current gate state

YT-01→YT-08 is human-approved Golden, so stakeholder coverage is active for the next product expansion.

<!-- pw-state: phase=XC-01_CANDIDATE_REVISE candidate=eb3bcdb84ff95352adf1d0c387996f9a4692c52f candidate-status=REVISE architecture-head=686aeb767f3c1f6ff7db14fdf7a773039cf581a9 architecture-status=REVIEWABLE golden-yt-01-04=24bbf0d7516499069f5102ae4bf724b0cb376b94 golden-yt-05-08=d5309a96d532ee107011c2a5cefc3000b9e4932f next-gate=NARROW_HEADER_CONTINUITY_REPAIR_THEN_EXACT_HEAD_EVIDENCE_THEN_34_FIVE_LENS -->

Coverage has been applied to the **reviewed** continuation documented in `next-slice.md`:

**XC-01 — Eligible next holder + provider-recognized handoff**.

Coverage result:
- stakeholder classes: customer + provider;
- current holder: Maya, already covered by Golden YT-01→YT-08;
- acquirer: Bob, requiring find/evaluate/eligibility/payment/receive-booking coverage;
- provider rule: Studio A pre-defines recovery/transfer permission, cancellation prohibition and eligibility/cutoff constraints;
- holder authority: Golden Friday-Yoga-only 40-USDC minimum, Tomorrow 17:00 expiry, no-cancel mandate;
- acquirer condition: Bob must satisfy Studio A eligibility/payment requirements before his 45-USDC commitment can become an acceptable recovery opportunity;
- authoritative state change: Friday Yoga current holder changes Maya → Bob while the service remains valid;
- provider operation: Studio A recognizes Bob without manually approving the individual compliant recovery;
- holder outcome: Maya no longer has the usable booking and sees `You recovered 45 USDC`;
- acquirer outcome: Bob receives Friday Yoga as a normal usable booking with a credible fulfil/check-in path;
- cross-perspective rule: Maya, Bob and Studio A must reconcile from one underlying booking transition.

This completes the **coverage application only**. It does not pre-approve fixture behavior, sponsor integration, or a Golden freeze. The architecture contract has since been classified `REVIEWABLE`, one XC-01 candidate was routed, and that exact executable `eb3bcdb84ff95352adf1d0c387996f9a4692c52f` is currently `REVISE`. The active authority gate is Product Reviewer #34 on the repaired exact candidate.

## Implementation preconditions for XC-01

Executable work is limited to the one narrow header-continuity repair named in `handoff.md`. No new journey set, scope widening or Golden change is authorized.

Only after that classification:
- read `DESIGN.md`, `GLOSSARY.md`, `CRAFT.md`, `integration-ledger.md`, and `next-slice.md`;
- mine/reuse prior slots/resale/provider work rather than rebuilding from zero;
- keep Golden YT-01→YT-08 product behavior unchanged;
- use the canonical Product Workbench route/journey rather than a competing prototype;
- identify new fixture-backed states explicitly and never present them as LIVE;
- retain production build + real Chromium desktop/mobile evidence + direct Product Reviewer PNG inspection for every material candidate.

A pre-existing exploratory XC-01 executable in branch history may be mined only after architecture approval; its historical green CI does not self-authorize or advance it.

## Sequencing

The old `do not interrupt YT-05→YT-08` hold is complete because that set is Golden.

Current sequence:
1. stakeholder coverage applied;
2. XC-01 recorded as the reviewed smallest connected slice;
3. Product Reviewer #34 classified the architecture/product contract `REVIEWABLE`;
4. one canonical XC-01 candidate authorized, routed and reviewed — currently `REVISE`;
5. route that exact executable through build, rendered evidence, direct PNG review, and explicit human freeze if it later reaches `GOLDEN-READY`.

YT-09/YT-10 remain bridge concepts inside the broader acquirer/provider architecture rather than a standalone holder-only next set.
