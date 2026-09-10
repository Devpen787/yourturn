# Journey Registry

Status vocabulary: `candidate`, `review`, `GOLDEN-READY`, `Golden`, `implemented`, `blocked`.

| Journey | User outcome | Status | ETHOnline priority |
| --- | --- | --- | --- |
| YT-01 Understand & enter | Visitor understands YourTurn and can enter the product | Golden | P0 |
| YT-02 My Bookings | Holder sees owned bookings and their meaningful states | Golden | P0 |
| YT-03 Booking detail | Holder can use a booking or change plans | Golden | P0 |
| YT-04 Recovery setup | Holder defines what YourTurn may do | Golden | P0 |
| YT-05 Delegate | Holder understands and authorizes the mandate with Ledger | Golden | P0 |
| YT-06 Agent working | Holder sees the exact human-backed delegated agent working | Golden | P0 |
| YT-07 Block / escalate | Out-of-scope offer is blocked and escalation boundary is clear | Golden | P0 |
| YT-08 Successful recovery | In-scope offer completes the approved product recovery outcome | Golden | P0 |
| YT-09 New holder | Next holder sees and can use the transferred booking | architecture bridge / not independently active | P1 |
| YT-10 Activity & proof | Parties understand what happened; technical proof remains secondary | queued / bridge | P1 |

## Golden product truth

### YT-01 → YT-04

Frozen executable: `24bbf0d7516499069f5102ae4bf724b0cb376b94`.

Golden record: `docs/product-workbench/golden/yt-01-04.md`.

Customer story:

`Landing → enter → My Bookings → Friday Yoga → Change plans → Let YourTurn handle it → minimum/expiry/actions → secure-approval handoff`

### YT-05 → YT-08

Frozen executable: `d5309a96d532ee107011c2a5cefc3000b9e4932f`.

Golden record: `docs/product-workbench/golden/yt-05-08.md`.

Exact-head evidence:

- ETHOnline Continuity Gate `34497826067`: **SUCCESS**;
- Product Workbench Visual Check `34497819955`: **SUCCESS**;
- artifact `product-workbench-rendered-evidence` / `10160672183`;
- 44 PNGs: 22 desktop `1440×1000` + 22 mobile `390×844`;
- five-lens Product Reviewer PASS;
- explicit human freeze approval on 2026-09-10.

Frozen continuous story:

`secure approval → Ledger not ready → waiting → approve / reject / cancel → verified human-backed delegated agent starts recovery → 32 USDC blocked → optional new-authorization seam for lower minimum → replacement reject/cancel preserves current 40 USDC recovery → 45 USDC allowed → transfer + settlement completion state → You recovered 45 USDC → Friday Yoga removed from Maya's usable bookings`

Frozen authority/product behavior:

- Friday Yoga only;
- minimum recovery 40 USDC;
- expiry `Tomorrow · 17:00`;
- cancellation forbidden;
- initial Ledger reject/cancel creates no authority;
- replacement authorization never silently widens the live mandate;
- rejecting/cancelling a proposed 30-USDC replacement leaves the existing 40-USDC recovery active and unchanged;
- exact delegated agent is human-backed/verified without exposing a raw World human identifier;
- 32 USDC is blocked with no transfer/settlement and no needless owner interruption;
- lowering the minimum requires fresh authorization;
- 45 USDC is inside scope and proceeds without another owner prompt;
- completion reads `You recovered 45 USDC` and Friday Yoga is no longer usable by Maya;
- Ledger authorizes the off-chain Recovery Mandate; it is not represented as signing Hedera HTS transactions;
- technical proof remains secondary to the customer experience.

## Golden truth boundary

Golden freezes **product behavior and presentation**, not evidence class.

The YT-05→YT-08 executable contains fixture/demo sponsor transitions where real sponsor integration is not yet wired. Integration must replace them with real Ledger / World / Hedera state while preserving the approved journey and `integration-ledger.md` failure behavior.

## Post-Golden architecture gate — closed

The architecture/product-contract gate is **closed**: Product Reviewer #34 classified exact docs head `686aeb767f3c1f6ff7db14fdf7a773039cf581a9` `REVIEWABLE`. The current Product Workbench phase is **XC-01 candidate `REVISE`** (see below).

The package below remains the binding contract for any XC-01 repair:

- `architecture-review.md` — review packet and exact gate;
- `DESIGN.md` — Golden-derived design contract;
- `GLOSSARY.md` — customer language + `Avoid:` aliases;
- `CRAFT.md` — prospective state/accessibility/responsive/copy rules;
- `integration-ledger.md` — YT-05→08 fixture-to-real acceptance ledger;
- `stakeholder-journeys.md` — holder/acquirer/provider architecture;
- `stakeholder-coverage-gate.md` — applied cross-lane gate;
- `next-slice.md` — proposed smallest connected continuation.

`architecture-review.md` explicitly audits every material YT-05→08 state/action against the integration ledger and normalizes design-source decisions to **OBSERVED / PROVIDED / INFERRED** plus **KEEP / CHANGE / DO NOT COPY**.

Do **not** treat YT-09/YT-10 as an isolated holder-only next set.

## Proposed next connected set

### XC-01 — Eligible next holder + provider-recognized handoff

Status: **proposed architecture; awaiting product-contract review**.

Connected story:

`Studio A pre-defined recovery rules → Bob finds/evaluates Friday Yoga → Bob satisfies eligibility + commits 45 USDC → current provider/payment/holder truth reconciles → Bob receives Friday Yoga as a normal usable booking → Studio A recognizes Bob as authoritative current holder`

Minimum proposed coverage:

- provider P-03: pre-defined transfer/recovery/cancellation/eligibility/cutoff rules;
- provider P-06: compliant recovery needs no manual per-recovery staff approval;
- provider P-07: authoritative current holder changes Maya → Bob;
- acquirer A-01→A-04: find, evaluate, eligibility/payment, normal usable booking;
- Golden Maya YT-08 behavior remains unchanged;
- partial or stale cross-lane truth must fail closed rather than render success.

Core permission rule:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`

Provider policy is pre-defined and load-bearing.

## Active XC-01 candidate

<!-- pw-state: phase=XC-01_CANDIDATE_REVISE candidate=eb3bcdb84ff95352adf1d0c387996f9a4692c52f candidate-status=REVISE architecture-head=686aeb767f3c1f6ff7db14fdf7a773039cf581a9 architecture-status=REVIEWABLE golden-yt-01-04=24bbf0d7516499069f5102ae4bf724b0cb376b94 golden-yt-05-08=d5309a96d532ee107011c2a5cefc3000b9e4932f next-gate=NARROW_HEADER_CONTINUITY_REPAIR_THEN_EXACT_HEAD_EVIDENCE_THEN_34_FIVE_LENS -->

`eb3bcdb84ff95352adf1d0c387996f9a4692c52f` is the **one active XC-01 candidate**, explicitly routed under the reviewed contract and classified **`REVISE`** by Product Reviewer #34 on 2026-09-10.

It is no longer exploratory branch history, and its historical green CI is still not approval. Only the named header-continuity repair is authorized against it: the interactive `Refresh booking` → `Use booking` path must move the shell to `My bookings`, and the Chromium assertion must prove that transition rather than accept the stale `Find a spot` header.

Do not adopt, freeze, widen or redesign it on any other basis.

## Integration evidence boundary

Key implementation truth remains:

- Ledger runtime guards are **CI_CONFIGURED**; hardware/device provenance and downstream Hedera consumption remain open;
- World AgentBook registration/resolution is **LIVE**; bounded signed `create_listing` harness is **CI/READY, NOT LIVE**; registered-agent signed recovery mutation and separate World ID Sandbox proof remain outstanding; World must bind to the real Recovery-Mandate path without replacing Ledger authority or exposing raw human identity;
- Hedera policy/atomic-USDC semantics are **CI/LOCAL** and RETURN_BYTES remain unsigned/unsubmitted until real sign/submit/receipt/state reconciliation proves settlement.

The Golden product and any exploratory candidate are design/product evidence, not automatically production implementation owners.

## Exact next action

**Repair the named XC-01 header-continuity defect, then re-prove it.**

1. Synchronize the successful interactive transition so the shell renders `My bookings` once Bob holds Friday Yoga, on the real `Refresh booking` → `Use booking` path.
2. Strengthen the Chromium assertion so it proves that interactive transition instead of accepting the stale `Find a spot` header.
3. Produce a new exact candidate SHA with production build + exact-head desktop/mobile rendered evidence.
4. Route that exact SHA and artifact back to Product Reviewer #34 for five-lens re-review.
5. `GOLDEN-READY` and explicit Devinson freeze approval remain separate later gates.

Preserve the same `/product-preview` route, both Golden executables, the fixture evidence boundary and all sponsor/backend semantics. Do not widen scope, redesign XC-01, merge, or deploy.

## Completion principle

The broader product loop is complete only when all relevant perspectives reconcile:

- provider policy permits the recovery and the authoritative holder/fulfilment state is coherent;
- Maya no longer owns a usable Friday Yoga booking and receives the correct recovery value;
- Bob owns the same normal usable booking and can follow the provider's fulfil/check-in path.
