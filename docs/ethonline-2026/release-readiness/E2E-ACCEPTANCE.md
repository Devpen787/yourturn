# Submission-Grade Integrated E2E Acceptance Contract

This is the canonical final-chain acceptance test. It is intentionally stricter than the happy-path demo and must be implemented against qualified runtime surfaces before the project is called submission-ready.

## One system under test

`Ledger Recovery Mandate → World exact human-backed delegated requester → provider/holder/acquirer intersection → Hedera enforcement + settlement → authoritative product state`

There is no independent World holder-approval model and no sponsor-specific dashboard substitute for the booking-first journey.

## Fixed hero facts

- Booking: Friday Yoga.
- Current holder: Maya.
- Next holder/acquirer: Bob.
- Provider: Studio A.
- Holder minimum: **40 USDC**.
- Bad offer: **32 USDC**.
- Accepted offer: **45 USDC**.
- Golden completion copy: **`You recovered 45 USDC`**.
- Provider recovery/transfer rule exists before the recovery begins and is load-bearing.
- Compliant recovery does not require a provider employee to manually approve each transfer.

## Required ordered scenarios

### A. Authority ceremony negatives

1. Prepare the exact Friday Yoga Recovery Mandate.
2. Ledger **reject** result → assert no active mandate, no World recovery mutation, no Hedera recovery transaction.
3. Fresh prepare; Ledger **cancel** result → same no-authority assertions.
4. Fresh prepare; Ledger **approve** exact mandate → assert one active 40-USDC authority with correct booking, delegated agent, expiry, asset and no-cancel/no-widen semantics.

### B. World requester boundary

5. Valid human-backed but **wrong** registered agent requests recovery using the same resource/nonce class → assert agent mismatch and no downstream execution/replay consumption that blocks the correct agent.
6. Exact delegated registered agent signs the recovery request → assert World verification succeeds, raw human identifier remains private, and the request maps to the already-active Ledger mandate rather than a second holder grant.

### C. Below-minimum policy boundary

7. Exact agent evaluates **32 USDC** under unchanged provider rule + active 40-USDC mandate.
8. Assert BLOCK below minimum.
9. Assert **no booking transfer, no USDC settlement, no success UI**.
10. Assert Maya's active mandate remains 40 USDC and recovery can continue.

### D. Stale / revoked / provider-invalid boundaries

Run independently against fresh test state:

11. Mutate authoritative holder/listing state after mandate preparation/activation boundary → assert no stale authority survives.
12. Revoke/stop the active mandate → later recovery attempt must fail.
13. Change provider policy to prohibit recovery → later authorization/execution must fail closed.
14. Expire the mandate → later recovery attempt must fail.

None of these cases may fall back to a hidden manual/admin approval path.

### E. Successful 45-USDC recovery

15. Restore valid Studio A provider rule.
16. Activate exact Ledger mandate with minimum 40 USDC.
17. Exact World human-backed delegated agent is the requester.
18. Bob satisfies provider eligibility and the payment source for **45 USDC** is explicitly authorized/available.
19. Resolve:

`provider rules ∩ holder mandate ∩ acquirer eligibility/payment`

20. Hedera policy returns ALLOW for the exact 45-USDC invocation.
21. Prepared transaction semantics decode to exactly the intended booking movement + exact settlement, with no unintended token/HBAR movement.
22. Submit on Hedera **testnet** through the approved signer boundary.
23. Wait for receipt plus authoritative state reconciliation before rendering customer success.

### F. Final three-perspective reconciliation

24. Maya received exactly **45 USDC**.
25. Maya no longer has a usable Friday Yoga booking.
26. Bob is the authoritative next holder and sees Friday Yoga as a normal usable booking.
27. Studio A recognizes Bob as the valid holder for fulfilment/check-in.
28. The customer surface renders **`You recovered 45 USDC`** only after the authoritative facts above are reconciled.

### G. Replay / uncertainty

29. Replay the identical successful execution intent → no second settlement or second booking transfer.
30. Retry after an intentionally ambiguous/unknown submission result → reconcile network state before attempting any new mutation.
31. Evidence receipt ties the same mandate, requester, booking, provider rule, acquirer/payment and Hedera transaction together without exposing secrets/raw World human identity.

## Pass requirements

A final candidate passes only if:

- every scenario is executable or has an explicitly approved exclusion with truthful evidence labeling;
- all negatives fail before forbidden value/authority mutation;
- 40 remains the authorization minimum while 45 is the successful hero amount;
- World proves requester identity, not holder permission;
- Ledger defines holder authority, not Hedera signing;
- Hedera enforces/settles the exact resolved action;
- Bob and Studio A reconcile to the same booking state as Maya;
- replay/idempotency prevents duplicate economic effect;
- no fixture state is labeled LIVE;
- no secret/raw human identifier appears in logs/artifacts.

## Evidence output expected

The implemented test should emit one sanitized machine-readable result plus reviewer-facing proof references containing:

- exact integrated SHA;
- exact Golden executable SHAs;
- exact sponsor-qualified SHAs used;
- per-step PASS/BLOCK/FAIL classification;
- Ledger device result/evidence reference where real;
- World Sandbox + signed-route evidence references where real;
- Hedera testnet tx/receipt/public-state evidence where real;
- final Maya/Bob/Studio-A reconciliation;
- explicit evidence class for every claim.
