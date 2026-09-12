# Post-Golden Product Contract — Review Packet

Status: **architecture / product-contract review**. This is not an executable journey approval and not a Golden freeze request.

## Frozen product truth

Do not mutate either executable while reviewing this packet:

- YT-01→YT-04: `24bbf0d7516499069f5102ae4bf724b0cb376b94`;
- YT-05→YT-08: `d5309a96d532ee107011c2a5cefc3000b9e4932f`.

Golden defines approved product behavior and presentation. It does **not** make Product Workbench fixtures the implementation owner and does not upgrade sponsor evidence to LIVE.

The current review question is narrower: **is the product/design/integration/stakeholder contract precise enough that the next connected journey can be built without redesigning Golden or inventing authority?**

## Review inputs

Read together:

- `DESIGN.md` — Golden-derived YourTurn visual/product contract;
- `GLOSSARY.md` — preferred customer language + `Avoid:` aliases;
- `CRAFT.md` — prospective state, accessibility, responsive, copy and negative-path discipline;
- `integration-ledger.md` — YT-05→YT-08 Golden fixture → real implementation acceptance map;
- `stakeholder-journeys.md` — current-holder, acquirer and provider architecture;
- `stakeholder-coverage-gate.md` — mandatory cross-lane completion gate;
- `next-slice.md` — proposed smallest connected continuation;
- both records under `golden/` — exact frozen product truth.

## 1. Design-contract evidence classification

The design contract must never blur evidence with a new visual proposal. Read its decisions with the following strict classification and directive vocabulary.

| Source | Evidence class | Directive | Contract consequence |
| --- | --- | --- | --- |
| Human-approved Golden screenshots/executables for YT-01→YT-08 | **OBSERVED** | **KEEP** | Preserve booking-first hierarchy, customer shell, deep-slate decision surfaces, quiet operational cards, rounded primary actions, compact authority facts, truthful negative states and progressive proof disclosure. |
| Golden authority behavior | **OBSERVED** | **KEEP** | Keep active authority visible; distinguish initial vs replacement authorization; reject/cancel must preserve the authority that really remains active. |
| Current repo `calendarTurn` brand tokens / `docs/BRAND-UI.md` | **PROVIDED** | **KEEP** | Use the existing visual identity and semantic-status separation; do not invent an ETHOnline sub-brand. |
| Strong prior slots/resale/provider flows from `feat/product-issuer-holder-ux` | **OBSERVED prior work** | **CHANGE** | Reuse the useful interaction/state mechanics, but translate them into the Golden booking-first hierarchy and current customer/provider language. |
| Prior `issuer`, `pass`, Person A/B, raw account/ref IDs, HBAR-first and HashScan-first presentation | **OBSERVED prior work** | **DO NOT COPY** | These are implementation/demo artifacts, not the product language or information hierarchy for the next journey. |
| Existing reusable glass/button/layout helpers | **PROVIDED** | **CHANGE only where needed** | Prefer existing helpers for new non-Golden surfaces; do not refactor frozen Golden only to normalize implementation. |
| A future shared component architecture across holder/acquirer/provider lanes | **INFERRED** | **CHANGE LATER, NOT BINDING NOW** | Extract shared components only after repeated product behavior makes the boundary stable. It is not permission to rewrite Golden. |
| New sponsor-specific styling, AI-agent chrome or protocol-led dashboard treatment | **INFERRED / unsupported** | **DO NOT COPY / DO NOT INTRODUCE** | Sponsor proof remains secondary. A new visual direction requires an explicit reviewed successor contract. |

Interpretation rule: **OBSERVED** means visible in approved product evidence; **PROVIDED** means an existing repo/product constraint supplied outside those screenshots; **INFERRED** means a prospective implementation/product-system conclusion. Inference is never allowed to override observed Golden truth without product review.

## 2. Domain-language contract

`GLOSSARY.md` is the customer-language source of truth. The compact operational subset for the next slice is:

| Preferred term | Customer meaning | Avoid |
| --- | --- | --- |
| **Booking** | the normal usable right to attend Friday Yoga | pass, NFT, token, serial, asset |
| **Provider / Studio A** | the business that defines and fulfils the service | issuer in normal customer copy |
| **Recovery** | YourTurn finds a permitted outcome when the holder cannot use the booking | liquidation, token sale, agent trade |
| **Recovery value** | value returned to the current holder | settlement atomic units |
| **Provider rules** | reusable conditions Studio A set before the individual recovery | generic approval, per-recovery provider approval |
| **Your recovery rules / Recovery Mandate** | booking-scoped holder authority | wallet permission, account-wide agent access |
| **Next holder** | the eligible customer who receives the booking normally | buyer wallet, NFT recipient |
| **Transferred / Confirmed** | authoritative booking outcome | transaction-complete as the customer headline |
| **Human-backed / exact delegated agent** | privacy-safe trust signal about the requester | raw World human identifier/address |
| **View technical proof** | optional evidence explaining how the outcome was established | protocol proof as the primary journey |

When wording conflicts, prefer the concrete booking/state/outcome over architecture jargon. `Acquirer`, `Recovery Mandate`, sponsor names and evidence classes are valid in product/reviewer documents but should not become unnecessary customer-facing terminology.

## 3. Golden-to-integration coverage audit — YT-05→YT-08

`integration-ledger.md` is the implementation acceptance owner. The audit below confirms that every material Golden state/action has a named integration row rather than relying on a generic sponsor handoff.

| Golden state/action | Ledger coverage | Required real owner | Current evidence boundary |
| --- | --- | --- | --- |
| YT-04→05 `Continue to secure approval` | explicit row | Ledger application seam | Golden **FIXTURE** → real prepare interface |
| Ledger not ready | explicit row | Ledger | UI **FIXTURE**; runtime guards **CI_CONFIGURED** |
| Ledger waiting | explicit row | Ledger DMK/device ceremony | UI **FIXTURE**; hardware provenance not yet proven |
| Initial approve | explicit row | Ledger activation | UI **FIXTURE**; state machinery **CI_CONFIGURED** |
| Initial reject | explicit row | Ledger | **FIXTURE** → no activation/no authority |
| Initial cancel | explicit row | Ledger | **FIXTURE** → no activation/no authority |
| Recovery active | explicit row | active Ledger mandate + World exact-agent verification | combined **FIXTURE** until bound to real path |
| Exact delegated-agent verification | explicit row | World | AgentBook registration/resolution **LIVE**; signed route harness **CI/READY, NOT LIVE**; Sandbox proof outstanding |
| `Stop recovery` | explicit row | mandate state + delegated-authority revocation | **FIXTURE** until real stop/revocation is proven |
| 32 USDC offer evaluated | explicit row | Hedera policy runtime + valid mandate/provider policy | UI **FIXTURE**; policy semantics **CI/LOCAL** |
| `No booking transfer. No settlement.` | explicit row | authoritative booking/settlement reads | **FIXTURE** until unchanged state is reconciled |
| `Lower my minimum` | explicit row | Ledger replacement prepare | **FIXTURE**; current 40 remains authoritative |
| Replacement waiting | explicit row | Ledger | **FIXTURE**; proposed 30 separated from active 40 |
| Replacement reject | explicit row | Ledger | **FIXTURE**; existing 40 remains active |
| Replacement cancel | explicit row | Ledger | **FIXTURE**; existing 40 remains active |
| Replacement approve | explicit row | Ledger | **FIXTURE**; requires explicit replacement semantics and no ambiguous dual authority |
| 45 USDC offer evaluated | explicit row | World + active Ledger mandate + Hedera policy | combined **FIXTURE** until all three permission dimensions are real |
| Prepare atomic recovery | explicit row | Hedera | UX **FIXTURE**; RETURN_BYTES proof **CI/LOCAL**, unsigned/unsubmitted |
| Submit / settle | explicit row | Hedera signer/payer/submission + authoritative state | **NOT YET PROVEN** by current CI/LOCAL evidence |
| `You recovered 45 USDC` | explicit row | authoritative transfer/settlement + booking read model | Golden **FIXTURE** until Maya ownership/value reconcile |
| Technical proof drawer | explicit row | Ledger + World + Hedera evidence adapters | content/labels **FIXTURE** until replaced by evidence from the same execution |

Acceptance invariant: an implementation worker may replace a fixture only when the real interface preserves the Golden customer behavior **and** satisfies the ledger's acceptance/failure rules. If the real sponsor interface cannot do that, route the mismatch for product review; do not change the Golden UX or weaken backend semantics to fit it.

## 4. Evidence-integrity guardrails

The integration story remains singular:

- **Ledger defines what the human authorized** in the off-chain Recovery Mandate.
- **World proves which human-backed agent is asking and whether it is the exact delegated requester**; it does not mint/widen holder authority and does not prove booking ownership/provider entitlement.
- **Hedera enforces/executes booking transfer + settlement** only after the permission intersection passes.

Current evidence must stay accurately classified:

- World AgentBook registration/resolution: **LIVE**;
- bounded registered-agent signed `create_listing` harness: **CI/READY, NOT LIVE** until the initialized target execution is actually performed and reviewed;
- World ID Sandbox proof: outstanding;
- Ledger runtime guards: **CI_CONFIGURED**, not proof of hardware/device provenance or downstream Hedera consumption;
- Hedera policy/RETURN_BYTES: **CI/LOCAL**, unsigned and unsubmitted; not a settled recovery.

Never let a proof label, color, comment or fixture transition promote one of these evidence classes.

## 5. Stakeholder coverage gate — applied

The smallest connected continuation remains **proposed XC-01 — Eligible next holder + provider-recognized handoff**.

It is intentionally the minimum continuation that closes the missing sides of Golden YT-08:

`Studio A pre-defined rules → Bob finds/evaluates Friday Yoga → Bob satisfies eligibility + commits 45 USDC → the existing Golden recovery may accept only if the live permission intersection still passes → Bob receives Friday Yoga as a normal usable booking → Studio A recognizes Bob as the authoritative current holder`

Load-bearing permission rule:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`

### Included in the proposed first executable set

- **P-03 thin:** Studio A's reusable recovery/transfer/cancellation/eligibility/cutoff rules already exist before Maya's recovery;
- **A-01/A-02:** Bob can find and evaluate the released Friday Yoga booking in normal service language;
- **A-03:** Bob has truthful eligible/ineligible and payment pending/error/committed states; a 45-USDC commitment is not itself a completed recovery;
- **A-04 / YT-09 bridge:** after authoritative reconciliation, Bob receives a normal `Confirmed` Friday Yoga booking with a credible `Use booking` / check-in seam;
- **P-06:** no individual Studio A approval click exists for a compliant recovery;
- **P-07:** Studio A sees the authoritative holder move Maya → Bob;
- **cross-lane partial state:** no side may show full success while payment/holder truth is unknown or inconsistent.

### Explicitly outside this first executable set

Provider onboarding, inventory rebuilding, broad marketplace taxonomy, full accounting/reconciliation, exhaustive history/proof, new sponsor-demo pages and any Hedera/World/Ledger backend-semantic change. A-05/P-08 check-in is the immediate follow-up only if it cannot be truthfully reused from an existing normal fulfilment path.

## 6. Prospective five-lens/state gate

If the proposed connected slice is approved for implementation later, the candidate must be reviewed independently under all five lenses:

1. product / interaction;
2. visual / brand consistency with Golden;
3. accessibility at the workbench review boundary;
4. copy / comprehension;
5. trust / authority.

For the new acquirer/provider surfaces, material state coverage must include where applicable: available/taken, eligible/ineligible, payment pending/error/committed, provider rule allowed/changed-blocked, reconciliation/partial/unknown and final usable-booking/current-holder success. Partial or stale truth fails closed.

This discipline is prospective. It does not retroactively reopen frozen YT-01→YT-08 merely to manufacture states.

## 7. Current review request

Review the **architecture/product contract**, not a new executable journey.

Classify this package as one of:

- `REVISE` — identify the exact contract/coverage/evidence defect;
- `REVIEWABLE` — contract is coherent enough to authorize building one connected candidate.

Do **not** classify or freeze XC-01 from this packet. Human approval of Golden YT-01→YT-08 does not transfer to a future executable.

A pre-existing exploratory XC-01 executable (`eb3bcdb84ff95352adf1d0c387996f9a4692c52f`) and its rendered artifact may remain in branch history, but this architecture gate does not adopt, advance or freeze it. Do not use its green CI as a substitute for contract approval. After this architecture package is reviewed, either revise the contract or explicitly route the smallest approved executable set into the normal `candidate → product review → GOLDEN-READY → explicit human freeze` loop.
