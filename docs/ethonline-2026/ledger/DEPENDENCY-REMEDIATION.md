# Ledger dependency remediation — candidate record

Base: `feature/ethonline-ledger@7ac9e8ea3ba8a51ff3ec889774fd8f8724677b4d`
Executor: local Claude Code, isolated worktree. Claim: #2 comment 5635991559.
Requirements source: #16 comment 5634906245. Prior cloud diagnostics: run `34527665459`, artifact `10172213586`.

**This is BUILD evidence. It is not Security clearance and does not close the signing/app-credential-loading hold.**

## Principles applied

- Smallest compatible changes only. **No `audit fix --force`, no SDK downgrade, no framework migration.**
- Every pinned `@ledgerhq` version is unchanged (verified byte-identical).
- Both dependency graphs made reproducible.
- Zero audit findings is **not** treated as complete security; residual applicability is recorded below.

## Change 1 — isolated Ledger helper is now reproducible

`scripts/ledger-device-proof/` had **no lockfile**, so its graph was unreproducible and it could not be installed from source. Added `package-lock.json` (lockfileVersion 3, 58 packages).

**CI must actually use it.** The workflow previously installed the helper with
`npm install --no-package-lock --legacy-peer-deps`, which bypasses the lockfile
entirely — adding a lockfile without this change would not have made the tested
installation reproducible. The step is now `npm ci --legacy-peer-deps`, run in the
helper directory against its own lockfile, so CI exercises the same resolved graph
Security reviews. The application lockfile is still untouched.

## Change 2 — helper transitive advisories, without touching any Ledger SDK

| Advisory target | Before | After | Mechanism |
| --- | --- | --- | --- |
| `ws` (HIGH, 8.0.0–8.20.1) | 8.17.1 ×2 nested under vendored `ethers` | 8.21.3, deduped to one copy | `overrides: { "ws": "8.21.3" }` |
| `uuid` (MODERATE, GHSA-w5hq-g745-h8pq) | 11.0.3 | 11.1.1 | `overrides: { "uuid": "^11.1.1" }` |

**Helper audit: 9 findings (8 moderate, 1 high) → 0.**

npm's own proposed fixes were all **major Ledger SDK downgrades** — `@ledgerhq/context-module` 2.5.0→1.0.0/1.3.1, `device-management-kit`→0.6.5, `device-signer-kit-ethereum`→1.3.3 (all `isSemVerMajor: true`). All rejected. The six `@ledgerhq/*` "vulnerabilities" were cascade entries from the single `uuid` advisory and cleared once `uuid` was patched.

## Change 3 — root graph, within-major only

| Package | Change | Advisory range |
| --- | --- | --- |
| `postcss` | direct dependency 8.4.39 → **8.5.28** | <=8.5.22 |
| `nanoid` | override `^3.3.19` | <=3.3.17 |
| `js-yaml` | override `^4.3.2` | 4.0.0–4.3.1 |
| `axios` | override `^1.20.0` | 1.0.0–1.17.0 |
| `browserslist` | override `^4.28.9` | <=4.28.6 |
| `viem` | override `^2.56.3` | via HAK/ethers chain |
| `@hashgraph/hedera-agent-kit > ws` | nested override `^8.21.3` | 8.0.0–8.20.1 |

**Root audit: 32 → 23** (high 15→10, moderate 7→3, low 8 unchanged, critical 2 unchanged).

`postcss` required a direct bump rather than an override: npm rejects `EOVERRIDE` when an override conflicts with a direct dependency.

## Residual risks — NOT fixed, with reasoning

| Residual | Why it remains | Owner |
| --- | --- | --- |
| **`next` CRITICAL** (14.2.18) | Only fix is `next@16.3.4`, a major framework migration. #16 requires Golden behaviour/presentation regression evidence for any framework change; that is a separate reviewed task, not a dependency patch. Per #16: GHSA-p293-qw3h-jr36 is Windows-hosting-specific and does not match the macOS ceremony; GHSA-3h52-269p-cp9r is a dev-server attack needing a patched framework **plus** `allowedDevOrigins` — a loopback listener alone is not clearance; GHSA-2xp9-vwfh-vxw4 (AVIF) lists fixes 15.5.24/16.3.3 and **no 14.2.x fix exists**. | Integrator + Security |
| **`postcss` HIGH (nested)** | `next` vendors its own `postcss@8.4.31` at `node_modules/next/node_modules/postcss`. Unreachable without changing Next. | Integrator + Security |
| **`protobufjs` CRITICAL** | Only npm-proposed fix is `@hashgraph/sdk@2.72.0`, a major SDK change owned by the Hedera lane. #16 explicitly requires cross-lane coordination rather than unilateral upgrades. Per #16, GHSA-xq3m-2v4x-88gg requires an attacker-controlled schema reaching runtime codegen; trusted-schema decoding is not directly affected — but that does **not** clear the other protobuf advisories. | Hedera lane |
| **`@hashgraph/sdk`, `@hiero-ledger/sdk`, `@grpc/grpc-js`, `@x402/hedera` HIGH** | Cascade from the protobuf/grpc chain; same major-SDK constraint. | Hedera lane |
| **`ws` HIGH (7.5.10)** | Required as `^7.5.1` by `@walletconnect/jsonrpc-ws-connection`. 7.5.10 is the last 7.x release, so **no within-major patch exists**; forcing 8.x is a cross-major change to WalletConnect. | Integrator + Security |
| **`brace-expansion`, `glob`, `eslint-config-next`, `@next/eslint-plugin-next` HIGH** | Build/lint tooling reached via `eslint-config-next`; npm's fix is the same 16.3.4 major. Classify as build-time, not runtime request paths. | Integrator |

**Cross-lane note:** the nested `@hashgraph/hedera-agent-kit > ws` override touches a shared-root package. It is within-major and passes the battery here, but the **Hedera lane should acknowledge it** rather than making a conflicting upgrade.

## Tests executed on the candidate

| Check | Command | Result |
| --- | --- | --- |
| Root install (reproducible) | `npm ci --legacy-peer-deps` | **exit 0** |
| Production build | `npm run build` | **exit 0** |
| Typecheck | `npx tsc --noEmit` | **exit 0** |
| Ledger mandate + runtime | `npm run ledger:mandate-check` | **exit 0** |
| Shared-root Hedera regression | `npm run hedera:agent-check` (fixture ids, no secrets) | **exit 0** |
| Helper install (reproducible) | `npm ci` in `scripts/ledger-device-proof` | **exit 0** |
| Ceremony contract | `node ceremony-check.mjs` | **exit 0** |
| **Qualification contract (software test)** | `node scripts/ledger-device-proof/qualification-contract-check.mjs`, as CI invokes it | **PASS** — identical prepared EIP-712 digest across approve/reject/cancel, reject/cancel persist no signature, cancel records DMK `cancel()` + `Stopped`, reviewer bundle verifies against the enrolled signer |
| Helper install from committed lockfile | `npm ci --legacy-peer-deps` in helper dir | **exit 0**, `found 0 vulnerabilities`, resolves ws 8.21.3 / uuid 11.1.1 |
| DMK / Signer / Node-HID imports | CI's own `npm run {proof,capture,bundle,downstream,qualify} -- --help`, **no device opened** | **all exit 0** |

### Correction to the first revision of this record

The earlier draft cited `qualification-check.mjs` and its `--prepared is required`
output as qualification coverage. That script is the **evidence-bundling CLI**, not the
software test; the argument error was not qualification evidence. The correct test is
`qualification-contract-check.mjs`, which CI already runs and which is recorded above as
PASS on this candidate. No additional qualification harness is needed and no device is
required for it.

No hardware was opened, no credential or `.env` file was read, no signature, settlement, mint, reset, merge or deployment occurred. Golden reference SHAs `24bbf0d…`, `d5309a9…` and baseline `d0b5f87…` verified intact and unmutated.

## Next independent-review gate (#16)

Exact candidate SHA + lock/dependency graph; production build; Ledger mandate/runtime tests; ceremony and qualification contract tests; isolated DMK/Signer/Node-HID imports; independent review of remaining high/critical **reachability** and actual local listener/browser-Origin protections. No self-certification, no automatic evidence-class upgrade. The signing/app-credential-loading hold remains in force.
