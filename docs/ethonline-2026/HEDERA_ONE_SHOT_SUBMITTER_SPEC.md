# Final Hedera One-Shot Submitter — Security Contract

This document specifies the only missing privileged software boundary in the canonical ETHOnline recovery path. It is a contract, not an implementation, and must be implemented/reviewed without weakening the already-cleared validation layers.

## Purpose

Submit exactly one fully signed Hedera testnet transaction **after** it has passed `validateExternallySignedRecovery(...)/BEFORE_SUBMIT`, then preserve the exact transaction identity for indexed-receipt reconciliation.

## Inputs

The submitter may accept only server-selected data produced by the immediately preceding validation boundary:

- exact fully signed transaction bytes, base64;
- exact operation ID;
- exact transaction ID;
- exact validated transaction-bytes SHA-256;
- explicit human authorization for this one testnet submission.

It must not accept or derive:

- private signing keys;
- replacement transaction body fields;
- an alternate transaction ID;
- a new node ID / fee / duration / memo;
- a client-provided holder, buyer, provider, executor, economics or policy value.

## Mandatory pre-submit checks

Immediately before network dispatch:

1. the operation is the same durable `effect-started` operation;
2. retained transaction ID still equals the validated transaction ID;
3. SHA-256 of the exact submitted bytes equals the `BEFORE_SUBMIT` output digest;
4. bytes decode as the same fully signed Hedera transaction already validated;
5. no local signing, mutation, freeze/regeneration or transaction-ID recreation occurs;
6. explicit human authorization is present and scoped to this one dispatch;
7. the submitter has not already dispatched this operation/transaction ID.

If any check fails, no network dispatch occurs.

## Dispatch semantics

- Hedera **testnet only**.
- Dispatch the exact validated signed bytes once.
- Do not call a signing API.
- Do not create a replacement transaction.
- Do not automatically retry on timeout, connection loss, 5xx, ambiguous SDK error or unknown response.
- Record the exact transaction ID before/at dispatch so an unknown response can be reconciled without replay.

## Outcome model

### Definite local pre-submit failure

Return a fail-closed result. No dispatch marker should falsely claim the network saw the transaction.

### Dispatch accepted / transaction identity known

Return the exact transaction ID and transition control to the existing receipt reconciliation path. Consensus/indexing must still be proven independently.

### Outcome unknown after dispatch

Return an explicit `SUBMISSION_OUTCOME_UNKNOWN_RECONCILIATION_REQUIRED`-style state bound to the same transaction ID. Do **not** clear replay tombstones, rebuild bytes or try again.

The next action is exact transaction-ID reconciliation through Hedera/Mirror. Only a separately authorized new operation may create a new commitment/transaction if definitive absence is later established under an independently reviewed rule.

## Completion

The submitter itself never marks the recovery completed. Completion belongs exclusively to the existing indexed-receipt reconciler after it proves:

- exact NFT serial Maya → Bob;
- Bob USDC gross debit;
- Maya seller-net credit;
- exact configured royalty collector credit, if any;
- intended fee payer/network-fee rows;
- no additional fungible/NFT/HBAR movement;
- exact commitment memo/transaction identity;
- successful indexed transaction result.

## Required adversarial tests

Before Security clearance:

- different bytes after BEFORE_SUBMIT → deny before network;
- same transaction ID but mutated body → deny;
- same body with missing/extra signature → deny;
- duplicate submit call → at most one dispatch;
- concurrent duplicate submit calls → at most one dispatch;
- timeout/unknown after dispatch → no retry, reconciliation-only state;
- process restart after recorded dispatch → no automatic replay;
- mainnet configuration → deny;
- client attempts to provide/replace transaction ID or body facts → deny;
- reconciliation after mandate/payment expiry/revocation cannot generate a new spend permit.

## Claim boundary

Until an exact implementation of this contract is independently reviewed and exercised on the final integrated candidate, the new canonical D-010 settlement remains **NOT LIVE / NOT SUBMISSION-COMPLETE** even though preparation, external-signing validation and receipt verification primitives are green.