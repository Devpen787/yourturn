# PRD 04 — Delegated Recovery Hero UX

## Goal

Turn the sponsor primitives into one understandable product journey for a normal booking holder.

## Required journey

1. Booking detail exposes a clear **Delegate recovery** action.
2. Recovery Mandate form sets agent, minimum recovery, currency, expiry and action scope.
3. Review screen translates the mandate into one plain sentence before approval.
4. Active mandate card shows what the agent can and cannot do and allows revocation.
5. Agent activity timeline shows read/plan/allowed/blocked/escalated/settled states.
6. Out-of-policy recovery shows the exact reason and, if supported, an escalation action.
7. Final receipt shows recovered amount, currency, booking transfer and proof links without sponsor jargon.

## UX rules

- USDC should be displayed as a familiar dollar amount; raw atomic units are reviewer detail only.
- Explain `blocked` in product language, not policy-engine terminology.
- Keep technical proof behind a details/reviewer layer.
- Do not call an agent `trusted` merely because World verifies human backing.
- Do not call a mandate `hardware secured` unless the Ledger device-backed path is live.

## Acceptance

- desktop journey works end to end;
- ~390 px journey works end to end;
- keyboard/focus states are usable;
- loading, error and blocked states are visible and truthful;
- no horizontal overflow or clipped primary action;
- evaluator can complete the judge path without reading repository docs.
