# PRD 02 — BookingRightDelegationPolicy

## Goal

Turn the Hedera authority primitive into a safe YourTurn domain capability enforced through a reusable Agent Kit v4 policy/tool boundary.

## Required mandate fields

- owner/holder reference;
- delegated agent/spender;
- booking token + serial;
- allowed actions;
- minimum recovery amount;
- currency;
- expiry;
- cancellation permission;
- unique intent/nonce.

## Policy checks

- current holder still owns the booking;
- requesting agent matches delegation;
- requested serial matches;
- requested action is allowed;
- amount/currency fit mandate;
- mandate is not expired/revoked;
- provider rules allow the action;
- intent has not already executed;
- required Hedera allowance exists when execution needs it.

## Outcomes

Return explicit `ALLOW`, `BLOCK`, or `ESCALATE` plus stable reason codes suitable for UI, logs and tests.

## Mandatory tests

- wrong agent;
- wrong serial;
- expired mandate;
- below minimum;
- forbidden cancel;
- provider-policy conflict;
- revoked allowance;
- replayed intent.

## Constraints

Do not loosen existing YourTurn safety policies. Do not treat World or Ledger signals as substitutes for booking/provider authorization.
