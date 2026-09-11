# Golden YT-05→YT-08 → Runtime Gap

Golden frozen executable: `d5309a96d532ee107011c2a5cefc3000b9e4932f` (product truth, fixture-backed).
Runtime surfaces below are from the rehearsal merge (INT + HED + WLD + LDG).

Evidence class: **AUDIT / CI-LOCAL**. No fixture state is promoted to LIVE here.

| Golden state | Real function / endpoint that should back it | Exists? | What still has to be replaced |
| --- | --- | --- | --- |
| **Ledger waiting** | `POST /api/ledger/recovery-mandate/prepare` → `storePreparedRecoveryMandate` | **Yes** | UI still fixture. Route exists and returns a prepared mandate; no client consumes it. Device ceremony is out of scope (no hardware). |
| **Ledger approved** | `POST /api/ledger/recovery-mandate/activate` → `activatePreparedRecoveryMandate` → `bookedrights:ledger:mandate-active:<id>` | **Yes** | Activation succeeds and writes active authority — but **nothing downstream reads it**. `ledger:mandate-check` self-reports `"downstreamRecoveryExecution": false`. |
| **Ledger rejected** | device-rejected terminal; `activate` never called | Partial | No route models "rejected" as a distinct server state; it is the absence of activation. UI must not infer rejection from a timeout. |
| **Ledger cancelled** | device-cancelled terminal; `activate` never called | Partial | Same as rejected — cancel and reject are indistinguishable server-side today. Golden requires them to be distinguishable. |
| **Recovery active** | `loadActiveRecoveryMandate` + World exact-agent verification | **Split** | Mandate state exists; World verification is bound to `ApprovalGrantClaims`, not to the mandate. The combined "active + verified agent" object does not exist. |
| **World requester verified** | `verifyWorldAgentRequest` → `toWorldPublicTrustSummary` (`signal: "human-backed-agent"`, no raw human id) | **Yes** | Correct and privacy-safe. Must be re-pointed from `ApprovalGrantClaims` to the mandate. Sandbox proof outstanding; **SEC-WORLD-005 MEDIUM/OPEN** against the Sandbox local-only guard. |
| **32 USDC blocked** | `preparePolicyAuthorizedUsdcRecovery` → `BLOCK` / `BELOW_MINIMUM_RECOVERY`, zero bytes | **Yes — proven** | Function is correct (harness STEP 3a). **No route exposes it**, so the UI cannot reach this decision. |
| **45 USDC allowed** | same → `ALLOW` + `DelegatedRecoverySigningEnvelope` | **Yes — proven** | Correct (harness STEP 3b). No route. No signer/submitter. |
| **Settlement pending** | external signer consumes `bytesBase64`, submits, waits for receipt/mirror | **No** | `signed:false, submitted:false`. Nothing converts approved bytes into a submitted transaction inside the product. `hedera-return-bytes-external-signer.mjs` is a script, out-of-band. |
| **Recovery success** (`You recovered 45 USDC`, Maya loses booking) | settled tx + refreshed holder/booking read model | **No** | No reconciliation path. Golden requires Maya's booking to become unusable and Bob's to become `Confirmed`; only `BookingPort` (legacy) can currently change booking state, and it is not driven by the recovery decision. |
| **Proof / receipt** | `lib/store/recovery-receipts.ts`, `lib/proof/recorded-recovery-receipts.ts`, `lib/types/recovery-proof.ts` | **Partial** | Receipt store exists and is wired to `/api/recovery/confirm` (the **legacy scheduled-payment** path), not to the delegated USDC recovery. Labels must stay FIXTURE/CI until a real receipt exists. |

## Summary of what is genuinely missing

1. **No HTTP surface for the Hedera recovery primitive.** `preparePolicyAuthorizedUsdcRecovery` is unreachable from the product.
2. **No consumer of the activated Ledger mandate.** It terminates in Redis.
3. **No signing/submission/reconciliation stage.** Approved bytes never become a settled transaction in-product.
4. **Reject vs cancel are not distinguishable** server-side, though Golden YT-05 freezes them as distinct states.
5. **The only working end-to-end path is the legacy one** (`/api/recovery/confirm` → `mintApprovalGrant` → `createScheduledRecoveryPayment`), which is a different settlement mechanism from the Golden journey.

## Non-gaps worth recording

- 32-blocked and 45-allowed **policy semantics are already correct and proven** at CI/LOCAL — they need exposure, not redesign.
- World's privacy boundary is already correct: no raw human identifier crosses `toWorldPublicTrustSummary`.
- The exact-scope byte validator already rejects widened movement (harness STEP 4: exactly one NFT + one token transfer, zero HBAR).
