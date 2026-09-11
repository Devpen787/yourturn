# Mode-Specific Preflight — handoff (PR #42)

Two standalone files added to the readiness lane. `scripts/ethglobal-preflight.mjs` and `scripts/submission-readiness.mjs` are **present and unchanged** (verified). No audit ancestor tree is imported.

Base: `ops/ethonline-submission-readiness@70d060681a70`.

Self-contained: the checker and its tests need no sponsor libraries and run on this branch as-is.

## PR #42 findings addressed

**1. `world-signed-route` was too coarse — split into three modes.**

| Mode | Scope |
| --- | --- |
| `world-server` | `BOOKED_RIGHTS_APPROVAL_SECRET`, the gate in `app/api/agent/confirm/route.ts`. Notes that it composes with `stateful-app`. |
| `world-target-state` | `WORLD_RECOVERY_PROOF_SERIAL` (reported `MISSING_OR_FLAG` because `--serial` may supply it), actor restricted to guestA/guestB, `YOURTURN_BASE_URL`, and the fail-closed `WORLD_RECOVERY_PROOF_ALLOW_REMOTE` acknowledgement. |
| `world-signer` | `WORLD_AGENT_PRIVATE_KEY` plus `BOOKED_RIGHTS_APPROVAL_ADMIN_SECRET` **or** `BOOKED_RIGHTS_APPROVAL_SECRET` (reported `OK_VIA_ALTERNATIVE`). |

The runner's **non-secret target-state preflight before key loading** is preserved and documented as a note on `world-target-state`; the checker itself performs no network call and reads no key.

**2. `hedera-testnet-recovery` now matches the live runner.**

- Added `HEDERA_GUEST_A_KEY` and `HEDERA_TREASURY_KEY` as required — `signerMaterialFor()` resolves both roles.
- Added role relations enforced before any network call:
  - `holder-spender-distinct` → `usdc_recovery_holder_spender_must_differ`
  - `roles-within-keyed-accounts` → `usdc_recovery_live_role_outside_existing_keyed_accounts`
- Defaults aligned to the runner's own constants (guest-A `0.0.8504405`, treasury `0.0.8504300`, guest-B `0.0.8504715`, token `0.0.8505698`), so the positive test uses roles the runner accepts. The previous positive case (holder `0.0.5003` / spender `0.0.5004`) is now an explicit **negative**.
- `HEDERA_NETWORK` absent does not block (the runner defaults to testnet); `mainnet` blocks.
- The live runner is **never invoked** — it has network effects. Parity is asserted against its documented rejection conditions.

**3. Supplied-but-invalid optional inputs now block.**

`blockingWhenInvalid` distinguishes *optional-absent* (fine) from *optional-supplied-but-invalid* (blocks), applied only to inputs that mode's command actually consumes. A malformed `WORLD_AGENT_ADDRESS` now blocks, matching the runner's `getAddress`; an absent one does not, matching its default.

**4. `ledger-device-ceremony` renamed `ledger-helper-config`.**

Narrowed to helper configuration. It reports `NOT_CHECKED` for USB/HID transport, device unlock, app selection and server-side prepare/activate readiness, and states that the separate dependency/device hold in #16 / PR #42 remains in force and is not overridden.

**Boundary wording:** the checker reports `CONFIGURATION_READY` / `NOT_READY` only. JSON output carries `executionReady: null`, which is never asserted.

## Results

`node scripts/preflight/mode-preflight.test.mjs` → **exit 0, 30 assertions PASS**, including both no-value-disclosure checks (JSON and text) and the unknown-mode exit code.

```
node scripts/preflight/mode-preflight.mjs
node scripts/preflight/mode-preflight.mjs --mode=world-signer
node scripts/preflight/mode-preflight.mjs --json
node scripts/preflight/mode-preflight.test.mjs
```

## Safety properties

Offline and non-mutating: no network call, no device open, no live-runner invocation, **no `.env` file read** — `process.env` only. All test values are synthetic and the checker is always spawned with an explicitly constructed environment. Output carries variable names and status only; a test asserts no synthetic value appears in either output format.

## Security status as currently recorded (no disposition changed here)

SEC-LEDGER-005, SEC-LEDGER-006 and SEC-WORLD-005 are recorded **closed**. A separate precautionary **signing/dependency HOLD** from the current #16 triage and PR #42 remains in force; `ledger-helper-config` states this explicitly and does not override it.

## Consumption

Readiness worker: adopt alongside the existing manifest gate. Suggested wiring is a non-blocking informational step per mode; `CONFIGURATION_READY` must not be reported as execution readiness.
