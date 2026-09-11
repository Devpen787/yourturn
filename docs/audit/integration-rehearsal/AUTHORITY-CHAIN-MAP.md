# Authority Chain Map — Ledger → World → Hedera

Evidence class: **AUDIT / CI-LOCAL**, proven by `scripts/integration-rehearsal/authority-chain-contract.mjs`.
No network, no Hedera submission, no World Sandbox call, no Ledger device, no secrets.

## Canonical mandate projection

The signed Ledger `RecoveryMandate` (EIP-712, domain `YourTurn Recovery Mandate` v1, chainId 296) is the intended root of authority. This is how each field must reach Hedera.

| Concept | Ledger producer | Hedera consumer | Mismatch | Source of truth |
| --- | --- | --- | --- | --- |
| owner | `ownerId: string` (app identity) | `holderAccountId: string` (`0.0.x`) | **domain mismatch, no adapter** | trusted server state |
| delegated agent | `agentId: string` (app/World identity) | `delegatedAgentAccountId` **and** `spenderAccountId` | **domain mismatch + 1→2 arity** | trusted server state |
| booking token | `bookingTokenId` (`^0\.0\.[1-9]\d*$`) | `tokenId` | none | signed mandate |
| booking serial | `bookingSerial: bigint` | `serial: number` | **bigint → number narrowing** | signed mandate |
| allowed action | `allowedAction: string` (free) | `allowedActions: ("DELEGATE"\|"REVOKE"\|"RECOVER")[]` | **string → enum array** | signed mandate |
| minimum recovery | `minimumRecoveryAtomicUnits: bigint` | `minimumRecovery.atomicUnits: string` | **bigint → decimal string** | signed mandate |
| settlement asset | `settlementAsset: string` token id | `minimumRecovery.asset: {kind:"HTS",tokenId}` | **string → tagged union** | signed mandate |
| expiry | `expiresAt: bigint` **SECONDS** | `expiresAtMs: number` **MILLISECONDS** | **1000× unit mismatch** | signed mandate |
| cancellation | `cancellationAllowed: boolean` | `cancellationAllowed: boolean` | none | signed mandate |
| nonce / replay | `nonce` + `mandateId` + EIP-712 `digest` | `invocation.nonce` → policy-derived key | **two independent replay stores** | server |
| provider policy | **ABSENT — not a signed field** | `delegation.providerPolicyId` + `invocation.providerPolicy{id,state}` | **missing from the signature** | trusted server state |

### Fields that cannot come from the mandate

Proven by `REQUIRED_EXTERNAL_RESOLUTION` in the harness — the projection throws `unresolved_external_field:<name>` if any is absent:

`holderAccountId`, `delegatedAgentAccountId`, `spenderAccountId`, `receiverAccountId`, `providerPolicyId`

All five **must** come from trusted server state. None may be request-controlled: `receiverAccountId` decides who receives the booking, and `providerPolicyId` decides which policy version counts.

### UNIT-1 is the dangerous one

`expiresAt` is uint64 seconds (compared against `nowUnixSeconds`). `expiresAtMs` is compared against `Date.now()`. The harness proves both directions:

- seconds → ms slot: timestamp resolves to 1970, delegation reads as long expired. **Fails closed, but silently** — indistinguishable from a legitimately expired mandate.
- ms → seconds slot: a mandate would validate ~1000× beyond its intended expiry. **Fails open.**

There is no adapter today, because nothing consumes the mandate downstream.

## Boundary 2 — World

World's contract is requester verification only, and the code is correct about that: `verifyWorldAgentRequest` returns a `human-backed-agent` signal and `toWorldPublicTrustSummary` strips raw human identity.

The problem is the **input**, not the output:

```
authorizeWorldRecoveryWrite({ grant: ApprovalGrantClaims, previewAction, previewSerial, ... })
```

It requires `grant.kind === "booked-rights-approval-grant"`, `grant.action`, `grant.serial`, `grant.actor`, `grant.delegatedAgentAddress`. A `RecoveryMandate` satisfies none of these. The harness passes a mandate and asserts it is **not** accepted — confirming two carriers rather than one.

### Three disagreeing action vocabularies

| Lane | Type | Recovery value |
| --- | --- | --- |
| Ledger | `allowedAction: string` | `"RECOVER"` (unconstrained) |
| World | `BookingPortAction` | `"create_listing"` / `"cancel_release"` |
| Hedera | `BookingRightDelegationAction` | `"RECOVER"` |

No shared name for the same action. Ledger's field is a free string, so nothing rejects a typo at signing time.

### Agent identity is three different things

`mandate.agentId` (opaque) ≠ `grant.delegatedAgentAddress` (EVM `0x…40`) ≠ `delegation.delegatedAgentAccountId` (`0.0.x`). Binding "the exact delegated agent" across the chain requires a resolver that does not exist.

## Boundary 3 — Hedera

`preparePolicyAuthorizedUsdcRecovery(delegation, invocation, nonceStore?, now?)` is the correct shape and is properly defensive: payer, serial, receiver, token, amount and recipient are all derived from resolved state, never from caller params; policy runs in `context.hooks` before bytes exist; returned bytes are re-decoded and re-validated.

**It has no route consumer.** Only scripts and this harness call it.

## Wiring reality

| Route | Authority carrier | Settlement mechanism |
| --- | --- | --- |
| `/api/ledger/recovery-mandate/{prepare,activate}` | `RecoveryMandate` | **none — dead end** |
| `/api/agent/confirm` | `ApprovalGrantClaims` + World gate | `BookingPort` |
| `/api/recovery/confirm` | `mintApprovalGrant` | `createScheduledRecoveryPayment` (**a third path**) |
| *(none)* | `BookingRightDelegation` | `preparePolicyAuthorizedUsdcRecovery` |

The Ledger mandate terminates in Redis. The Hedera recovery primitive is unreachable from HTTP. The only live product path uses the legacy grant and a scheduled payment, which is **not** the atomic NFT+USDC recovery the Golden journey describes.

## What the harness proves today

```
STEP 1  Ledger mandate verified + replay-consumed once
STEP 2  projected mandate -> delegation (5 fields need external resolution)
STEP 3a 32 USDC -> BLOCK/BELOW_MINIMUM_RECOVERY, bytes=false
STEP 3b 45 USDC -> ALLOW, settles 45000000 to 0.0.1001
STEP 4  RETURN_BYTES decode to exactly one booking move + one USDC settlement, unsigned/unsubmitted
STEP 5  World gate correctly refuses a RecoveryMandate as a grant (duplicate authority confirmed)
```

The Ledger → Hedera half composes **once the five external fields are resolved and the unit/type adapters are written**. The World half does not compose at all while `ApprovalGrantClaims` remains the carrier.
