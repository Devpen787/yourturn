# YourTurn — ETHOnline 2026 Continuity

YourTurn lets a booking holder delegate **one narrowly bounded recovery authority** without giving an agent broad wallet control. The exact requester is verified, current provider/payment/eligibility/chain facts are re-read, and Hedera transaction bytes are prepared and retained for external human signing.

**Continuity tracks:** Hedera · World AgentKit · Ledger

## Submission source

- Selected/frozen software: `60a51fe09e735409a1c0b35593bc4413a49016e1`
- Tree: `f60a892ce6ecdb7ebb22b49e0e23985f938b7205`
- Integration selection: issue #5 comment `5650011760`
- Whole-candidate Security: issue #16 comment `5650032923` — **CLEARED SOURCE / HOSTED-CI / LOCAL**
- Product R5: `342f46ee6e0c4d0f332287d8433735c5ac015528` — human-approved **FIXTURE**
- Exact-head qualification: Actions run `34727782318` — SUCCESS
- Pre-event baseline: `d0b5f875afb4f2b29af29bc5972cf1edc404d473`

A documentation-only package successor may sit on top of the selected software. The selected **executable** software remains `60a51fe09e735409a1c0b35593bc4413a49016e1`.

## Demo video

Public mirror: https://youtu.be/weiLDw20zss

The final video was also uploaded directly to the ETHGlobal submission form. It intentionally keeps Product fixture footage and sponsor proof at their real evidence classes; it does **not** pretend they were one LIVE three-sponsor execution.

## Five-minute judge path

```bash
npm ci --legacy-peer-deps
node --experimental-transform-types scripts/single-begin-composition-check.mjs
node --experimental-transform-types scripts/hedera-external-signing-check.mjs
node --experimental-transform-types scripts/hedera-receipt-reader-check.mjs
npx tsc --noEmit --incremental false
npm run build
npm run dev
```

Then open:

```text
/product-preview
```

`/product-preview` is **Product R5 FIXTURE**, not LIVE sponsor settlement.

For the current evidence map, read:

- [`docs/ethonline-2026/REVIEWER_GUIDE.md`](docs/ethonline-2026/REVIEWER_GUIDE.md)
- [`docs/ethonline-2026/FINAL_EVIDENCE.json`](docs/ethonline-2026/FINAL_EVIDENCE.json)
- [`docs/ethonline-2026/MEDIA_STATUS.md`](docs/ethonline-2026/MEDIA_STATUS.md)
- [`docs/ethonline-2026/CONTINUITY_BEFORE_AFTER.md`](docs/ethonline-2026/CONTINUITY_BEFORE_AFTER.md)
- [`docs/ethonline-2026/CLAIMS.md`](docs/ethonline-2026/CLAIMS.md)

Internal issues #5/#16/#18 are provenance and coordination history; a judge should not need them to understand the submission.

## What the software actually does

```text
Ledger Recovery Mandate
  ↓
current server-owned authority projection
  ↓
World AgentKit exact requester + resource + intent verification
  ↓
current provider policy + buyer eligibility/payment + Hedera chain facts
  ↓
single begin-effect boundary
  ↓
Hedera policy + exact transaction preparation
  ↓
durable retained unsigned bytes
```

`/api/agent/confirm` intentionally stops at durable retained **unsigned** Hedera transaction bytes. External-signing validation, post-confirm signing-state validation, one-shot dispatch control and indexed-receipt reconciliation are reviewed lifecycle primitives at SOURCE/CI/LOCAL scope; they are **not automatically invoked by a public route**.

### Why the Ledger SDK is out-of-band

Physical device signing lives under `scripts/ledger-device-proof/` so the server never holds or proxies Maya's hardware key. The result of that ceremony — the bounded Recovery Mandate — is load-bearing in server runtime. Without current valid mandate authority, the recovery operation cannot begin.

Ledger is **not** claimed to sign the Hedera HTS settlement transaction.

## Evidence classes

| Surface | Strongest settled evidence | What it does **not** prove |
| --- | --- | --- |
| Product | Human-approved R5 **FIXTURE** | LIVE sponsor execution |
| World | **LIVE/AGENTBOOK** + real non-production World ID Sandbox | final credential-bearing signed recovery route |
| Ledger | real physical `signTypedData` rejection attempt + software authority SOURCE/CI/LOCAL | exact final integrated DEVICE approve/provenance |
| Hedera | historical **LIVE/TESTNET** tx `0.0.8504405@1789139309.785362819`: booking NFT + flat 45 USDC in one transaction | newer D-010 final-path LIVE execution or whole-workflow atomicity |
| Final integrated software | selected `60a51fe09e735409a1c0b35593bc4413a49016e1`, whole-candidate Security green SOURCE/HOSTED-CI/LOCAL | automatic live signing/submission or one LIVE three-sponsor run |

Supporting World Sandbox evidence is preserved on `feature/ethonline-world-sandbox-proof`; that proof is real non-production evidence and does not confer booking authority.

Historical Hedera checkpoint: `411f703e164cac82b5498c1f25a2cf21af7bc4be`. The word **atomic** applies only to that single Hedera transaction boundary.

## Canonical demo economics

Product R5 demonstrates this configured policy:

- Maya's current holder-mandate minimum: **40 USDC net**
- 32 USDC offer: **rejected**
- successful offer: **45 USDC gross**
- demo provider royalty: **10%**
- demo result: **40.5 USDC to Maya + 4.5 USDC to Studio A**
- the 10% rate is **demo configuration, not a universal system rate**
- authorization = provider rules ∩ holder mandate ∩ buyer eligibility/payment

The historical Hedera transaction `0.0.8504405@1789139309.785362819` moves a **flat 45 USDC** and is not proof of the newer 40.5/4.5 D-010 split.

## Continuity — what changed during ETHOnline

Before ETHOnline, YourTurn already had Hedera booking NFTs, booking/recovery UI, HCS/Mirror proof surfaces, Schedule Service proof, policy-agent work and earlier payment paths.

ETHOnline adds the new cross-sponsor authority plane:

- replay-safe Ledger Recovery Mandate and guarded current authority;
- canonical mapping from holder mandate → World requester → Hedera executor;
- official World AgentKit request verification with resource/intent/freshness/replay boundaries;
- operation-scoped provider/payment/eligibility state;
- Bob-funded payment authorization and seller-net minimum semantics;
- durable one-begin preparation with retained unsigned transaction output;
- external-signing and post-confirm validation primitives;
- one-shot submission fencing and exact indexed-receipt reconciliation.

See [`docs/ethonline-2026/CONTINUITY_BEFORE_AFTER.md`](docs/ethonline-2026/CONTINUITY_BEFORE_AFTER.md).

## Sponsor feedback

- [`WORLD_AGENTKIT_FEEDBACK.md`](WORLD_AGENTKIT_FEEDBACK.md)
- [`LEDGER_DX_FEEDBACK.md`](LEDGER_DX_FEEDBACK.md)
- [`docs/ethonline-2026/HEDERA_FEEDBACK.md`](docs/ethonline-2026/HEDERA_FEEDBACK.md)

## Claim boundaries

We do **not** claim:

- Product R5 is LIVE;
- World Sandbox is production identity;
- AgentBook LIVE proves a final credential-bearing signed recovery mutation;
- a Ledger rejection proves final DEVICE approve provenance;
- the historical Hedera transaction proves the newer D-010 40.5/4.5 economics;
- the whole cross-system workflow is atomic;
- `/api/agent/confirm` automatically signs or submits to Hedera;
- separate sponsor artifacts are one LIVE Ledger → World → Hedera execution.

## Local configuration

```bash
cp .env.example .env.local
```

Use reviewed non-secret test configuration only. There are deliberately no production private-key defaults.

## Historical material

Week-5 and ETHGlobal NYC documents remain repository history/provenance. They are **not** the ETHOnline 2026 judge entry. For current truth, start with this README, `REVIEWER_GUIDE.md`, and `FINAL_EVIDENCE.json`.
