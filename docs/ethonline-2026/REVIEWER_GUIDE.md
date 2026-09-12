# ETHOnline 2026 Reviewer Guide

This is the canonical review router for YourTurn's ETHOnline 2026 Continuity submission.

## Quick start

1. Read `/README.md` for the product story.
2. Read `CONTINUITY_BEFORE_AFTER.md` before evaluating novelty.
3. Read `evidence/manifest.json` before treating any claim as proven.
4. Follow the sponsor route below.
5. Treat the exact source SHA and independent review linked by the manifest as authoritative.

Do not infer claim status from screenshots, filenames, historical docs, issue titles or the existence of code alone.

## Immutable provenance

- Pre-event baseline: `d0b5f875afb4f2b29af29bc5972cf1edc404d473`
- Reviewer-entry package parent: `6125cbb912a202f5bd6033cdbc43edfe403fc351`
- Final integrated candidate: `PENDING_FINAL_INTEGRATION`

## Sponsor routing

### Hedera Continuity

Read in order:

1. `/README.md#hedera-continuity`
2. Hedera rows in `CONTINUITY_BEFORE_AFTER.md`
3. Hedera claims in `evidence/manifest.json`
4. exact source paths referenced by those claims
5. linked Security disposition
6. final transaction / Mirror / HashScan evidence where the claim is LIVE

Key review boundary: pre-event Hedera booking NFTs, royalties, HCS, x402, HAK policies, allowances and Schedule Service are baseline/reused, not ETHOnline-new.

### World AgentKit Continuity

Read in order:

1. `/README.md#world-agentkit-continuity`
2. World claims in `evidence/manifest.json`
3. AgentKit exact-agent binding source
4. AgentBook proof
5. Sandbox proof
6. final signed-route evidence if present
7. linked Security disposition
8. `/WORLD_AGENTKIT_FEEDBACK.md` when materialized

Key review boundary: World proves the expected human-backed requester. It does not create booking ownership, holder authority or payment permission.

### Ledger Continuity

Read in order:

1. `/README.md#ledger-continuity`
2. Ledger claims in `evidence/manifest.json`
3. Recovery Mandate source
4. DEVICE evidence
5. current-mandate/replay enforcement evidence
6. linked Security disposition
7. `/LEDGER_DX_FEEDBACK.md` when materialized

Key review boundary: Ledger approves off-chain delegated authority. It does not sign the Hedera settlement transaction.

## Product continuity route

The judge path uses one Friday Yoga lifecycle:

`Maya owner -> scoped mandate -> 32 denied -> 45 allowed -> Bob funded -> Bob holder -> check-in -> Studio A fulfilment/history`

Fixture product evidence, sponsor-specific proof and integrated live evidence remain separate classes. Do not promote one class into another.

## Evidence classes

- `LIVE`: external network/provider execution.
- `DEVICE`: observed physical Ledger interaction.
- `SANDBOX`: real non-production World interaction.
- `CI_LOCAL`: executable deterministic implementation/security proof.
- `FIXTURE`: product UX state only.
- `HISTORICAL`: pre-event/prior proof, never ETHOnline-new.

## Current reviewer-entry screenshot source

The README screenshot set in this package is curated from R3 Product Workbench Visual run `34705939021`, artifact `10300759531`, SHA-256 `c39bf1764518fecd6190d37869d51529dd9c769d292be1010912aef76111a05b`, exact source `6125cbb912a202f5bd6033cdbc43edfe403fc351`.

These images are FIXTURE product evidence, not sponsor LIVE/DEVICE proof. Final packaging should recapture the same canonical states from the exact final R5/integrated candidate if source/copy changes.

## Machine review

`evidence/manifest.json` is the canonical machine-readable claim graph. Every final claim should include:

- stable claim id;
- sponsor(s);
- claim text;
- novelty classification;
- status;
- evidence class;
- exact source SHA + paths;
- workflow/test/artifact or external proof;
- independent review link;
- limitations;
- prohibited stronger wording where relevant.

When the README, source and manifest disagree, stop and report the inconsistency rather than inferring approval.
