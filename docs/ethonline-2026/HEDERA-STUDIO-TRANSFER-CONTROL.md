# Hedera Studio-Tomorrow transfer-control qualification

Status: **credential-free qualification candidate only**. This document does not authorize a live token, signing, submission, integration import, production deployment, mainnet use or reinterpretation of historical evidence.

Human selection: Decision Log #13 comment `5648251414`. Architecture source: #48 comment `5648128857`. Integration routing: #5 comment `5648252537`.

## Evidence lineage and non-regression boundary

- Historical ETHOnline Hedera LIVE/TESTNET checkpoint remains immutable at `411f703e164cac82b5498c1f25a2cf21af7bc4be`. It proves the earlier demo token / single settlement transaction under its exact reviewed semantics.
- The current PR #24 additive reviewer/judge surface at `30033a109ce72df6299325df72fcf44d8ed56e01` is a separate CI/LOCAL Security scope and is not consumed here.
- This qualification starts from the independently Security-cleared D-010 royalty/net lineage `47b8f936a3c9cc793b4ecf1de1814a6b4f900515`, which already distinguishes Bob's gross stable-value funding, seller net, provider-selected royalty and the delegated execution role.
- The existing demo `BOOKED` creation does **not** set `freezeDefault=true`. Therefore neither `411f703e...` nor the current global demo token is evidence that provider transfer policy is enforced at the asset layer.

No existing Hedera source, package manifest, lockfile, Product Golden, World code, Ledger code or live runner is modified by this transfer-control increment.

## Selected production direction

A production booking right is self-custodied but intentionally **not permissionlessly transferable**. A studio/provider owns a scoped HTS NFT collection (or immutable commercial-policy version) with provider-scoped treasury/supply/freeze/fee roles and `freezeDefault=true`.

The authorization decision remains outside the token mechanics:

`provider rules ∩ active holder mandate ∩ buyer eligibility/payment`

HIP-551 Atomic Batch Transaction is execution containment after that decision. The selected transaction shape is:

1. unfreeze seller relationship;
2. unfreeze receiver relationship when it is currently frozen;
3. transfer exactly one approved booking NFT serial from seller to receiver and exactly the authorized stable-value amount from Bob to Maya;
4. refreeze seller relationship;
5. refreeze receiver relationship.

If the receiver was already unfrozen, step 2 is omitted, but step 5 is still mandatory so the acquired entitlement returns to the intended frozen-at-rest state.

## Role separation

The qualification keeps five roles explicit:

- `sellerAccountId` — Maya/current holder; sends the exact booking serial and receives settlement value.
- `receiverAccountId` — Bob; receives the booking serial.
- `settlementSourceAccountId` — Bob's exact stable-value funding account; must equal the receiver for this bounded product model.
- `delegatedAgentAccountId` — the approved NFT allowance spender executing the booking-authority movement.
- `providerOperationsAccountId` — provider-scoped operations role used as payer for freeze/unfreeze transactions and the outer batch.

The provider operations role is deliberately distinct from seller, buyer and delegated agent in this qualification.

### Important fee-payer boundary

Hiero JS SDK 2.81 implements HIP-551 with independently signed inner transactions, and fees are assessed per inner transaction. The current approved-NFT recovery semantics also bind the delegated allowance spender to the transfer inner transaction payer. Therefore this qualification **does not claim** that one provider relayer can pay every inner transaction fee while the delegated agent remains a different approved spender.

The bounded model proves only:

- provider operations pays the freeze/unfreeze transactions and outer batch;
- delegated agent is payer/spender for the approved NFT + USDC transfer inner transaction;
- Bob is the economic USDC funder/receiver and is not a Hedera network-fee payer in this shape.

A later gas-sponsorship abstraction must receive separate protocol/security qualification if it attempts to separate the approved NFT spender from the transfer payer.

## HIP-551 support on the existing dependency root

The qualification uses the already locked Hiero 2.81 line. Official SDK source for v2.81 contains `BatchTransaction`, atomic-batch decoding and `Transaction.batchify(...)`.

`batchify(client, key)` is intentionally **not invoked** here because the SDK implementation signs with the client's operator. This credential-free proof instead uses the same public batch-key primitive directly (`setBatchKey`), assigns local transaction IDs, freezes unsigned inner transactions, and serializes/decodes the resulting `BatchTransaction`. No dependency upgrade is required.

Package and lock files must remain byte-identical throughout hosted qualification.

## Fail-closed contract

`validateControlledBookingTransferBatch` accepts only the exact selected structure. It rejects, among other cases:

- a non-batch transaction;
- missing seller/receiver refreeze;
- an unfreeze-only batch;
- unexpected/extra inner transactions;
- collection-wide NFT allowance operations;
- wrong booking token, serial, seller or receiver;
- a non-approved NFT movement;
- extra NFT movements;
- wrong stable-value token, funder, recipient, amount or decimals;
- extra fungible-token movement;
- any HBAR movement;
- a transfer payer other than the delegated allowance spender;
- wrong provider-operations payer on freeze/unfreeze or outer batch;
- unexpected signatures in this unsigned qualification artifact;
- missing/changed batch keys;
- malformed or contradictory trusted-current-state preconditions;
- non-provider-scoped or non-default-frozen production assumptions;
- seller/receiver/agent/provider-operations role collisions.

The current-state booleans are qualification inputs, not a new HTTP trust surface. A real consumer must resolve them from independently reviewed provider policy, canonical holder mandate, current chain state, booking lifecycle and exact payment authorization before constructing the batch, and must revalidate at the live signing/effect boundary.

## What this does not prove

This candidate does **not**:

- create a new HTS token;
- change the existing demo BOOKED token;
- load a private key, mnemonic, wallet secret or operator;
- sign any transaction;
- submit a transaction or mutate Testnet/Mainnet;
- establish a real provider custody implementation;
- prove a live Bob-funded batch;
- prove Mirror consensus freshness or lock external state;
- select a final integration checkpoint;
- qualify MetaMask Snap, HIP-904 gifting, HIP-850 metadata update or Studio Ops HAK tools;
- self-certify Security.

A LIVE production-shaped proof requires a fresh provider-scoped test collection created with the selected keys and `freezeDefault=true`, exact current policy/holder/payment resolution, external signatures, the controlled batch execution, receipt/Mirror reconciliation and independent Security review.

## Credential-free acceptance

The dedicated workflow must establish, on the exact branch SHA:

1. locked install on the existing dependency graph;
2. byte-identical `package.json` and `package-lock.json` before/after install and tests;
3. `BatchTransaction` and `Transaction.batchify` present on the installed Hiero 2.81 SDK;
4. successful unsigned construct -> serialize -> decode -> exact semantic validation;
5. broad deterministic fail-closed adversarial matrix, including collection-wide allowance and HBAR/extra-movement escape attempts;
6. zero signatures, zero submissions, zero real credentials/network mutation;
7. inherited Hedera Agent Kit/delegation/booking-policy checks green;
8. explicit TypeScript and production build green;
9. handoff of exact SHA/tree/run/job/artifact to #16 for independent review before any consumption.
