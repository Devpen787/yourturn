# Ledger Recovery Mandate — Physical DMK Qualification Runbook

Status: **NOT RELEASED FOR HARDWARE.** The exact runtime/dependency candidate must be independently dispositioned by Security before this ceremony runs. `LIVE/DEVICE` remains unproven until a real run succeeds on hardware.

The earlier "software-ready" status is withdrawn: it predates the dependency remediation candidate and must not be read as current runtime clearance.

This runbook is intentionally narrow. It proves that one identical, server-prepared EIP-712 Recovery Mandate can be rejected, host-cancelled, and approved through Ledger DMK; that only the approved hardware signature crosses YourTurn's guarded one-shot activation boundary; and that the signature cannot be replayed. It does **not** execute a recovery, move funds, or claim Ledger signs Hedera HTS transactions.

## Security prerequisite

Do not run the physical ceremony until **all** of the following hold:

1. Security #16 shows SEC-LEDGER-005 and SEC-LEDGER-006 still independently closed for their exact authority-lifecycle claims. **These closures are necessary but NOT sufficient** — they say nothing about the current dependency/runtime candidate.
2. Independent Security has dispositioned the exact dependency-remediation candidate and lifted the signing/app-credential-loading hold. Builder-reported test results are not that disposition.
3. The ceremony runs from the exact cleared candidate with its exact-head Continuity Gate green.

Inherited status lines elsewhere in this repository do not substitute for (2).

## Docs reviewed for this qualification

GitHub-only review of Ledger's current official `LedgerHQ/device-sdk-ts` source at `22a60c7441083b2627b671bac56dc1a38509330a` confirmed the API surface used here:

- `packages/signer/signer-eth/README.md`: `SignerEth.signTypedData(derivationPath, typedData)` signs EIP-712 typed data and returns a device action with `observable` + `cancel`.
- `packages/signer/signer-eth/src/internal/DefaultSignerEth.ts`: current `signTypedData` delegates to the typed-data use case and accepts `TypedDataOptions`.
- `packages/signer/signer-eth/src/api/app-binder/SignTypedDataDeviceActionTypes.ts`: observable steps include `signer.eth.steps.signTypedData`; pending values expose `requiredUserInteraction`; terminal state is the standard DMK `DeviceActionState` contract.
- `packages/signer/signer-eth/src/internal/app-binder/command/utils/ethAppErrors.ts`: Ethereum app code `6982` is `Security status not satisfied (Canceled by user)`.
- current package manifests at that LedgerHQ source revision report `@ledgerhq/device-management-kit` **1.9.0** and `@ledgerhq/device-signer-kit-ethereum` **1.18.0**, matching this isolated proof harness.

No Clear Signing, Security Key/FIDO2, Key Ring, or Hedera transaction-signing claim is made by this ceremony.

## Requirement -> code -> evidence

| Requirement | Code | Required evidence |
| --- | --- | --- |
| Identical server-controlled Recovery Mandate | `capture-prepared.mjs`, `ceremony.mjs`, `qualification.mjs` | one prepared JSON; one digest shared by reject/cancel/approve |
| Current DMK Ethereum EIP-712 signing | `device-proof.mjs` | observable `signer.eth.steps.signTypedData` + `requiredUserInteraction` |
| Device rejection is load-bearing | `device-proof.mjs`, `qualification.mjs`, `downstream-check.mjs` | `6982`, no signature, no device-proof activation; only later approved signature activates |
| Host cancellation is observable | `device-proof.mjs`, `ceremony.mjs` | `cancelRequested=true` + DMK `Stopped`, no signature |
| Approval is hardware-bound | `device-proof.mjs`, `qualification.mjs` | DMK `Completed`, signature verifies to server-enrolled address |
| One-shot/no replay | existing Recovery Mandate Redis path + `downstream-check.mjs` | wrong signature rejected; approved signature accepted once; identical replay rejected |
| Mutable booking safety | existing guarded activation/active-authority loader | SEC-LEDGER-005/006 independently closed before hardware run |
| No legacy ApprovalGrant route | proof/session/downstream tooling | scripts never call `/api/agent/approval-grant` |
| Reviewer-safe evidence | `qualification-check.mjs`, `downstream-check.mjs` | bundle excludes full mandate, cookie, device name, seed/private material |

## Preconditions

- macOS/Linux host with Node 22+ and USB access to a Ledger supported by current DMK Node-HID.
- Ledger unlocked. The Ethereum app may be opened by DMK.
- Root app dependencies installed and the local YourTurn environment otherwise configured as usual.
- A current **guestA** booking serial that is held by guestA, resale-eligible, and not already actively listed. The hero example below uses serial `193`; if local state differs, change only the `SERIAL` shell variable before preparation.
- `output/` is gitignored. Keep raw device proof files there; share only the reviewer-safe outputs unless a reviewer specifically needs raw states.

## Exact ceremony

### 1. Install the isolated current Ledger stack and confirm the enrolled public address

From the repository root:

```bash
cd scripts/ledger-device-proof
npm ci --legacy-peer-deps
npm run address
```

On the Ledger, confirm the displayed Ethereum address at derivation path `44'/60'/0'/0/0`. The safe terminal output ends with:

```text
public Ledger EVM address: 0x...
derivation path: 44'/60'/0'/0/0
```

Only the public `0x...` address is used below. Never copy a seed phrase, PIN, private key, recovery phrase, or wallet password into the repo, terminal transcript, GitHub, or evidence files.

### 2. Start the local app with server-controlled signer enrollment

In a separate terminal from the repository root, replace `0xPUBLIC_LEDGER_ADDRESS` with the public address confirmed on-device:

```bash
export LEDGER_GUEST_A_SIGNER_ADDRESS=0xPUBLIC_LEDGER_ADDRESS
npm run dev:ceremony
```

The ceremony launch MUST be `dev:ceremony`, not `dev` or `dev:clean`. It binds
`-H 127.0.0.1` so the dev server listens on the IPv4 loopback interface only.
Without an explicit host, Next 14.2.18 leaves `hostname` undefined and
`server.listen(port, undefined)` binds the unspecified address, which is reachable
from other interfaces on the network.

IPv6 is deliberate: `::1` is intentionally NOT bound, so exactly one local interface
is reachable during the ceremony. If a future runbook needs `::1`, that is a separate
reviewed change with its own denial evidence.

Executable proof of this boundary:

```bash
node scripts/ledger-device-proof/loopback-boundary-check.mjs

```

This enrollment is server-side process configuration. The mandate-preparation request has no signer-address input and cannot substitute it.

### 3. Capture exactly one server-prepared 40-USDC Recovery Mandate

In the Ledger-tool terminal:

```bash
cd scripts/ledger-device-proof
SERIAL=193
rm -rf ../../output/ledger-qualification
mkdir -p ../../output/ledger-qualification
npm run capture -- \
  --actor guestA \
  --serial "$SERIAL" \
  --minimum-atomic 40000000 \
  --expires-in 7200 \
  --out ../../output/ledger-qualification/prepared.json
```

Expected safe output includes:

```text
Prepared Recovery Mandate: PASS
- mandateId: ...
- digest: 0x...
- signer: 0x...
- evidence: CONFIGURED (no device claim yet)
- session cookie: memory only; not written to the evidence file
```

If holder, status, provider policy, listing state, or signer enrollment is wrong, preparation must fail before any physical signing ceremony. Do not hand-edit `prepared.json`.

### 4. Run reject -> cancel -> approve -> bundle -> downstream activation as one session

Use the exact same prepared file for all three device actions:

```bash
npm run qualify -- \
  --actor guestA \
  --prepared ../../output/ledger-qualification/prepared.json \
  --out-dir ../../output/ledger-qualification/session-1
```

The runner fixes the order and file paths so three different mandates cannot be accidentally mixed.

#### Phase A — reject on device

When the Ledger presents the Recovery Mandate, reject it on-device.

Required evidence:

```text
typed-data: pending | signer.eth.steps.signTypedData | interaction=...
typed-data: error | ... | errorCode=6982
Result: rejected
No signature was persisted and no authority activation was attempted.
```

Any signature, `Completed`, `Stopped`, missing typed-data interaction, or error other than the supported user-rejection code fails the phase.

#### Phase B — host cancel

Do not approve or reject on the Ledger. When DMK exposes the typed-data interaction, the runner invokes the action's `cancel()` handle.

Required evidence includes an observable terminal `Stopped` state and the proof records `cancelRequested=true`:

```text
typed-data: pending | signer.eth.steps.signTypedData | interaction=...
typed-data: stopped
Result: cancelled
No signature was persisted and no authority activation was attempted.
```

A host cancel request without observable `Stopped` is not accepted.

#### Phase C — approve on device

Review and approve the same mandate on the Ledger.

Required evidence:

```text
typed-data: pending | signer.eth.steps.signTypedData | interaction=...
typed-data: completed
Result: approved
The proof contains the hardware-produced signature but has NOT activated authority.
```

The runner then verifies the signature with EIP-712 recovery and requires it to equal the server-enrolled Ledger address. `ethers.verifyTypedData()` is used only for cryptographic verification of the hardware-produced signature; it is not treated as Ledger provenance by itself.

#### Phase D — reviewer-safe identical-mandate bundle

The session automatically checks that approve/reject/cancel all have the same mandate ID, digest, derivation path, and derived/enrolled Ledger address; reject/cancel have no signature; cancel records both `cancelRequested` and `Stopped`; and approve's signature verifies.

Required output:

```text
Ledger identical-mandate device qualification: PASS
- reject: observed; no signature; no activation
- cancel: DMK Stopped observed; no signature; no activation
- approve: Completed observed; signature recovers enrolled signer
```

#### Phase E — downstream non-bypass

The session then logs into the **local** demo app and exercises only `/api/ledger/recovery-mandate/activate`:

1. a syntactically valid wrong signature must be rejected without consuming the prepared mandate;
2. the approved hardware signature must activate the exact prepared authority once;
3. the identical hardware signature must fail on replay.

Required output:

```text
Ledger downstream non-bypass qualification: PASS
- wrong signature rejected: HTTP ...
- hardware-approved mandate activated: HTTP 200
- identical signature replay rejected: HTTP ...
- exact authority scope matches the signed mandate
- recovery execution attempted: no
- funds moved: no
```

The activation response must exactly match signed `agentId`, token/serial, action, minimum, settlement asset, and cancellation flag, and must carry a stable even authority-state version. This phase does not call recovery execution, resale-buy, transfer, or the legacy approval-grant route.

## Evidence artifacts

A successful session creates these uncommitted files under `output/ledger-qualification/session-1/`:

- `reject-proof.json` — raw sanitized device states; no signature.
- `cancel-proof.json` — raw sanitized device states; no signature; `cancelRequested=true`.
- `approve-proof.json` — raw sanitized device states plus the public ECDSA signature.
- `reviewer-bundle.json` — preferred reviewer artifact; omits the full mandate body, session cookie, and device name while retaining digest, public signer, observable states, and approved signature.
- `downstream-proof.json` — preferred downstream artifact; records wrong-signature rejection, exact approved activation, and replay rejection without a recovery execution or fund movement.

`reviewer-bundle.json` may say `deviceEvidenceLevel: LIVE/DEVICE` only after all three real hardware phases pass. `authorityEvidenceLevel` remains `CONFIGURED` in that bundle until the downstream phase passes; the downstream proof labels its authority evidence `LOCAL`, not testnet execution.

## Stop conditions

Stop and preserve the failing output without making a sponsor claim if any of these occur:

- derived device address differs from server enrollment;
- the prepared digest changes between phases;
- DMK never exposes the typed-data interaction;
- reject does not surface supported `6982` user rejection;
- cancel does not surface `Stopped`;
- approve does not surface `Completed` + a signature recovering the enrolled signer;
- wrong signature activates;
- approved activation scope differs from the signed mandate;
- replay succeeds;
- booking state changes and guarded activation rejects the now-stale mandate.

The last case is a correct security outcome: prepare a new mandate from current booking state rather than bypassing the guard.
