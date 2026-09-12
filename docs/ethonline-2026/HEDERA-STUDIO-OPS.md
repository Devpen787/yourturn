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

The tool requires:

- the wallet/session account to equal the intended receiver account; account-switch mismatch is rejected;
- an exact Mirror account record for the receiver;
- `receiver_sig_required` not to demand an unmodeled recipient-signature step;
- an existing BOOKED token relationship;
- BOOKED to be `FROZEN` at rest, matching the selected `freezeDefault=true` production model;
- BOOKED KYC status to be granted/not-applicable;
- an existing settlement-token relationship for Circle Hedera USDC;
- settlement token not to be frozen;
- settlement KYC status to be granted/not-applicable;
- no relevant pending airdrop state for BOOKED or settlement token;
- every required Mirror read to succeed.

A successful result means only that the receiver is ready to enter the already-qualified *shape* of a controlled paid-delivery path. The BOOKED relationship still requires the provider-authorized unfreeze/refreeze operations inside the HIP-551 batch. It is never permission to submit a transaction.

**Paid delivery may not degrade into HIP-904 pending airdrop.** HIP-904 remains reserved for gift/comp/promo semantics under the Studio-Tomorrow architecture.

## Authoritative provider policy

`yourturn_studio_policy_tool` does not accept policy rules from the HAK request. The plugin requires an injected server-side `loadProviderPolicy` reader and verifies the returned provider/version is active and declares the selected `default_frozen_hip551` transfer mode.

Canonical authorization remains:

`provider rules ∩ active holder mandate ∩ buyer eligibility/payment`

This Phase B tool only reads the provider-policy projection. It does not evaluate or execute the final authority-changing boundary.

## Resale receipt boundary

`yourturn_studio_resale_receipt_tool` reads one successful exact Mirror transaction and verifies:

- exactly one approved BOOKED serial movement from seller to buyer;
- exactly two fungible settlement-token rows;
- exact settlement token;
- exact Bob-funded debit (`settlementSourceAccountId`);
- exact seller/recipient credit;
- exact atomic-unit amount.

It deliberately returns `hip551BatchContainmentVerified: false`. A successful receipt check is not evidence that the settlement sat inside the required Phase A HIP-551 unfreeze/transfer/refreeze outer batch. That remains a separate qualification boundary.

## Network-health contract

`yourturn_studio_network_health_tool` is read-only preflight using Hedera Status and Mirror freshness. A new write preparation is considered safe only when:

- Hedera Status reports no active incident (`indicator: none`), and
- the latest Mirror transaction timestamp exists, parses correctly and is within the configured maximum lag.

Status read failure, Mirror read failure, missing freshness evidence, stale Mirror data or a future/inconsistent timestamp all fail closed. Temporary read failure never becomes permission to prepare or execute a write.

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
- holder mismatch;
- account-switch identity mismatch;
- receiver-signature-required state;
- missing BOOKED association;
- BOOKED unexpectedly unfrozen at rest;
- KYC denial;
- frozen settlement relationship;
- relevant pending airdrop;
- Mirror read failure;
- missing/ambiguous account facts;
- provider-policy identity mismatch;
- extra settlement transfer row;
- stale Mirror freshness;
- missing Mirror freshness;
- degraded Hedera status;
- unavailable Hedera status.

## Next gate

After exact-head CI is green, post the exact branch/SHA/run/artifact to issue #48 and Security #16 for independent review. No Phase C implementation and no final integration import should treat this Phase B surface as qualified until Security records an exact disposition.
