# Hedera Studio-Tomorrow — Phase B read-only Studio Ops qualification

Status: **CI/LOCAL candidate only**. This document does not authorize signing, submission, token creation, funding, testnet/mainnet mutation, deployment, integration import or a claim that studios can use the controlled-transfer model live.

## Lineage and preserved history

- Human production direction: Decision Log #13 comment `5648251414`.
- Architecture source: issue #48 comment `5648128857`.
- Integration routing: issue #5 comment `5648252537`.
- Phase A transfer-control exact accepted source: `feature/ethonline-hedera-transfer-control-qual@facd02f14ebd80e591bfe66fca47f165494229f4`.
- Independent Phase A disposition: Security #16 comment `5648871586` — `CLEARED CI/LOCAL TRANSFER-CONTROL SHAPE`.
- Historical canonical Hedera LIVE/TESTNET proof remains immutable at `411f703e164cac82b5498c1f25a2cf21af7bc4be`.
- Additive judge/reviewer head `30033a109ce72df6299325df72fcf44d8ed56e01` remains a separate CI/LOCAL line.
- Official HAK MCP remains STOP on the current root after compatibility probe `90905a508c5b502742ba2781d9dc98a9bc480c41` / run `34712289164`.

Phase B branches from the independently accepted Phase A checkpoint. It does not rewrite Phase A or the historical LIVE evidence.

The first Phase B candidate `fa9dc01610587d63918f9497596ba58beb5fe49f` received independent Security **REVISE** in #16 comment `5649182035` for three source-level fail-open classes: SEC-HEDERA-010 trusted wallet identity, SEC-HEDERA-011 malformed/partial Mirror+Status facts, and SEC-HEDERA-012 exact-root Mirror receipt binding. This revision addresses only those findings; it does not widen the Phase B claim boundary.

## Purpose

Add a bounded HAK `BaseTool` query surface for studio/provider operations without any signing key, transaction builder, transaction submission path or official MCP runtime dependency.

The six methods are:

1. `yourturn_studio_inventory_tool`
2. `yourturn_studio_booking_holder_tool`
3. `yourturn_studio_receive_readiness_tool`
4. `yourturn_studio_policy_tool`
5. `yourturn_studio_resale_receipt_tool`
6. `yourturn_studio_network_health_tool`

All tool schemas are strict Zod objects. All outputs explicitly identify the surface as read-only, unsigned, unsubmitted and unable to authorize mutation.

## Receive-readiness contract

Paid purchase/resale must fail closed before payment execution if the receiver cannot safely participate in the selected controlled-transfer architecture.

The authoritative wallet/session identity is **not** accepted from the HAK request. The plugin requires an injected `loadConnectedHederaAccountId` source representing trusted server/runtime wallet-session context. The requested `receiverAccountId` must equal that trusted identity. A client `connectedAccountId`, when present, is only a consistency/display assertion and cannot establish authority; disagreement with the trusted identity fails closed. Missing/unavailable/malformed trusted identity also fails closed.

The tool further requires:

- an exact Mirror account record for the receiver;
- explicit `receiver_sig_required === false`; `true`, missing or malformed state blocks the paid path;
- an existing BOOKED token relationship returned in an explicit token-relationship array;
- BOOKED to be explicitly `FROZEN` at rest, matching the selected `freezeDefault=true` production model;
- BOOKED KYC status to be granted/not-applicable;
- an existing settlement-token relationship for Circle Hedera USDC;
- settlement freeze state to be explicitly `UNFROZEN` or `NOT_APPLICABLE`; `FROZEN`, missing or unknown state blocks;
- settlement KYC status to be granted/not-applicable;
- an explicitly present pending-airdrop array and no relevant pending airdrop for BOOKED or settlement token;
- every required Mirror read to succeed.

A successful result means only that the receiver is ready to enter the already-qualified *shape* of a controlled paid-delivery path. The BOOKED relationship still requires the provider-authorized unfreeze/refreeze operations inside the HIP-551 batch. It is never permission to submit a transaction.

**Paid delivery may not degrade into HIP-904 pending airdrop.** HIP-904 remains reserved for gift/comp/promo semantics under the Studio-Tomorrow architecture.

## Exact-holder contract

`yourturn_studio_booking_holder_tool` treats the requested token and serial as part of the evidence identity. A Mirror response must contain a valid Hedera account holder plus the exact requested `token_id` and exact requested `serial_number`; missing or substituted token/serial facts fail closed. An optional expected holder remains an additional equality check.

## Authoritative provider policy

`yourturn_studio_policy_tool` does not accept policy rules from the HAK request. The plugin requires an injected server-side `loadProviderPolicy` reader and verifies the returned provider/version is active and declares the selected `default_frozen_hip551` transfer mode.

Canonical authorization remains:

`provider rules ∩ active holder mandate ∩ buyer eligibility/payment`

This Phase B tool only reads the provider-policy projection. It does not evaluate or execute the final authority-changing boundary.

## Resale receipt boundary

`yourturn_studio_resale_receipt_tool` qualifies only the exact **root** Mirror transaction for the supplied payer + valid-start transaction identity. The Mirror query is bounded to `nonce=0&scheduled=false`, and the returned evidence must itself contain exactly one matching row with:

- exact `transaction_id`;
- `nonce === 0`;
- `scheduled === false`;
- `result === SUCCESS`;
- exactly one approved BOOKED serial movement from seller to buyer;
- exactly two fungible settlement-token rows;
- exact settlement token;
- exact Bob-funded debit (`settlementSourceAccountId`);
- exact seller/recipient credit;
- exact atomic-unit amount.

A child transaction (`nonce > 0`) or scheduled sibling cannot substitute for the root even when it shares payer + valid-start and otherwise reproduces the expected transfer effects. Duplicate roots and failed roots are rejected.

The tool deliberately returns `hip551BatchContainmentVerified: false`. A successful root receipt check is not evidence that the settlement sat inside the required Phase A HIP-551 unfreeze/transfer/refreeze outer batch. That remains a separate qualification boundary.

## Network-health contract

`yourturn_studio_network_health_tool` is read-only preflight using Hedera Status and Mirror freshness. A new write preparation is considered safe only when:

- the Status read succeeds and structurally contains `status.indicator === "none"`; and
- the Mirror read succeeds and structurally contains a non-empty `transactions` array whose latest row has a valid consensus timestamp within the configured maximum lag.

Thrown reads, `null`, empty objects, missing fields, malformed enums/timestamps, empty transaction lists, stale data, or future/inconsistent timestamps all fail closed. Temporary or ambiguous read state never becomes permission to prepare or execute a write.

## Credential / mutation boundary

The Studio Ops plugin contains no:

- `PrivateKey` handling;
- `setOperator` path;
- `handleTransaction` call;
- HTS transaction-builder import;
- airdrop transaction builder;
- HIP-551 batch builder;
- environment-secret read;
- official `@hashgraph/hedera-agent-kit-mcp` dependency.

The Phase B checker uses deterministic injected readers. It does not call Hedera testnet, submit bytes or mutate network state.

## Qualification attacks

The deterministic checker must cover at least:

- malformed/extra schema input;
- exact-holder mismatch plus token/serial substitution;
- caller fields agreeing with each other while disagreeing with the trusted session account;
- missing/invalid trusted wallet/session identity;
- optional client connected-account disagreement with trusted identity;
- receiver-signature-required state and missing receiver-signature state;
- missing BOOKED association;
- malformed/missing token-relationship list;
- BOOKED unexpectedly unfrozen at rest;
- BOOKED missing/unknown freeze state;
- KYC denial;
- frozen settlement relationship;
- settlement missing/unknown freeze state;
- relevant pending airdrop;
- missing/partial pending-airdrop response;
- Mirror read failure;
- missing/ambiguous account facts;
- provider-policy identity mismatch;
- extra settlement transfer row;
- child-only receipt;
- scheduled-only receipt;
- child-before-root and scheduled-before-root with root selection still exact;
- duplicate root receipt;
- non-SUCCESS root receipt;
- stale Mirror freshness;
- empty, null or malformed Mirror freshness response;
- degraded Hedera status;
- unavailable, null or malformed Hedera status.

## Next gate

After exact-head CI is green, post the exact branch/SHA/run/artifact to issue #48 and Security #16 for independent re-review of SEC-HEDERA-010/011/012. No Phase C implementation and no final integration import should treat this Phase B surface as qualified until Security records an exact disposition such as `CLEARED CI/LOCAL STUDIO-OPS SHAPE`.
