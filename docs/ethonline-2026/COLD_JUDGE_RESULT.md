# Cold Judge Result — Software-Only Checkpoint

**Disposition:** `PASS — SOFTWARE ONLY`

This is not submission-final. DEVICE/LIVE/TESTNET and whole-candidate Security gates remain pending.

## Exact tested software

- Integrated software SHA: `97f0ef8e716201db50f6638af96448900b8c2a4d`
- Approved Product R5 source: `342f46ee6e0c4d0f332287d8433735c5ac015528`
- Frozen runtime Security target ancestor: `25bc842b2c92772e17350ac6dffc021d144cbe32`
- Product/runtime composition: `0b0ee3df1e88690ec80e9aeb54ac6283281f0f37`
- Integrated qualification run: `34725481547`

## Software evidence

Both jobs in run `34725481547` completed SUCCESS.

### Runtime

PASS:
- byte identity vs frozen runtime target;
- single-begin operation ownership;
- current business eligibility;
- public enrollment provisioning + pinned server config;
- durable Bob payment authorization;
- external signing validation regression;
- indexed receipt reader regression;
- final canonical route/source guard;
- prepare/retain regression;
- TypeScript;
- production build.

### Product

PASS:
- byte identity vs human-approved R5;
- approved R5 model/state checks;
- TypeScript on locked repository graph;
- production build on locked repository graph;
- app startup;
- focused final rendered browser/navigation proof;
- Product evidence artifact upload.

The R5 browser proof covers desktop/mobile approved and cancelled outcomes, reload, Back/Forward, provider-minimum changes, Maya/Bob/Studio A consistency and receipt persistence.

## Discoverability/package

PASS at package level:
- README now opens as ETHOnline 2026 rather than the historical Week-5 project;
- `/product-preview` is the Product judge entry;
- canonical `/api/agent/confirm` boundaries are documented;
- evidence classes and cannot-claim boundaries are explicit;
- human ceremony, World ceremony, submission draft, sponsor feedback, demo-video script and final-lock checklist are present.

Package documentation is a docs-only descendant of the tested software and does not change the tested Product/runtime bytes.

## Why this is not `PASS — COLD JUDGE`

The following remain external/implementation gates:

1. independent Security disposition on the frozen runtime and later exact whole candidate;
2. post-confirm signing-state/lease implementation matching `POST_CONFIRM_SIGNING_STATE_SPEC.md`;
3. one-shot human-authorized Hedera submitter matching `HEDERA_ONE_SHOT_SUBMITTER_SPEC.md`;
4. physical Ledger reject/approve/replay evidence;
5. credential-bearing canonical World request + negatives;
6. fresh Hedera testnet settlement from the final integrated cross-sponsor path + Mirror/HashScan/indexed receipt;
7. one final cold-judge run after those gates.

Until those are complete, this checkpoint may support software/product claims only and must not be presented as final end-to-end LIVE qualification.