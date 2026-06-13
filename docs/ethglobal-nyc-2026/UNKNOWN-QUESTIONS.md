# Unknowns and proof gaps

Status: must resolve or disclose before submission.

## Eligibility

- Clarified enough to proceed: "partner eligibility" means qualification for a specific sponsor prize track, not basic ETHGlobal submission eligibility.
- Known: the Hedera Automation prize is explicitly Continuity-only, so it is the safest target.
- Unknown: whether Hedera reviewers will consider this continuity project for all non-continuity Hedera tracks or only the continuity-specific Automation track.
- Unknown: whether the project previously participated in an ETHGlobal/Hedera context in a way that changes partner-prize review.
- Known from official ETHGlobal FAQ: Continuity Track allows building on existing work, and partner eligibility depends on the partner's qualification requirements.

Resolution path:

- Ask ETHGlobal/Hedera mentors at the booth or in Discord.
- Ask specifically: "For a Continuity Track project, can we select Hedera's Agentic Payments and No Solidity tracks if the new hackathon delta satisfies those requirements, in addition to the Continuity-only Automation track?"
- Inspect the final ETHGlobal submission form before selecting prizes.
- Keep old-vs-new disclosure in README and submission even if mentors verbally approve.

## Technical proof

- Unknown: which Hedera Schedule Service transaction type is fastest and cleanest for a real booking recovery demo.
- Unknown: whether Schedule Service can cleanly schedule the exact cancel/release/refund operation without awkward key/signature handling.
- Unknown: whether current HCS display gaps on slot detail are data lag, parsing, topic-message query shape, or missing lifecycle emission.
- Unknown: whether Telegram bot setup credentials are already available.
- Unknown: whether a fallback in-app chat simulation is acceptable if Telegram setup blocks.
- Unknown: whether OpenClaw ACP is active and usable in this hackathon workspace.

Resolution path:

- Spike Schedule Service first if targeting Automation.
- If Schedule Service blocks, downgrade Automation and ship agent-assisted resale or release using existing Hedera tx paths.
- Fix or bypass HCS display gaps by linking raw HashScan/Mirror proof in the demo.
- Treat OpenClaw ACP as optional unless runtime readiness is proven.

## Product and demo

- Unknown: whether cancel/release, rebook, or resale is the best first action to ship.
- Unknown: whether the agent needs Hedera Agent Kit for judging credibility, or whether direct SDK usage behind explicit tools is sufficient.
- Unknown: whether "autonomous" language should be softened because the product intentionally requires human approval before execution.
- Known from AgentOps review: existing OpenClaw/Telegram work gives a strong allowlisted capture pattern and external-side-effect guardrails, but not a completed YourTurn execution integration.

Resolution path:

- Choose one action by proof difficulty:
  1. agent-assisted resale listing if time is tight
  2. cancel/release if domain work is manageable
  3. scheduled release/refund if Schedule Service is proven quickly
- Use "agent-assisted" and "policy-bounded" in submission copy.
- Avoid claiming autonomous signing.
- Use Hedera Agent Kit only if policies/hooks or RETURN_BYTES mode can be integrated without destabilizing the core flow.

## Repo operations

- Current branch is `feat/product-issuer-holder-ux` and is ahead/behind origin with many pre-existing modified files.
- Unknown: whether the team wants a new clean repo, a public fork, or this repo as the public submission.
- Unknown: whether existing dirty files are all intended pre-event baseline or include current event work.

Resolution path:

- Do not reset or clean the worktree without human approval.
- Create a fresh branch or tag before implementation work.
- If creating a new public repo, copy only the app, setup docs, continuity disclosure, and proof artifacts. Do not copy general prep archives.

## Submission assets

- Unknown: deployed URL.
- Unknown: final public GitHub URL.
- Unknown: demo video URL.
- Unknown: final selected Hedera tracks.
- Unknown: new testnet tx ids and schedule ids.

Resolution path:

- Fill `docs/ethglobal-nyc-2026/SUBMISSION-CHECKLIST.md` before final dashboard submission.
- Do not record the final public video until the integration scenario works end to end.
