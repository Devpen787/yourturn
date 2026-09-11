# Final Integration Order

Evidence class: **AUDIT / CI-LOCAL**. Rehearsed on `audit/integration-rehearsal-0911`; nothing merged into any owned branch.

## Rehearsed result

Merging into held `feature/ethonline-integration@1bf50c0`:

| Step | Branch | Result |
| --- | --- | --- |
| 1 | `feature/ethonline-hedera@40890aa` | **CLEAN** |
| 2 | `feature/ethonline-world@2ab04f4` | 3 conflicts — `package.json`, `ethonline-ci.yml`, `progress.md`, all pure append-at-same-anchor |
| 3 | `feature/ethonline-ledger@dfb3fec` | 2 conflicts — `ethonline-ci.yml`, `progress.md`, same class |

After union resolution: `tsc --noEmit` **exit 0**, `next build` **exit 0**, and all sponsor contract checks pass —
`hedera:agent-check`, `hedera:nft-delegation-proof`, `hedera:delegated-recovery-hak-check`, `hedera:booking-policy-check`, `hedera:usdc-recovery-check`, `world:contract-check`, `world:recovery-write-check`, `ledger:mandate-check` — all exit 0.

**No type-level incompatibility blocks the merge.** The blockers are semantic, not mechanical.

## Recommended sequence with dependency reasons

**A. Hedera → integration first.**
INT currently holds `delegated-recovery-plugin.ts@8b43f7c`, which predates `YOURTURN_DELEGATED_RECOVERY_SETTLE_USDC_TOOL`. Every downstream type (`SettledTransferParams`, `BookingRightDelegation.minimumRecovery`, `PolicyAuthorizedUsdcRecoveryResult`) is defined here. Nothing else can be typed against the real recovery primitive until this lands. Merges clean — do it first and get the false economy of "Hedera is already integrated" off the board.

**B. Ledger → integration second, before World.**
`RecoveryMandate` must become the single authority carrier, and B is what defines it. Landing World first would cement `ApprovalGrantClaims` as the carrier and force a second rewrite of `recovery-write-gate.ts`. Only append-conflicts.

**C. The canonical mandate projection adapter — after A and B, before C'.**
Requires types from both A (`BookingRightDelegation`) and B (`RecoveryMandate`). Must carry the unit/type conversions in `AUTHORITY-CHAIN-MAP.md` and resolve the five external fields from trusted server state. `scripts/integration-rehearsal/authority-chain-contract.mjs` is a working reference implementation.

**D. World → integration last of the three.**
`authorizeWorldRecoveryWrite` must be re-pointed from `ApprovalGrantClaims` to the projected mandate. That signature change is only expressible once A+B+C exist. Landing World earlier means doing this work twice.

**E. Retire `ApprovalGrantClaims` as authority.**
Once D consumes the mandate, the grant may remain a preview/session artifact but must stop being an authority carrier — it is HMAC-signed with a hardcoded fallback secret and its `actor` is a demo persona (`guestA`/`guestB`/`issuer`).

**F. Product Workbench last.**
PWB@`b99f1134` conflicts with INT only on product-preview UI and workbench docs. It is a presentation contract; it must be reconciled against real API shapes **after** C/D exist, or the UI will be re-fitted twice. XC-01 is still `REVISE` and must not redefine sponsor semantics.

**G. Submission readiness (`ops/…@970f3bb`) observes; it never leads.** It mirrors INT+PWB and should be re-synced after F.

Not in scope for this ordering: World Sandbox proof branch (`cc0ffe57`), which carries **SEC-WORLD-005 MEDIUM/OPEN** and must close on its own track before it can qualify anything.

## What could still break the demo with all three lanes green

1. **Replay/nonce state survives `reset-demo`.** `reset-demo` clears `clearAllListings`, `clearAutomationProofs`, `clearRecoveryReceipts` only. It does **not** clear `bookedrights:ledger:mandate-{prepared,active,consumed}:*`, `ethonline:hedera:booking-right:*`, or `bookedrights:world-agentkit:nonce`. Re-running a rehearsed demo with the same `mandateId`/`nonce` hits one-shot replay rejection and the recovery fails on stage while every check is green. **Highest-probability demo-day failure.**
2. **Two authority objects still live.** If `/api/agent/confirm` (grant) and the mandate path are both reachable, the same booking can be moved through a path the holder never signed.
3. **Three settlement mechanisms.** Delegated atomic NFT+USDC (Hedera), `createScheduledRecoveryPayment` (legacy `/api/recovery/confirm`), and `BookingPort` state changes. Only the first matches Golden.
4. **Seconds/milliseconds expiry.** Silent fail-closed in one direction, fail-open in the other.
5. **Persona/serial mismatch.** `BookingActorRef` is `guestA|guestB|issuer` while the Golden journey is Maya/Bob/Studio A. A wrong persona→account mapping sends the 45 USDC or the booking to the wrong account.
6. **No LIVE USDC settlement exists.** All three `ethonline-hedera-usdc-recovery-live` runs failed at liquidity preflight (`34475817628`, `34475770954`, `34475363423`). A demo that claims settlement needs either funded testnet USDC or honest FIXTURE labelling.
7. **UI/API shape drift.** The Golden UI expects a completion carrying recovered amount and a holder transition. No endpoint returns that shape today.

## Smallest adapters proposed (for the owning workers, not implemented here)

| Adapter | Owner | Shape |
| --- | --- | --- |
| `projectMandateToDelegation()` | Integrator | mandate + resolved server state → `BookingRightDelegation`; seconds→ms, bigint→number/string, string→enum[], string→tagged union |
| Add `providerPolicyId` (+ version) to the signed mandate | Ledger | new EIP-712 field; without it the holder never signs which policy version applies |
| Constrain `allowedAction` to a shared enum | Ledger + Hedera | replace free string with `"DELEGATE"\|"REVOKE"\|"RECOVER"` |
| Re-point `authorizeWorldRecoveryWrite` to the mandate | World | replace `grant: ApprovalGrantClaims` with the projected mandate; keep verification output unchanged |
| Agent identity resolver | Integrator | `mandate.agentId` → EVM address (World) → `0.0.x` (Hedera), server-side only |
| Route for the recovery primitive | Integrator | expose `preparePolicyAuthorizedUsdcRecovery` behind the mandate + World gate |
| Extend `reset-demo` | Integrator | clear the three replay/nonce namespaces |

None of these should be implemented by redesigning sponsor semantics to make types line up.
