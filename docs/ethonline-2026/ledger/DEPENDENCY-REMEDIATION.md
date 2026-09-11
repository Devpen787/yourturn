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

`scripts/ledger-device-proof/` had **no lockfile**, so its graph was unreproducible and it could not be installed from source. Added `package-lock.json` (lockfileVersion 3, **54 external package records** plus the root entry). The earlier "58 packages" figure counted total lock entries and must not be conflated with audit-entry counts.

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
| **`next` CRITICAL** (14.2.18) | npm proposes `next@16.3.4`, but that is npm's suggestion, **not proof of the only compatible path** — this document's own AVIF row cites an upstream `15.5.24` fix. Either is a major framework migration. #16 requires Golden behaviour/presentation regression evidence for any framework change; that is a separate reviewed task, not a dependency patch. Per #16: GHSA-p293-qw3h-jr36 is Windows-hosting-specific and does not match the macOS ceremony; GHSA-3h52-269p-cp9r is a dev-server attack needing a patched framework **plus** `allowedDevOrigins` — a loopback listener alone is not clearance; GHSA-2xp9-vwfh-vxw4 (AVIF) lists fixes 15.5.24/16.3.3 and **no 14.2.x fix exists**. | Integrator + Security |
| **`postcss` HIGH (nested)** | `next` vendors its own `postcss@8.4.31` at `node_modules/next/node_modules/postcss`. Unreachable without changing Next. | Integrator + Security |
| **`protobufjs` CRITICAL** | Only npm-proposed fix is `@hashgraph/sdk@2.72.0`, a major SDK change owned by the Hedera lane. #16 explicitly requires cross-lane coordination rather than unilateral upgrades. Per #16, GHSA-xq3m-2v4x-88gg requires an attacker-controlled schema reaching runtime codegen; trusted-schema decoding is not directly affected — but that does **not** clear the other protobuf advisories. | Hedera lane |
| **`@hashgraph/sdk`, `@hiero-ledger/sdk`, `@grpc/grpc-js`, `@x402/hedera` HIGH** | Cascade from the protobuf/grpc chain; same major-SDK constraint. | Hedera lane |
| ~~`ws` HIGH (7.5.10)~~ **RESOLVED in v3** | The v2 claim that "7.5.10 is the last 7.x" was **wrong**. `7.5.11`, `7.5.12` and `7.5.13` all exist, and `7.5.11` satisfies the declared `^7.5.1`. v3 pins `@walletconnect/jsonrpc-ws-connection > ws` to exactly `7.5.11` — the version Security named — so the graph resolves `node_modules/ws` 7.5.10 → 7.5.11 and the advisory clears with no cross-major change. | closed by v3 |
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


## v3 — successor to v2 `369ea0d1`

v2 is preserved unchanged as evidence. v3 closes four review findings.

### 1. Restored the `pino` override that v2 deleted (regression introduced by v2)

v2 assigned a fresh `overrides` object instead of merging into the baseline one, silently
dropping `"pino": "8.17.2"`. Effect in the v2 lock: root `pino` 8.17.2 → 10.1.0 plus a new
nested `@walletconnect/logger/node_modules/pino@10.0.0`. That was a cross-major change
outside the stated within-major scope, and `next.config.mjs` documents pino/
`diagnostics_channel` build handling around the Hedera SDK.

**No compatibility or security case is offered for removing it. The pin is restored.**
v3 resolves every `pino` node to `8.17.2` and no 10.x copy remains.

Graph-shape note for review: at baseline `pino@8.17.2` was a single hoisted
`node_modules/pino`; in v3 it appears as four nested `8.17.2` copies under
`@hashgraph/sdk`, `@hiero-ledger/sdk`, `@walletconnect/logger` and `@x402/hedera`.
The pinned **version** is preserved everywhere; only hoisting differs, as a side effect of
the other scoped overrides.

### 2. `ws@7.5.11` backport evaluated against the actual graph

Only `@walletconnect/jsonrpc-ws-connection` declares a 7.x range (`^7.5.1`), resolving to
`7.5.10`. `7.5.11` satisfies that range, so a nested override applies it with no cross-major
change. Pinned exactly rather than by caret so review sees precisely what ships; `7.5.12`
and `7.5.13` also exist and are a later decision. **Root audit 23 → 22 and the `ws` entry
clears entirely.**

### 3. Ceremony transport bound to loopback, with executable denial evidence

The supported launch was `npm run dev:clean` → `next dev -p 3000`, no host, so Next 14.2.18
leaves `hostname` undefined and `server.listen(port, undefined)` binds the unspecified
address. v3 adds `dev:ceremony` = `next dev -H 127.0.0.1 -p 3000` and points the runbook at
it. `dev` and `dev:clean` are deliberately untouched so World/UX workflows are unaffected.

**IPv4/IPv6 is deliberate:** `-H 127.0.0.1` binds IPv4 loopback only; `::1` is intentionally
not bound, leaving exactly one reachable local interface during the ceremony.

`scripts/ledger-device-proof/loopback-boundary-check.mjs` is executable denial evidence and
now runs in CI. It asserts the script/runbook contract, then proves at runtime that a
127.0.0.1-bound listener **refuses** this host's non-loopback IPv4 address (`ECONNREFUSED`)
while accepting 127.0.0.1 — and includes a **control** showing an unbound listener (today's
behaviour) **is** reachable on that same address, so the denial is caused by the flag rather
than the environment. It skips loudly if no non-loopback interface exists.

Scope limit: this is a transport boundary. It is not route authorization, and no
browser-Origin guard was added to `/api/auth/demo-login` or
`/api/ledger/recovery-mandate/activate`. Security's condition allowed either an explicit
loopback bind **or** an equivalent fail-closed boundary; the bind is what v3 implements.

### 4. Retained unchanged

Helper lockfile, lock-enforcing `npm ci --legacy-peer-deps`, and the existing
`qualification-contract-check.mjs`. All rerun below.


## v4 — successor to v3 `5091626c`

v3 is preserved unchanged as evidence. v4 closes the two bounded handoff items from
#2 comment 5640706990 / #16 comment 5640704402, plus the skipped-branch defect Security
identified in the boundary checker.

### 1. Remote source chain completed

v3's blob was only a v2→v3 delta, and the v2 patch blob and root-lock blob I quoted were
**never published** — both returned 404. Listing a locally computed hash in a comment does
not make an object remotely retrievable, and reporting them as identities was misleading.

v4 publishes a **cumulative patch from the published base `7ac9e8ea3ba8` to the v4
successor**, so reviewers need exactly one artifact with no chain gaps, plus the original
v2 patch as its own no-ref blob so v2's stated identity becomes real. Both are read back
and hash-verified. No ref, branch or tag is created.

### 2. Runbook now matches CI, and readiness no longer over-claims

Step 1 installed the helper with `npm install --no-package-lock --legacy-peer-deps`, so the
committed lock was enforced in CI but **not** in the actual human ceremony install. It is now
`npm ci --legacy-peer-deps`.

The inherited `software-ready` status is **withdrawn** — it predates this remediation
candidate and must not be read as current runtime clearance. The Security prerequisite now
states explicitly that SEC-LEDGER-005/006 closure is **necessary but not sufficient**, and
that independent disposition of the exact dependency/runtime candidate plus lifting of the
signing/app-credential-loading hold are required before hardware.

`loopback-boundary-check.mjs` gained assertions that the runbook and CI both install the
helper lock-enforcing and never with `--no-package-lock`, so the two cannot drift apart again.

### 3. Skipped branch can no longer masquerade as denial evidence

Security showed that with `os.networkInterfaces = () => ({})` the checker printed SKIP and
still exited 0. That branch now reports **NOT EXERCISED** and **fails**. Verified with the
same synthetic probe: `FAIL (1 failure(s))`, `runtime denial branch: NOT EXERCISED`.

### 4. Real-Next binding evidence (answers the open question)

Security asked whether actual credential-free Next binding and IPv6 denial evidence is
required. v4 provides it as an **opt-in** `--with-next` mode, off by default so CI stays
deterministic. It starts the real `next dev -H 127.0.0.1` on an ephemeral port with **no
application environment**, then probes:

| Probe | Result |
| --- | --- |
| real Next dev server on `127.0.0.1` | **ACCEPTS** |
| real Next dev server on this host's non-loopback IPv4 | **REFUSES** `ECONNREFUSED` |
| real Next dev server on IPv6 `::1` | **REFUSES** `ECONNREFUSED` |

So the IPv4-only bind is real in the actual supported process, not just in generic TCP
semantics, and `::1` is genuinely unbound.

**What this still does not prove:** it is a transport boundary only. No HTTP-level or
browser-Origin authorization check was added to `/api/auth/demo-login` or
`/api/ledger/recovery-mandate/activate`. Loopback binding does not address browser-origin
risk from a page running on the operator's own machine. Remaining Next/protobuf/runtime risk
disposition stays with independent Security; nothing here self-clears it.
