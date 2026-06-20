# Hedera Week 5 Final Submission Steps

Use this as the final submit-day runbook for the Hedera AI Bounty Week 5 Policy Agent entry.

Submission deadline: 2026-06-21 23:59 UTC.

Primary rule source:

- https://ai-bounties.hedera.com/
- https://ai-bounties.hedera.com/terms-and-conditions

## Keep this lane separate from ETHGlobal

ETHGlobal and the Hedera AI bounty are different entry streams, even if they reuse the same app.

- ETHGlobal artifacts are historical continuity materials in `docs/ethglobal-nyc-2026/*` and were used for the ETHGlobal NYC event process.
- Week 5 bounty artifacts are active for this bounty and must stand on their own proof chain: `docs/HEDERA-AI-BOUNTY-WEEK5-POLICY-AGENT.md`, `docs/HEDERA-WEEK5-FINAL-STEPS.md`, `/week5-proof`, `/api/agent/week5-proof`.
- For final submissions, prefer this lane’s claim set and proof endpoints, and avoid mixing legacy ETHGlobal screenshots or copy unless specifically marked as historical.

### Submission lane rule for reviewers

- Use ETHGlobal docs only as historical context.
- Use Week 5 docs and proof routes for the submission claims and reviewer walkthrough:
  - `docs/HEDERA-AI-BOUNTY-WEEK5-POLICY-AGENT.md`
  - `docs/HEDERA-WEEK5-DEMO-SCRIPT.md`
  - `/week5-proof`
  - `/api/agent/week5-proof`
  - `/api/x402/recovery-policy`
  - `/api/wallet-budget/config`
  - `/api/nft-studio/proof`

## Video answer

A video is useful, but it is not enough for Week 5.

For Bounties 3, 4, and 5, the terms require a hosted agent URL. A video-only submission does not qualify. The best submission should include both:

1. Hosted app URL: required.
2. Short X/video demo: optional but recommended for demo quality and judge clarity.

If posting on X, mention `@hedera` and `@hedera_devs` and use `#HederaAgent` and `#HederaAIBounty`.

## Must finish before submitting

| Step | Owner | Required? | Status | Done when |
| --- | --- | --- | --- | --- |
| Final local verification | Codex | Yes | Done | `npm run hedera:agent-check` and `npm run build` pass |
| Feedback issue | Devinson/Codex | Yes | Done | https://github.com/hashgraph/hedera-agent-kit-js/issues/940 |
| Public repo commit | Codex/Devinson | Yes | In progress | Week 5 changes are committed and pushed with visible campaign-period history |
| Repo visibility | Devinson | Yes | Check before submit | GitHub repo is public and README explains how to run/use the agent |
| Hosted deploy | Codex/Devinson | Yes | Done | Live app includes `/week5-proof` and Week 5 UI changes |
| Hosted smoke test | Codex | Yes | Done | Public URLs return the expected proof pages/API JSON |
| 90-day hosting commitment | Devinson | Yes | Needs commitment | Vercel/app remains available until at least 2026-09-19 if submitted on 2026-06-21 |
| Submission form | Devinson | Yes | Not done | All required public/private fields are filled and terms accepted |
| Project image | Codex/Devinson | Recommended | Done | `output/week5-proof-assets/week5-proof.png` exists as a tile candidate |
| Short demo video | Devinson/Codex | Recommended | In progress | 90-120 second walkthrough is ready and should be recorded now |

## Order of operations

### 1. Lock the technical proof

Run:

```bash
npm run hedera:agent-check
npm run build
npm run hedera:agent-lab-proof
npm run hedera:nft-studio-proof
```

Expected result:

- Agent Kit v4 is detected.
- `MaxRecipientsPolicy`, `RejectToolPolicy`, and HCS audit hook evidence are present.
- Domain policy scenarios pass.
- HBAR/USDC x402 proof fields are present.
- Wallet-funded USDC allowance proof is present.
- Agent Lab and NFT Studio proof artifacts pass.

Current validation status captured on 2026-06-20:

- `npm run hedera:agent-check`: ✅
- `npm run build`: ✅
- `npm run hedera:agent-lab-proof`: ✅
- `npm run hedera:nft-studio-proof`: ✅
- `npm run hedera:usdc-allowance-proof`: ✅ (dry-run)
- `npm run hedera:x402-settlement-proof`: ✅ (dry-run)

Execution status for this lane:

- Step 1 completed locally and remotely (all proof checks above passed in this run).

### 2. File the required feedback issue

Use this template:

https://github.com/hashgraph/hedera-agent-kit-js/issues/new?template=agent_kit_feedback.yml

Suggested title:

> Agent Kit policy docs should show a full payment-policy example with custom app policy plus built-in hooks

Suggested body:

> While building a policy-constrained HBAR recovery agent, the built-in `MaxRecipientsPolicy` and `RejectToolPolicy` were easy to attach, but the docs could use a complete end-to-end example showing how to combine official HAK policies with app-specific business policy checks. The missing bridge is a pattern for "domain policy says this action is allowed" plus "Agent Kit policy constrains the core transfer tool" plus "receipt exposes which layer blocked or allowed execution." A short sample with `context.hooks`, a payment tool, a rejected destructive tool, and a receipt-friendly policy result would make bounty builds and production audits clearer.

Save the final issue URL. The submission form requires it.

### 3. Capture review assets

Run:

```bash
node scripts/capture-week5-demo-assets.mjs --base-url=https://yourturn-sage.vercel.app --serial=193 --role=guestA --out=output/week5-proof-assets
```

Expected outputs:

- `output/week5-proof-assets/cover-home.png`
- `output/week5-proof-assets/02-my-bookings.png`
- `output/week5-proof-assets/01-resale-recovery.png`
- `output/week5-proof-assets/week5-proof.png`
- `output/week5-proof-assets/week5-proof-json.png`
- `output/week5-proof-assets/04-x402-json.png`
- `output/week5-proof-assets/05-wallet-budget-json.png`
- `output/week5-proof-assets/06-nft-studio-json.png`

Recommended tile image:

- `output/week5-proof-assets/week5-proof.png`

Execution status for this lane:

- Step 3 is done.

### 4. Commit and push

Commit message:

```text
feat: add Hedera Week 5 policy agent proof
```

Before pushing, make sure unrelated/private files are not accidentally included. The current Week 5 submission-relevant files are:

- `lib/hedera-agent-kit/*`
- `lib/x402/*`
- `lib/nft-studio/*`
- `lib/agent/concierge-humanize.ts`
- `components/concierge/RecoveryConciergePanel.tsx`
- `components/wallet/WalletBudgetConnector.tsx`
- `app/api/agent/week5-proof/*`
- `app/api/x402/*`
- `app/api/wallet-budget/*`
- `app/api/nft-studio/*`
- `app/week5-proof/*`
- `scripts/*agent*`, `scripts/*x402*`, `scripts/*nft-studio*`, `scripts/*usdc-allowance*`
- `docs/HEDERA-AI-BOUNTY-WEEK5-POLICY-AGENT.md`
- `docs/HEDERA-WEEK5-FINAL-STEPS.md`
- `docs/agent-lab/*`
- `docs/DEMO.md`
- `docs/UI-MAP.md`
- `README.md`

Do not include unrelated funding/business-plan drafts unless they are intentionally public.

Execution status for this lane:

- Step 4 is ready once you confirm final issue and commit.

### 5. Deploy the latest commit

Deploy to the public app URL:

```text
https://yourturn-sage.vercel.app
```

Smoke-test these public URLs after deploy:

```text
https://yourturn-sage.vercel.app/week5-proof
https://yourturn-sage.vercel.app/api/agent/week5-proof
https://yourturn-sage.vercel.app/api/nft-studio/proof
https://yourturn-sage.vercel.app/api/x402/recovery-policy
https://yourturn-sage.vercel.app/api/wallet-budget/config
https://yourturn-sage.vercel.app/resale/<any-held-serial>?mode=recovery
```

The live demo URL should be the hosted app. A video URL can be included as an additional resource or demo support.

Execution status for this lane:

- Step 5 is already live and smoke-tested on the submitted deployment.

### 6. Record the short demo (required for best score)

Target length: **90-120 seconds**.

Demo path is browser-only (no terminal required during recording): `/week5-proof`, `/resale/<serial>?mode=recovery`, API tabs.

Primary demo flow:

1. Start on the human problem: Person A cannot attend a booked service.
2. Show provider policy: resale/refund is allowed only under rules.
3. Show Concierge in the app: "someone else can take my spot" or "give it back."
4. Show policy preview: holder check, provider rule, budget, approval required.
5. Show explicit approval and receipt.
6. Show `/week5-proof`: Agent Kit policies, HBAR/USDC, x402, WalletConnect allowance, Agent Lab, NFT Studio.
7. Close with HashScan/Mirror proof and the safety boundary.

For judges: use the exact no-terminal route in:

- `docs/HEDERA-WEEK5-DEMO-SCRIPT.md`

Say this boundary once:

> This is Hedera testnet value movement with explicit approval or bounded pre-authorized allowance. It is not raw autonomous private-key custody.

Execution status for this lane:

- Step 6 is ready: use `docs/HEDERA-WEEK5-DEMO-SCRIPT.md` as the final take script.
- Use one continuous 90-120 second take and finish on `/week5-proof` + `/api/agent/week5-proof`.

### 7. Fill the submission form

Use `docs/HEDERA-AI-BOUNTY-WEEK5-POLICY-AGENT.md` as the source of truth for public copy.

Required fields to fill manually:

- Project name: `YourTurn Concierge`
- Your public display name
- First name
- Last name
- Country of residence
- Email address
- Optional contact
- Bounty: `Week 5: Hedera Policy Agent`
- Project description
- Project summary
- GitHub repository URL
- Demo URL: hosted app URL
- Wallet address for payout
- Implementation details
- Feedback issue URL
- Project images
- Additional resources
- Terms acceptance

Recommended additional resources:

- `/week5-proof`
- `/api/agent/week5-proof`
- `/api/nft-studio/proof`
- `docs/HEDERA-AI-BOUNTY-WEEK5-POLICY-AGENT.md`
- `docs/agent-lab/YOURTURN-CONCIERGE-AGENT-LAB.md`
- `docs/ethglobal-nyc-2026/HEDERA-AGENT-KIT-INTEGRATION.md`
- `docs/TX-LOG.md`

## Final claim language

Use:

> YourTurn Concierge is a Hedera Policy Agent that helps a customer recover value from a booked service slot only when provider policy, holder state, budget, and explicit approval all pass.

Avoid:

- "Fully autonomous wallet custody."
- "Production fiat refunds."
- "Every app action is an Agent Kit BaseTool."
- "OpenClaw ACP is live."
- "USDC is a production fiat onramp."

## Final blocker checklist

Do not submit if any of these are still missing:

- Feedback issue URL.
- Public repo URL with Week 5 commit pushed.
- Hosted app URL with latest Week 5 build.
- Successful public smoke test of `/week5-proof`.
- Payout wallet address.
- Acceptance of terms and eligibility.
- 90-day hosting commitment.
