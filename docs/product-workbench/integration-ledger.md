# Golden-to-Integration Acceptance Ledger

Status: **required integration contract for Golden YT-05→YT-08**.

This ledger prevents the approved `/product-preview` fixture transitions from becoming accidental production truth. Golden defines the customer behavior/presentation. The sponsor workstreams own real implementation/evidence. Integration is complete only when the real owner replaces each fixture without silently changing the Golden contract.

Frozen UX executable: `d5309a96d532ee107011c2a5cefc3000b9e4932f`.

## Evidence anchors inspected for this ledger

### Ledger
Current branch anchor inspected: `feature/ethonline-ledger@dfb3fec6328c5db22aa6b6eb222b5e0a57f3b54a`.

Concrete interfaces present:
- `POST /api/ledger/recovery-mandate/prepare`;
- `POST /api/ledger/recovery-mandate/activate`;
- `buildRecoveryMandateTypedData(...)`;
- `storePreparedRecoveryMandate(...)` / `activatePreparedRecoveryMandate(...)` / `loadActiveRecoveryMandate(...)`;
- live-booking guard through `assertRecoveryMandateLiveBookingState(...)`.

Current runtime evidence class from `scripts/ledger-recovery-mandate-runtime-check.mjs`: **CI_CONFIGURED**. It proves one-shot/server-enrolled signer/replay/live-booking-state guard properties. Its own claim boundary states that it does **not** prove Ledger hardware provenance and does **not** prove the active mandate is already consumed by Hedera recovery execution.

Important integration rule: Ledger authorizes the off-chain Recovery Mandate. It must never be presented as signing Hedera HTS recovery transactions.

### World
Current branch anchor inspected: `feature/ethonline-world@2ab04f4420cccc2c090cd5f5634e447d399eb139`.

Concrete signed-route evidence in `scripts/world-recovery-live-proof.mjs`:
- `POST /api/agent/confirm` with an official AgentKit-signed request;
- public result `worldTrust.signal === "human-backed-agent"`;
- exact registered delegated-agent check;
- privacy-minimized output with `humanIdExposed: false`.

The current proof is **LIVE/SIGNED-ROUTE** for the bounded `create_listing` write path. Its own claim boundary does not prove World grants booking ownership/provider entitlement. It also currently obtains a legacy approval grant before confirm, so the Integrator must bind the World trust result to the Recovery-Mandate recovery path without routing Ledger authority through the legacy reusable approval-grant model.

### Hedera
Current branch anchor inspected: `feature/ethonline-hedera@40890aab7729075edbf5efac5f5367f4b5a022e1`.

Concrete recovery interfaces:
- `BookingRightDelegationPolicy`;
- `preparePolicyAuthorizedUsdcRecovery(...)`;
- HAK tool `yourturn_delegated_recovery_settle_nft_usdc`;
- `createDelegatedRecoveryReturnBytesRuntime(...)` in `AgentMode.RETURN_BYTES`;
- one `TransferTransaction` containing the delegated booking-right movement and exact HTS USDC settlement.

Current policy/transaction evidence class from `scripts/hedera-policy-usdc-recovery-check.mjs`: **CI/LOCAL** on testnet semantics. It proves policy binding, below-minimum/provider-policy blocking, malformed/wrong-scope rejection, replay controls, exact one-booking + one-USDC movement, and unsigned `RETURN_BYTES`. The signing envelope is explicitly `signed: false`, `submitted: false`; do not call this LIVE settlement until an execution/receipt path proves it.

## Integration ledger

| Journey / state or action | Golden customer behavior | UI owner | Real backend / sponsor owner | Current source | Real interface replacing fixture | Acceptance / evidence required | Failure / rollback behavior |
| --- | --- | --- | --- | --- | --- | --- | --- |
| YT-04→05 `Continue to secure approval` | Customer leaves scoped recovery setup and reaches the formal mandate authorization boundary without changing authority yet. | Product Workbench / integrated customer route | Ledger application seam | **FIXTURE** in Golden UX | `POST /api/ledger/recovery-mandate/prepare` using authenticated owner/session + server-enrolled expected signer | Prepared mandate matches Friday Yoga, 40 USDC, expiry, no-cancel, exact delegated agent; no active authority before valid activation; request cannot override signer | Preparation error leaves no authority; show retry/back without implying authorization. |
| YT-05 Ledger not ready | Customer understands a Ledger/device/session prerequisite is missing and recovery has not started. | Customer authorization state | Ledger | **FIXTURE** UI; sponsor branch has **CI_CONFIGURED** runtime guards | Prepare/device-connection readiness result feeding customer state | Real missing/not-ready condition reproduced; no signature/active mandate; clear retry path; no Hedera action produced | Stay not authorized. Retry must create/refresh a valid prepare state, not fake approval. |
| YT-05 waiting for Ledger | Customer sees that the exact Recovery Mandate is awaiting a device decision. | Customer authorization state | Ledger DMK/device ceremony | **FIXTURE** UI; hardware proof not established by current runtime check | DMK/EIP-712 signing ceremony for prepared mandate, then `activate` only after valid completion/signature | Same typed mandate shown/signed; pending state cannot become approved without valid signature + activation; timeout/cancel/reject are distinguishable | Timeout returns to a safe retry state. No authority, World recovery write, or Hedera recovery action until activation succeeds. |
| YT-05 initial approve | Customer sees mandate approved and recovery can start under the exact 40-USDC rules. | Customer authorization state | Ledger | **FIXTURE** UI; Ledger state machinery **CI_CONFIGURED** | `POST /api/ledger/recovery-mandate/activate` → durable active Recovery Mandate | Valid device signature for prepared mandate; authenticated owner; one-shot replay guard; live holder/status/provider-policy/listing revalidation; active state preserves agent/serial/minimum/asset/expiry/no-cancel | Any invalid/stale/replayed activation fails closed and creates no active authority. If one-shot signature is consumed on final-boundary stale failure, require a new ceremony rather than unsafe retry. |
| YT-05 initial reject | UI says recovery was not authorized; no authority exists. | Customer authorization state | Ledger | **FIXTURE** | Device rejected terminal result; do not call/complete activation | Evidence shows reject has no signature/active mandate and no downstream recovery execution | Remain no-authority; allow deliberate retry from prepare. |
| YT-05 initial cancel | UI says authorization was cancelled; no mandate was created. | Customer authorization state | Ledger | **FIXTURE** | Device cancelled terminal result; do not activate | Evidence shows cancel is distinct from approve and persists no active authority | Remain no-authority; return to booking or retry without implying any mandate exists. |
| YT-06 `Recovery active` | Customer sees 40 USDC minimum, Tomorrow 17:00 expiry, Friday-Yoga-only scope, no cancel/widen, and exact human-backed delegated agent. | Customer recovery state | Ledger active mandate + World exact-agent verification | **FIXTURE** combined state | `loadActiveRecoveryMandate(...)` + World verification bound to the recovery requester/action | Active mandate fields equal Golden; World signal is `human-backed-agent`; requesting agent is exact delegated one; **no raw human id** exposed; expired/revoked/missing mandate cannot render active | If either mandate or exact-agent verification fails, do not show active/verified. Move to safe blocked/needs-attention state; no recovery write. |
| YT-06 exact delegated agent verification | UI says `Exact delegated agent verified` and `Human-backed` without identifying the human. | Agent trust presentation | World | **FIXTURE** UI; bounded `create_listing` proof is **LIVE/SIGNED-ROUTE** | AgentKit-signed request + AgentBook/exact-agent resolution integrated into the actual Recovery-Mandate execution path | Current `human-backed-agent` signal preserved; exact delegated-agent match; privacy-safe error/output; proof bound to the recovery resource, not merely a separate listing demo | Verification mismatch/failure blocks execution and remains privacy-safe; never log/display raw World human identifier. |
| YT-06 `Stop recovery` | Customer can stop further autonomous recovery. | Customer recovery action | Ledger mandate state + Hedera delegated authority/revocation integration | **FIXTURE** in Golden UX unless real stop wiring proves otherwise | Revoke/deactivate active Recovery Mandate and, where actual Hedera serial allowance exists, use the serial-scoped revocation path | After stop, future recovery attempts fail; no stale active UI; any Hedera authority created for the booking is actually revoked and independently verified before claiming completion | Pending revocation must not display `stopped` as final. On partial failure, show safe `stopping/needs attention`; do not silently leave autonomous authority active. |
| YT-07 32 USDC offer evaluated | Customer is not interrupted; offer is blocked below active 40-USDC minimum. | Recovery decision presentation | Hedera policy runtime consuming valid mandate + provider policy | **FIXTURE** UI; Hedera policy semantics **CI/LOCAL** | `preparePolicyAuthorizedUsdcRecovery(...)` with 32-USDC invocation against active mandate/provider rule | Decision outcome `BLOCK` / below-minimum reason; zero transaction bytes; no nonce reservation where designed; exact active minimum = 40 | Remain Recovery active. No booking transfer, no settlement, no owner prompt merely for an obviously out-of-scope offer. |
| YT-07 blocked consequence | UI states `No booking transfer. No settlement.` | Customer offer state | Hedera / integrated booking+settlement layer | **FIXTURE** | Absence of prepared/submitted recovery transaction + unchanged authoritative booking/payment state | Verify holder unchanged, no settlement receipt/movement, no successful transfer proof for blocked invocation | If execution state is uncertain, show checking/unknown rather than asserting no movement until authoritative reads reconcile. |
| YT-07 `Lower my minimum` | Customer may propose 30 USDC, but current 40-USDC authority remains active until a new mandate is approved. | Customer replacement-authority flow | Ledger | **FIXTURE** | New `prepare` call for replacement Recovery Mandate while old active mandate remains authoritative | Proposed vs active mandate IDs/values are distinct; current 40 remains effective throughout preparation/waiting; no silent in-place mutation | Preparation/timeout/reject/cancel leaves 40-USDC recovery unchanged and active. |
| YT-07 replacement waiting | UI explicitly distinguishes proposed 30 USDC from active 40 USDC. | Customer authorization state | Ledger | **FIXTURE** | New device ceremony for the replacement mandate | Pending replacement does not change active mandate; exact old/new values visible to integration state model | Timeout/error keeps old authority active; offer clear retry or return-to-active path. |
| YT-07 replacement reject | UI says proposed 30 USDC was rejected and existing 40-USDC mandate remains active/unchanged; can return to active recovery. | Customer authorization state | Ledger | **FIXTURE** | Replacement device reject terminal; no successful activation of replacement | Real state read confirms 40-USDC mandate still active, same expiry/scope/no-cancel; no 30-USDC active mandate | Return to active 40-USDC recovery. Retry creates another explicit replacement attempt. |
| YT-07 replacement cancel | UI says proposed 30 USDC was cancelled and existing 40-USDC mandate remains active/unchanged. | Customer authorization state | Ledger | **FIXTURE** | Replacement device cancel terminal; no replacement activation | Same acceptance as replacement reject; cancel cannot delete or mutate existing authority | Return to active 40-USDC recovery. |
| YT-07 replacement approve | Only after fresh authorization may 30 USDC become the active minimum. | Customer authorization state | Ledger | **FIXTURE** | Activate newly signed replacement mandate, with explicit replacement semantics implemented by the integration owner | New active mandate is durable and old authority is superseded/revoked according to real runtime contract; no interval with ambiguous dual authority; all live booking/provider predicates still valid | If replacement activation fails, preserve/restore the real prior authority according to runtime semantics and show truthful state; never assume 30 is active. |
| YT-08 45 USDC offer evaluated | UI says 45 USDC is inside the active 40-USDC scope and no new owner prompt is needed. | Recovery decision state | Hedera policy runtime + active Ledger mandate + World exact-agent gate | **FIXTURE** combined state | Validate World requester/exact agent; load active mandate; invoke `preparePolicyAuthorizedUsdcRecovery(...)` with provider policy + 45 USDC | All three permission dimensions pass; decision `ALLOW`; exact booking/holder/receiver/settlement/minimum/expiry/provider policy/replay predicates pass; no extra Ledger ceremony because action is already within active mandate | Any mismatch/expiry/revocation/provider denial/eligibility failure blocks or escalates according to actual reason. Do not widen authority or fall back to manual hidden bypass. |
| YT-08 prepare atomic recovery | Product can proceed toward one booking transfer + exact 45-USDC settlement. | Integration layer; proof surfaced only on demand | Hedera | **FIXTURE** UX; current HAK/policy proof **CI/LOCAL**, `signed:false`, `submitted:false` | `yourturn_delegated_recovery_settle_nft_usdc` / `preparePolicyAuthorizedUsdcRecovery(...)` in RETURN_BYTES mode | Produced bytes decode to one `TransferTransaction`: exactly one booking NFT movement + exact HTS USDC movement to current holder, no HBAR; policy quote/recipient/decimals exact; replay store succeeds | If prepare fails, no bytes/submit. If replay store unavailable, fail closed. Never show recovered/transferred from unsigned bytes alone. |
| YT-08 submit/settle | Actual network execution changes booking ownership and recovery value. | Integrated execution + customer completion state | Hedera signer/payer/submission + authoritative booking state | **NOT YET PROVEN by the current CI/LOCAL HAK evidence** | External payer/signer consumes validated RETURN_BYTES, submits to Hedera testnet, waits for receipt/mirror/state reconciliation | Signed/submitted transaction succeeds; exact booking serial holder becomes Bob/receiver; exact 45-USDC settlement reaches Maya/current holder; receipt/hash plus authoritative reads agree; provider policy was already valid | Failed/unknown receipt must not display success. Reconcile before retry to avoid duplicate settlement/transfer. Replay/idempotency must prevent double execution. |
| YT-08 `You recovered 45 USDC` | Primary completion says recovered amount; Friday Yoga is no longer usable by Maya. | Customer completion + My Bookings | Hedera authoritative transfer/settlement + booking read model | **FIXTURE** in Golden UX | Real settled transaction + refreshed booking/holder/payment state | Maya no longer has usable booking; settlement amount = 45 USDC; status is Recovered/Transferred; evidence can be opened separately | If settlement succeeded but read model is stale, show synchronizing/pending rather than contradictory ownership. If only one leg is proven, do not claim complete recovery. |
| YT-08 technical proof drawer | Reviewer/customer can inspect how the result was established without sponsor plumbing dominating the main journey. | Proof/reviewer presentation | Ledger + World + Hedera evidence adapters | **FIXTURE** labels/content in Golden until replaced | Compose real evidence refs from each owner with explicit evidence class | Proof bound to same mandate/agent/booking/recovery execution; no secrets/raw World human id; label TESTNET/LIVE/CI exactly; links/receipts resolve | Missing evidence remains explicitly unavailable/partial; never fabricate or promote FIXTURE/CI through copy. |

## Cross-cutting provider-policy acceptance

Golden YT-05→YT-08 assumes the holder cannot authorize a recovery that the provider has prohibited. Integration must make this load-bearing without adding a per-recovery provider approval popup.

Current evidence already points in this direction:
- Ledger activation re-reads booked/current provider resale policy and listing state before creating authority;
- Hedera policy invocation distinguishes provider `ALLOW`, `BLOCK`, and `REVIEW` and fails before producing transaction bytes when provider policy does not permit execution.

Before calling the hero fully integrated, prove for the same Friday Yoga fixture/state that:
1. Studio A policy exists before Maya starts recovery;
2. transfer/recovery is permitted while cancellation remains forbidden;
3. the policy version/snapshot used at authorization and the live policy checked at execution are coherent;
4. changing provider policy to prohibit recovery causes later authorization/execution to fail closed;
5. no provider staff click is required for a normal compliant recovery.

## Cross-cutting acquirer acceptance

Golden YT-08 intentionally stops at Maya's completion. The next connected product slice must establish Bob as more than a receiver account.

Before end-to-end completion is claimed:
- Bob satisfies provider eligibility/payment conditions;
- the authoritative booking holder becomes Bob;
- Bob sees Friday Yoga as a normal usable booking;
- provider fulfilment/check-in state recognizes Bob;
- Maya, Bob, and Studio A reconcile to the same booking transition.

This requirement is expanded in `stakeholder-journeys.md`, `stakeholder-coverage-gate.md`, and the selected next-slice record.

## Integration completion gate

YT-05→YT-08 may be called **Golden UX** now. It may be called **integrated product truth** only when:
- fixture transitions in the table are replaced or explicitly excluded with approved evidence boundaries;
- Ledger hardware/device authorization evidence is real for the exact Recovery Mandate path;
- World exact-agent/human-backed verification is bound to the actual recovery execution path without exposing raw human identity and without using the legacy approval-grant path as the Ledger authority model;
- Hedera ALLOW/BLOCK policy behavior is bound to the active mandate/provider rule and the accepted path is actually signed/submitted/reconciled before success UI;
- negative states fail closed and preserve truthful prior authority/ownership/payment state;
- provider, Maya and Bob ultimately agree on the same authoritative Friday Yoga holder transition.

Any real-interface mismatch that would require changing Golden UX returns to Product Workbench review; do not weaken sponsor/backend semantics and do not silently redesign the frozen journey.
