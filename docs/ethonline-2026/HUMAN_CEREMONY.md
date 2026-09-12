# Final Human Ceremony — ETHOnline 2026

This document is the only human/external-action gate for the finish-line candidate. Do not perform these steps until the exact integration SHA has passed combined CI and the current Security disposition allows the ceremony.

No secret, seed phrase, private key or credential belongs in GitHub comments, screenshots, logs, HCS messages or this repository.

## Preconditions

Before Devinson starts:

- [ ] Issue #5 names one exact integrated candidate SHA.
- [ ] The exact SHA has green runtime + Product integration CI.
- [ ] Issue #16 has no unresolved blocking Security finding for the ceremony boundary.
- [ ] `YOURTURN_WORLD_RESOURCE_URI` is the exact reviewed `/api/agent/confirm` resource.
- [ ] Public enrollment manifest/version/digest are reviewed and pinned.
- [ ] Maya/holder, Bob/buyer and executor Hedera accounts match the pinned manifest and current chain state.
- [ ] Bob has sufficient testnet USDC for the exact gross commitment and required token association.
- [ ] The booking serial is the intended demo serial and current holder/provider state is correct.
- [ ] The exact Recovery Mandate text, minimum, expiry, nonce and action are visible before Ledger approval.

If any precondition is false, stop. Do not improvise a fallback identity, account, serial, policy or amount.

## Ceremony A — Ledger DEVICE proof

Purpose: prove the human authorizes the **Recovery Mandate**, not the Hedera settlement transaction.

The repository already contains the dedicated DMK ceremony tooling under `scripts/ledger-device-proof/`. Use that existing runner; do not replace it with an ad-hoc signing script.

### Exact local preparation

From the repository root on the exact selected SHA:

```bash
npm ci --legacy-peer-deps
npm run dev:ceremony
```

In another terminal:

```bash
cd scripts/ledger-device-proof
npm ci
npm run capture -- \
  --actor guestA \
  --serial <FINAL_DEMO_SERIAL> \
  --minimum-atomic <FINAL_SELLER_NET_MINIMUM_ATOMIC> \
  --expires-in 7200 \
  --base-url http://127.0.0.1:3000 \
  --out ../../output/ledger-qualification/prepared.json
```

Before touching the device, inspect `prepared.json` and confirm the human-readable statement matches the exact intended owner, agent, booking token/serial, `resale` scope, minimum seller-net recovery, Hedera USDC settlement asset, expiry, nonce and `cancellationAllowed=false`.

### Exact qualification session

Run:

```bash
npm run qualify -- \
  --actor guestA \
  --prepared ../../output/ledger-qualification/prepared.json \
  --out-dir ../../output/ledger-qualification/session-1 \
  --base-url http://127.0.0.1:3000
```

The existing qualification runner deliberately fixes the order and uses the **same prepared mandate**:

1. physical **DEVICE REJECT**;
2. host cancel after the DMK typed-data interaction becomes observable;
3. physical **DEVICE APPROVE**;
4. reviewer-safe identical-mandate bundle generation;
5. downstream non-bypass proof where wrong signature is rejected, the hardware signature is accepted once, and replay is rejected.

Follow the runner prompts exactly. Do not approve during the reject step and do not create a different mandate between reject/cancel/approve.

Expected safe outputs under the fresh evidence directory include the reject, cancel and approve proofs, reviewer bundle and downstream proof. No recovery execution endpoint or funds are involved in this Ledger ceremony.

Success criteria: physical reject makes no authority change; the exact same human-readable mandate can then be approved on-device; downstream activation accepts the hardware-approved mandate exactly once; wrong signature and replay are denied. This proves device involvement only for the mandate authorization.

## Ceremony B — World canonical signed request

Purpose: prove the requesting agent is human-backed under the World integration while YourTurn independently enforces booking authority.

1. From the final candidate, request the read-only canonical challenge from `GET /api/agent/confirm`.
2. Confirm the challenge binds the exact operation, intent hash and configured resource URI.
3. Complete the supported credential-bearing World/AgentKit signing flow for the enrolled requester.
4. Submit the fresh signed request to the exact `POST /api/agent/confirm` resource.
5. Confirm the request reaches the canonical policy path and produces/returns the intended operation state; World itself must not supply holder identity or booking permission.
6. Record safe evidence for AgentBook/Sandbox resolution and the canonical request outcome.

### Required negatives

- tamper with the signed statement/resource/intent and prove denial;
- use an unresolved/unregistered requester and prove denial or the documented fail-closed result;
- replay the same World nonce and prove no second effect;
- confirm no raw/unnecessary World human identifier appears in public receipts/HCS/evidence.

Success criteria: one fresh credential-bearing canonical request succeeds to the intended policy/effect boundary; tampered/unresolved/replayed requests do not produce another effect.

## Ceremony C — Hedera testnet settlement

Purpose: prove the final integrated candidate settles the exact Bob-funded D-010 economics on testnet and reconciles the indexed receipt.

1. Use the exact retained unsigned transaction produced by the canonical operation. Do not regenerate it.
2. Run the `BEFORE_SIGN` validation boundary. Confirm it returns the exact Bob-authorized transaction for the external executor signer and no execution permit.
3. With the designated external executor signer, sign those exact bytes once.
4. Run the `BEFORE_SUBMIT` validation boundary on the returned fully signed bytes.
5. Confirm transaction ID, body, roles, provider policy, current authority, economics, replay tombstones and signatures are still accepted.
6. Human-authorize **one** Hedera testnet submission of those exact validated bytes. Do not retry automatically if the submission outcome is uncertain.
7. Record the transaction ID immediately.
8. Read the transaction through the fixed Hedera testnet Mirror endpoint and reconcile using the exact indexed receipt reader.
9. Verify all expected effects:
   - exact booking NFT serial transferred from Maya to Bob;
   - Bob is the USDC debit/source;
   - Maya receives seller **net**;
   - any configured royalty collector receives exactly the approved royalty;
   - executor is only the transaction fee payer where intended;
   - no extra fungible/NFT/HBAR movement exists;
   - operation reaches `completed` with the indexed receipt digest.
10. Save safe Mirror/HashScan links and the exact receipt/economic summary.

### Important current gate

Do **not** use `scripts/hedera-policy-usdc-recovery-live.mjs` for this ceremony: that runner is explicitly retired and preserved only for historical `411f703e...` evidence. Do **not** use `scripts/hedera-return-bytes-external-signer.mjs` for the final D-010 settlement either: its delegated-transfer semantic guard intentionally forbids hidden fungible transfers and therefore does not represent the new NFT + Bob-funded USDC + royalty transaction.

The final one-shot submitter must consume only the exact fully signed bytes that already passed `BEFORE_SUBMIT`, must not sign/regenerate/rewrite them, must submit at most once after explicit human authorization, and must hand the exact transaction ID to the existing receipt reconciler. Until that bounded submitter exists and is reviewed, this ceremony remains RED rather than falling back to historical scripts.

### Failure rule

If submission status is unknown, do not generate/resubmit a replacement transaction. Reconcile the already-started effect by exact transaction ID. If the transaction is definitively absent and Security-approved recovery rules allow another attempt, create a new operation/commitment according to that approved procedure rather than silently replaying the original.

## Evidence packet after the ceremony

Record in issue #18 and the final evidence manifest:

- exact integrated SHA;
- Ledger approve/reject/replay evidence references;
- World valid/tampered/unresolved/replay evidence references;
- Hedera transaction ID, Mirror/HashScan references and indexed receipt digest;
- gross, royalty and seller-net atomic amounts;
- Security disposition covering the exact integrated SHA;
- any limitation or failed case that remains.

Only after these are recorded may the corresponding DEVICE/LIVE/TESTNET fields change from pending to green.