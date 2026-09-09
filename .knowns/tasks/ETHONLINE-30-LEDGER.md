# ETHONLINE-30 — Ledger Continuity

## Objective

Put device-backed human approval at the authority boundary: creating or expanding an agent Recovery Mandate.

## Read first

- `docs/ethonline-2026/CONTINUITY_BASELINE.md`
- `docs/ethonline-2026/sponsors/LEDGER.md`
- `docs/ethonline-2026/ACCEPTANCE.json`

## Build order

1. spike the currently supported Ledger Agent Stack/Key Ring signing/approval path;
2. choose one honest integration path and document exactly what it signs/protects;
3. bind approval to agent + booking serial + scope + minimum + expiry + nonce;
4. implement approve and reject paths;
5. reject stale/replayed approvals;
6. integrate escalation UX;
7. produce the required Ledger tooling/DX feedback from the actual integration experience;
8. capture a practical runnable path or recorded walkthrough and the Continuity before/after;
9. independent claim-boundary review.

## Done when

- a supported Ledger primitive materially changes the authority boundary;
- approve/reject/replay behavior is evidenced at the correct level;
- the before/after clearly states what YourTurn could not do before Ledger;
- the required Ledger feedback document contains specific docs/SDK gaps and improvement suggestions grounded in the work;
- a judge can run or follow the demonstrated path without hidden verbal steps.

## Timebox / fallback

If a real device-backed path is not working within the agreed timebox, mark the blocker and stop. Do not destabilize Hedera + World. Replace this sponsor slot with the approved fallback rather than simulating Ledger.

## Never

- claim a Hedera transaction was Ledger-signed unless proven;
- display raw opaque payload as the hero approval UX;
- treat hardware approval as a replacement for YourTurn provider/mandate policy;
- omit the required Ledger tooling/DX feedback artifact.

## Handoff

Update `docs/ethonline-2026/progress.md` with supported capability, exact claim boundary, evidence and next action.
