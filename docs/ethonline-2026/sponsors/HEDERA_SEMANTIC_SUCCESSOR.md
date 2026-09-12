# Hedera semantic successor — isolated qualification candidate

Status: **CI/LOCAL only; independent Security review pending.** No new LIVE/TESTNET claim, integration clearance, acceptance promotion, or submission readiness.

Base: `feature/ethonline-hedera@411f703e164cac82b5498c1f25a2cf21af7bc4be`.
Candidate: `feature/ethonline-hedera-semantic-qual`; exact qualification commit and compare are posted to Security issue #16.
Authority: [Decision Log #13 / D-008, D-009](https://github.com/Devpen787/yourturn/issues/13#issuecomment-5645270399), [Integration Gate #5](https://github.com/Devpen787/yourturn/issues/5#issuecomment-5645271306), and the subsequent explicit human assignment to implement this isolated successor.

## Preserved evidence and bounded source change

The historical `411f703e…` transaction remains independently qualified for its exact original movements. This branch descends directly from that commit; it does not move the historical ref or import Product, World, Ledger, Goldens, dependency remediation, or integration branches. The old 40-USDC constant remains a historical fixture, not an execution floor. The legacy semantic validator remains compatible with historical proof readers. The historical live runner is explicitly stopped before environment/key/network access in this candidate; historical execution code remains available at the immutable base.

The successor replaces the policy-authorized USDC boundary, adds exact native-payment authorization, separates the decoded economic source from the fee payer, retires the raw unbound settlement tool, and replaces its focused deterministic tests. No route or UI is connected to the new helper. The original holder-policy/H0/H1 batteries remain in place.

## Chosen native authorization

Inspected installed runtime: `@hashgraph/hedera-agent-kit 4.0.0`, `@hiero-ledger/sdk 2.81.0`, `@hashgraph/sdk 2.81.0`. Both package manifests and lock are unchanged. Lock Git blob: `f081d58c280485057e47cf6bcdc458157711786b`. No HAK 4.1 graph was imported.

An HTS allowance via `AccountAllowanceApproveTransaction.approveTokenAllowance(token, owner, spender, amount)` can cap an amount but cannot bind its recipient, NFT serial, quote, operation, or expiry. A bare 45-USDC allowance is therefore not the selected exact-payment authorization. [Hedera allowance reference](https://docs.hedera.com/native/accounts/approve-allowance), [allowance protobuf fields](https://hashgraph.github.io/hedera-protobufs/#tokenallowance).

The existing native alternative is Bob's detached signature on one exact frozen `TransferTransaction`. The ordinary USDC debit requires Bob's native account signature; the NFT debit uses Maya's single-serial approved-transfer authority. One transaction contains exactly one approved NFT movement Maya -> Bob and one 45-USDC movement Bob -> Maya. An external agent signer can attach Bob's existing signature with `addSignature`, add its own fee-payer signature, and submit the unchanged body within the validity window without another Bob interaction. This candidate does not implement or run that final signer/submission step. [Native atomic swaps](https://docs.hedera.com/native/tokens/atomic-swaps), [native multisignature assembly](https://docs.hedera.com/native/transactions/multisig).

SDK source inspected: `src/account/AccountAllowanceApproveTransaction.js:approveTokenAllowance`, `src/token/AbstractTokenTransferTransaction.js:addApprovedTokenTransfer` / `addTokenTransferWithDecimals`, `src/PublicKey.js:verifyTransaction`, and `src/transaction/Transaction.js:addSignature`. Verification explicitly checks one signature map/key before using `verifyTransaction`; an empty signature map must not count as authorization.

HAK 4.0 `ReturnBytesStrategy.handle` unconditionally generates/replaces the transaction ID before freezing. That invalidates an existing exact-body signature. The small private `ExactPaymentReturnBytesTool` keeps the existing BaseTool/AbstractPolicy lifecycle but serializes the already frozen, verified body in RETURN_BYTES mode. It has no EXECUTE strategy and is not publicly registered in tool discovery. The discovered legacy USDC tool fails closed.

## Explicit roles and scope

| Role | This candidate |
| --- | --- |
| delegatedAgentAccountId | Maya's NFT allowance spender |
| settlementSourceAccountId | Bob's native account |
| receiverAccountId | Bob |
| settlementRecipientAccountId | Maya |
| transactionFeePayerAccountId | The NFT allowance spender / agent |

Hedera requires the approved-transfer spender to be the transaction fee payer; arbitrary separation of those two values is not supported by this primitive. The economic source is independently Bob. This candidate deliberately supports Bob funding himself with a single native Ed25519 or ECDSA key; alternate funding accounts, threshold/contract keys, and unrelated relayers fail closed. [Protocol payer constraint](https://docs.hedera.com/native/accounts/approve-allowance).

The payment commitment includes a versioned testnet domain, commitment ID, durable operation ID, active mandate ID, booking token/serial/holder, all five actor roles, USDC token/decimals, exact amount, quote ID/hash, provider ID/version, exact fee-payer transaction ID, one node ID, fee cap, duration, and expiry. Its canonical hash is in the transaction memo. Bob's native body signature therefore binds both economic transfers and that complete commitment.

This is a short-window authorization: one node (`0.0.3`), a whole-second transaction valid start, and a 30–120-second duration. The commitment expiry must equal the native transaction expiry and fit within mandate, provider, and quote expiry. Expiry or a changed body requires fresh Bob authorization. No allowance remains on Bob's account, and no YourTurn custodial balance exists.

## Server boundary, current policy, and replay

`preparePolicyAuthorizedUsdcRecovery` accepts an operation ID, detached signature, and a trusted server `resolveState` dependency. It does not accept a client key, client mandate, or client quote as authoritative. Integration must implement that resolver from the active verified holder mandate, immutable quote/operation records, current provider policy, buyer binding, payment revocation state, current funding-account key/token balance, exact single-serial allowance, and token fee metadata. Both token fee schedules must be empty and immutable; missing/custom/mutable fee evidence denies preparation to preserve exact net economics. This isolated candidate provides no fixture resolver or production route fallback.

The resolved snapshot must be no older than five seconds, with an ALLOW provider policy matching the committed version. Holder and provider minima are independent; an explicitly absent provider floor is `null`, not a missing field. Active holder 40 blocks quote 32; freshly authorized active holder 30 permits 32 only when the provider permits it. Provider floor 35 still blocks 32. Rejected/pending replacements must never be returned as active by the future Ledger resolver; no Ledger device/replacement implementation is claimed here.

Current holder/agent/action/provider checks remain load-bearing through `BookingRightDelegationPolicy`. Last in that policy, operation ID, payment commitment ID, and original mandate nonce are reserved together using one Redis EVAL. Tombstones have no TTL and are never released on preparation failure; an ambiguous/failed preparation may burn the operation rather than permit another transfer. Unavailable/unexpected store results fail closed. New signatures/mandates cannot reopen the same operation, and a commitment cannot be attached to another operation.

Only after authorization/policy/reservation does the tool serialize an export. Returned bytes remain unsigned; the already verified detached Bob signature is a separate result field for the external signer. Denials have no envelope, bytes, or returned payment signature. The output is decoded again, its movements checked, and Bob's signature verified against the serialized body.

## Evidence and review limits

`../evidence/hedera-semantic-successor-local.json` records exact commands, exit codes, runtime graph, and tested source hashes. The focused check uses public deterministic keys and expired 2023 fixture transaction IDs only. No live account key, testnet transaction, funding, production deployment, or signature of a live transaction was used.

The focused checks include 40/32/45 and active 30/provider conflicts, actor/asset/serial/quote/amount mutations, native-signature binding, missing/forged/insufficient authorization, current key authority, expiry/revocation/staleness, malformed holder actions, duplicate/reused/concurrent operations, store failures, raw-tool bypass denial, and no bytes on denial. Existing H0/H1/holder-policy/provider-state checks also run. Local type checking and production build pass; the inherited dependency graph is preserved, not security-cleared or remediated by this work.

Independent review must re-attack the exact commit. In particular, the Redis Lua script has been source-reviewed but has **not** been executed against a Redis service here; deterministic replay tests use an atomic memory fixture and exercise fail-closed behavior. No current on-chain allowance, association, fee schedule, liquidity, or native settlement execution has been queried or proved for this successor. The resolver must attest the current empty, immutable fee schedules required by the code; real metadata for that condition is not yet qualified. Integration must verify current NFT allowance and account/token state, enforce the trusted resolver, and recheck authority before any external agent signature/submission. There is no implemented device wallet ceremony, long-lived scheduling, autonomous live signer, or final integrated route in this branch.

Next action: independent Security review of the exact SHA/diff and native signature/replay boundary. Any live qualification or integration selection is a separate gate. Historical proof stays historical; this candidate is not self-qualified green.
