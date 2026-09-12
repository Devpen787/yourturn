# Post-Confirm Signing State — Security Contract

This document specifies the missing server boundary between a durable `effect-started` operation and the existing `BEFORE_SIGN` / `BEFORE_SUBMIT` validation primitives.

It is deliberately separate from the one-shot network submitter. This boundary is **read/validation authority only** and must never become a new effect permit.

## Problem

`/api/agent/confirm` currently ends after the canonical operation has crossed exactly once into `effect-started` and retained the exact unsigned Hedera transaction. External signing is a later human interaction and may take longer than the operation's short worker lease.

The existing `takeOverRecoveryOperation(...)` path for an expired `effect-started` operation is explicitly receipt-only. Reusing that receipt-only takeover as permission to sign or submit would weaken the authority model.

## Required output

The boundary must provide the existing external-signing validator with:

```text
{
  state: current exact ResolvedUsdcRecoveryState,
  executor: {
    accountId: exact current Hedera executor account,
    publicKey: exact current native executor public key,
    resolvedAtMs: bounded current observation time
  }
}
```

for exactly one stored operation ID, or fail closed.

It grants **no** execution permission, effect permit, signing key, submission permission, replay reset or authority mutation.

## Required reconstruction

For every `BEFORE_SIGN` and `BEFORE_SUBMIT` validation request, reconstruct from server/durable sources rather than request JSON:

1. authenticated owner identity;
2. durable recovery operation selected by owner + operation ID + stored intent hash;
3. exact retained transaction references;
4. the mandate identity/digest/generation captured by the operation;
5. current mandate pointer and booking authority version;
6. pinned public enrollment / World requester / Hedera executor mapping;
7. current payment record;
8. current Bob business eligibility;
9. current provider policy/version/validity window;
10. current booking owner/serial allowance;
11. current Bob funding account public key and USDC balance;
12. current executor native public key;
13. current token/custom-fee metadata and D-010 economics.

Then recompute the same full canonical intent and require:

```text
recomputedIntentHash === durableOperation.intentHash
```

before returning signing state.

The caller may supply only the operation selector and, for `BEFORE_SUBMIT`, the candidate fully signed bytes. It may not supply holder, buyer, provider, enrollment, executor key, payment, economics, policy or canonical projection facts.

## Lease / expiry rule

A worker lease is not itself the user's business authorization. However, an expired worker lease must not silently become a new spend permit either.

Security must explicitly choose/approve one of these designs before implementation:

### Option A — read-only post-lease signing validation

Allow reconstruction after worker-lease expiry **without changing the operation record**, but only while all original mandate/current-authority/provider/payment/eligibility/transaction validity facts remain current and the full canonical intent hash is unchanged.

This returns validation state only. The separate one-shot submitter still needs explicit human authorization and duplicate-dispatch protection.

### Option B — signing-specific authority reacquisition

Introduce a separately reviewed CAS transition that reacquires a short signing-validation lease for an existing `effect-started` operation only after current authority + full canonical intent revalidation. It may not rerun preparation, create new bytes, clear tombstones or move the operation back to `claimed`.

Receipt-only takeover remains distinct.

Do **not** use the existing receipt-only takeover as signing permission without an explicit Security finding approving equivalent semantics.

## Mandatory invariants

- operation phase must already be `effect-started`;
- exact retained transaction ID/envelope digest must be attached;
- preparation is never rerun;
- `claimed → effect-started` is never repeated;
- payment tombstones are never cleared/recreated;
- expired/revoked/replaced mandate denies signing validation;
- changed provider policy/eligibility/payment/allowance/token-fee state denies signing validation;
- changed World/application enrollment mapping denies because canonical intent changes;
- rotated executor key is reflected by current chain state and old signatures fail;
- current transaction validity window must still support the requested validation stage;
- no request-provided projection can substitute for reconstructed state;
- no lease recovery path may submit a transaction by itself.

## Required adversarial tests

- expired worker lease + unchanged valid authority: behavior matches the Security-approved design and never reruns preparation;
- expired mandate: deny;
- revoked/replaced mandate: deny;
- authority-version or current pointer drift: deny;
- provider policy/version drift: deny;
- eligibility change: deny;
- Bob funding key/balance drift: deny;
- executor key rotation: old signed bytes deny;
- booking allowance/owner drift: deny;
- royalty/custom-fee schedule drift: deny;
- public enrollment mapping drift: deny;
- durable operation intent hash mismatch: deny;
- request-supplied forged projection/current facts: ignored or rejected;
- concurrent post-confirm validation cannot create another effect or another preparation;
- receipt-only reconciliation after authority expiry still works but never produces a signing permit.

## Claim boundary

Until this reconstruction/lease contract is independently approved and implemented, the existing external-signing functions remain qualified primitives rather than a complete ceremony-ready production route.