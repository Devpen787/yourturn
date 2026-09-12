# Cold Judge Runbook — ETHOnline 2026

Goal: prove a judge can understand and exercise the submission from the repository entry point without hidden verbal context.

This runbook has two gates. **Software rehearsal** can run before live/device proof. **Final live rehearsal** cannot be marked PASS until the human ceremony evidence exists on the exact selected integration SHA.

## Gate 0 — discoverability

A cold judge starts at `README.md`.

PASS only if the README:

- identifies ETHOnline 2026 and the three intended Continuity tracks;
- points to `/product-preview` for the approved Product journey;
- explains the canonical `/api/agent/confirm` boundary;
- distinguishes FIXTURE / CI-LOCAL / DEVICE / LIVE-TESTNET evidence;
- states pending claims rather than reusing historical Week-5 proof as the submission;
- links this runbook, the human ceremony and the machine-readable evidence file.

Any old Week-5-only entry point is a discoverability FAIL.

## Gate 1 — exact candidate and viewport matrix

Before browser work, record:

- exact candidate SHA;
- exact Product parent `342f46ee6e0c4d0f332287d8433735c5ac015528`;
- exact runtime Security checkpoint ancestor;
- integration workflow run URL/result;
- one fixed seed/clock where the fixture harness requires deterministic time.

Run visible UI at both:

- desktop: `1440 × 1000`;
- mobile: `390 × 844`.

Do not substitute screenshots from a different SHA.

## Gate 2 — Product R5 rehearsal

Start from `/product-preview` and complete the intended Maya → Bob → Studio A story with visible controls.

Verify at minimum:

1. Maya holds the booking and can see the current recovery state.
2. Provider floor/policy changes propagate consistently into holder truth.
3. Maya lists the booking and Bob discovers the same listing facts.
4. Expiry closes resale eligibility instead of leaving a stale CTA.
5. The first Bob payment failure preserves the listing and does not create a false receipt.
6. Explicit retry succeeds exactly once.
7. Receipt/economic presentation remains consistent after success.
8. Cancellation propagation updates the appropriate Maya/Bob views while prior receipt evidence remains preserved.

The approved R5 browser/state suites remain the acceptance baseline; do not redesign the journey during rehearsal.

## Gate 3 — navigation and duplicate behavior

On both desktop and mobile, exercise:

- refresh at each canonical milestone;
- browser Back then Forward;
- explicit reload after the payment/commit transition;
- duplicate click/submit attempts where the UI exposes them;
- reopening the same operation/status after an effect has started;
- invalid/expired/revoked states.

PASS only if state converges to one authoritative result with no second payment/effect, no stale parallel truth, and no user-visible server/render error.

## Gate 4 — canonical sponsor software boundary

Inspect the current candidate rather than assuming the UI proves sponsor integration.

Required software evidence:

- Ledger Recovery Mandate is the holder authorization source;
- World request verification binds the exact requester/resource/operation/intent and cannot choose the holder;
- current provider policy, public enrollment, payment, eligibility and Hedera chain facts are server selected;
- only one component owns `claimed → effect-started`;
- exact Hedera output is retained before external executor signing;
- `BEFORE_SIGN` and `BEFORE_SUBMIT` validators do not sign or submit;
- receipt reconciliation is bound to the exact transaction ID/commitment;
- no `ApprovalGrant` parallel holder authority survives on the canonical route.

## Gate 5 — final live rehearsal (only after HUMAN_CEREMONY.md)

Replay one complete live/testnet operation on the exact selected SHA:

1. physical Ledger approval of the exact mandate;
2. credential-bearing canonical World request;
3. canonical operation reaches retained `effect-started` state;
4. external executor signs the validated exact bytes;
5. one human-authorized testnet submission;
6. indexed receipt reconciliation completes the operation;
7. Product/receipt surfaces show the exact final economics and state.

Then prove the required negatives are still fail-closed:

- Ledger rejection causes no authority mutation;
- stale/replayed mandate denied;
- tampered/unresolved/replayed World request denied;
- wrong buyer/agent/serial or policy drift denied;
- duplicate settlement attempt cannot create a second effect.

## Gate 6 — claim audit

Before recording a PASS, compare every demo statement with the evidence manifest.

Do not say:

- “Ledger signed the Hedera transaction” unless that exact supported path exists;
- “World verifies the booking owner”;
- “atomic settlement” unless the one verified transaction contains every claimed movement;
- “live” for fixture/CI-only evidence;
- “seller receives 45 USDC” when D-010 royalty means Maya receives seller net rather than gross.

## Final disposition

Use exactly one:

- `PASS — COLD JUDGE`: all discoverability, Product, sponsor, live and negative gates complete on one exact SHA.
- `PASS — SOFTWARE ONLY`: discoverability/Product/software pass, but one or more DEVICE/LIVE gates remain pending. This is not submission-final.
- `REVISE`: a reproducible product/integration/evidence defect exists.
- `BLOCKED_EXTERNAL`: software is ready but a named device/credential/testnet external action is unavailable.

Record the exact disposition, SHA, workflow runs and evidence references in issue #18.