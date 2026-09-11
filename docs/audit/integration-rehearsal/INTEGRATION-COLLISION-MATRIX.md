# Integration Collision Matrix

Evidence class: **AUDIT / CI-LOCAL**. Nothing here is LIVE, TESTNET or SETTLED.
Produced on an isolated `audit/integration-rehearsal-0911` worktree. Nothing merged or pushed to any owned branch.

## Exact heads snapshotted 2026-09-11T00:22Z

| Lane | Branch | Head |
| --- | --- | --- |
| Integration (held) | `feature/ethonline-integration` | `1bf50c02dd3d` |
| Hedera | `feature/ethonline-hedera` | `40890aab7729` |
| World core | `feature/ethonline-world` | `2ab04f4420cc` |
| World Sandbox proof | `feature/ethonline-world-sandbox-proof` | `cc0ffe578286` |
| Ledger | `feature/ethonline-ledger` | `dfb3fec6328c` |
| Product Workbench | `ux/yourturn-product-workbench` | `b99f11341620` |
| Submission readiness | `ops/ethonline-submission-readiness` | `970f3bb43695` |
| Foundation (shared base) | `feature/ethonline-2026-foundation` | `89ded956e67c` |

All lanes descend from foundation `89ded956`. No cross-lane rebase divergence.

## Structural finding — the held integration branch is Hedera-only and stale

`feature/ethonline-integration@1bf50c0` contains 27 commits: **Hedera work through `7525ba6` plus a Golden YT-01→04 product freeze.**

- `lib/world-agentkit/**` — **ABSENT**
- `lib/ledger/**`, `app/api/ledger/**` — **ABSENT**
- `lib/hedera-agent-kit/delegated-recovery-plugin.ts` — blob `8b43f7c`, i.e. **before** the USDC settle tool (`cf7072e` on Hedera head)

The integration branch predates the entire USDC settlement capability and has never seen World or Ledger.

## Content disagreement (co-touched AND differing)

28 co-touched files already agree byte-for-byte. 13 disagree:

| File | Divergence | Severity |
| --- | --- | --- |
| `package.json` | 6 distinct versions (HED/INT/LDG/RDY/WLD/WSB) | **Low** — additive only (see below) |
| `.github/workflows/ethonline-ci.yml` | 5 distinct versions | **Low** — additive only, no step removed |
| `lib/hedera-agent-kit/delegated-recovery-plugin.ts` | INT `8b43f7c` vs HED `cf7072e` | **Medium** — INT is stale |
| `app/product-preview/page.tsx`, `components/SiteHeader.tsx`, `scripts/product-workbench-visual-check.mjs`, `.github/workflows/product-workbench-visual.yml` | INT+RDY vs PWB | **Medium** — INT carries pre-XC-01 product |
| `docs/product-workbench/{README,handoff,journeys}.md` | INT+RDY vs PWB | Low |
| `docs/ethonline-2026/progress.md` | 3 versions | Low — append conflict |
| `package-lock.json` | WLD vs WSB | Low — WSB adds `@worldcoin/idkit` |
| `.env.example` | LDG vs WSB | Low — disjoint keys |

### Dependency collisions — none

Only two additions exist across all lanes, and they do not conflict:

- `@worldcoin/agentkit@0.2.1` — added identically by WLD and WSB
- `@worldcoin/idkit@4.2.3` — added by WSB only

No version disagreement, no removals, **no npm script key collisions** (every script name is unique per lane).

### Workflow collisions — additive only

`ethonline-ci.yml` foundation has 6 steps. INT +2, HED +3, WLD +3, WSB +5, LDG +3. **No lane removes a foundation step.** Duplicate step names occur only within parent/child pairs (INT⊂HED, WLD⊂WSB) and collapse naturally. Union merge yields 15 steps.

## Duplicate sources of authority — the material collision

Three separate authority carriers exist simultaneously:

| Carrier | Defined in | Consumed by | Identity domain |
| --- | --- | --- | --- |
| `ApprovalGrantClaims` | `lib/server/approval-grants.ts` (foundation, present in INT) | `/api/agent/confirm`, `/api/recovery/confirm`, `authorizeWorldRecoveryWrite` | `BookingActorRef` demo persona + EVM address |
| `RecoveryMandate` | `lib/ledger/recovery-mandate.ts` (LDG) | `/api/ledger/recovery-mandate/{prepare,activate}` only | opaque `ownerId` / `agentId` |
| `BookingRightDelegation` | `lib/hedera-agent-kit/booking-right-delegation-policy.ts` (HED) | `preparePolicyAuthorizedUsdcRecovery` — **no route consumer** | Hedera `0.0.x` accounts |

`recovery-write-gate.ts` states it directly: *"The existing server-signed, exact-scoped ApprovalGrant is the branch's current YourTurn mandate carrier."* That is the parallel authority the final architecture forbids.

`ApprovalGrantClaims` is HMAC-signed by `approvalSecret()`, which falls back through `BOOKED_RIGHTS_PREVIEW_SECRET` → `HEDERA_OPERATOR_KEY` → a hardcoded literal default.

World already mitigates this for its own surface: `/api/agent/confirm` refuses a World-protected recovery action unless `BOOKED_RIGHTS_APPROVAL_SECRET` is explicitly configured. The fallback therefore still applies to every *other* grant consumer, including `/api/recovery/confirm`. The carrier is acceptable as a preview/session artifact; it should not be the final authority object.

## Storage-key collisions

No key *collisions* — namespaces are disjoint:

- `bookedrights:ledger:mandate-{prepared,active}:<mandateId>`, `bookedrights:ledger:mandate-consumed:<digest>`
- `ethonline:hedera:booking-right:<delegationId>:<action>:<nonce>`
- `bookedrights:world-agentkit:nonce`
- `bookedrights:{slots,listings,init}`

The risk is the opposite of collision — see `FINAL-INTEGRATION-ORDER.md` §Demo-day: **none of the replay/nonce/mandate namespaces are cleared by `reset-demo`.**

## Evidence-label conflicts

None found. Every lane self-labels conservatively: Ledger `CI_CONFIGURED` with `"downstreamRecoveryExecution": false`; Hedera `signed:false, submitted:false`; World separates AgentBook LIVE from the CI/READY signed harness.


## Late-breaking collision (appeared during this rehearsal)

`feature/ethonline-ledger` advanced `dfb3fec6328c` → `3c5da4ea26b3` at 2026-09-11T02:34 with the SEC-LEDGER-005 serialization repair.

`lib/ledger/recovery-mandate.ts` is **byte-identical** at both heads (`0fc6b3ee`), so every field-level finding in `AUTHORITY-CHAIN-MAP.md` is unaffected.

But `1c763ce fix(ledger): serialize agent booking mutations` edits **`app/api/agent/confirm/route.ts`** — World's route. `git merge-tree` against the rehearsal tree now reports a genuine **content conflict** there, not an append conflict:

- **World** wraps the route's `bookingPort.confirm*` call sites with `authorizeWorldRecoveryWrite` (requester gate) and refuses protected recovery without an explicit approval secret.
- **Ledger** wraps the *same* call sites with `withRecoveryMandateAuthorityMutation` (serialized authority boundary).

Both wrap the identical statements, so no union resolution is safe. They must compose in a defined order: World verification gates **before** the mutation; the Ledger serialization boundary wraps **the mutation itself**. Resolving this by taking one side drops either requester verification or the SEC-LEDGER-005 race fix.

This is also a lane-boundary event: Ledger is now editing a route that World owns.
