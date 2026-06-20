# Hedera AI Bounty Week 5: Policy Agent Readiness

Status: candidate, strong chance after the 2026-06-19 policy-runtime update.

Live bounty source: https://ai-bounties.hedera.com/

Agent Kit policy docs:

- https://docs.hedera.com/solutions/ai/agent-kit/hooks-and-policies
- https://docs.hedera.com/solutions/ai/agent-kit/js/create-hooks-and-policies
- https://docs.hedera.com/solutions/ai/agent-kit/js/quickstart

## Bounty facts

- Bounty: Week 5, Hedera Policy Agent.
- Public prompt: implement a policy using Hedera Agent Kit Hooks and Policies that constrains agent behavior while still enabling payments in HBAR or USDC.
- Example policy themes: spend limits, allowed counterparties, contextual approval logic, runtime enforcement.
- Preferred use case shape: agents purchase real services or APIs, with policy clearly integrated into the interface and execution flow.
- Required submission assets: public GitHub repository, Hedera Agent Kit JS or Python, live demo agent URL, hosted URL available for at least 90 days after submission, AI Studio feedback link.
- Payout: $1,500 in HBAR.
- Final deadline shown on the live bounty page: Sunday, 2026-06-21 at 23:59 UTC.

## Fit decision

Submit as:

> YourTurn Concierge: a policy-constrained recovery agent for booked service slots.

The agent does not buy an abstract API credit. It helps a real service customer recover value when they cannot attend a booked session. The policy layer decides whether the agent may create a resale recovery listing, schedule a small recovery-payment proof, or release the pass and send a testnet HBAR refund.

This is a better fit than a generic wallet agent because the policy is load-bearing:

- the actor must be the live holder of the booking right
- the slot must still be held
- the provider's booked-time policy must allow resale or release
- duplicate active listings are blocked
- refund value must match booked price
- value-moving confirms require explicit approval
- scheduled recovery proof is budget-gated
- official Hedera Agent Kit policies block multi-recipient transfers and destructive tools

## Current implementation evidence

| Requirement | Status | Evidence |
| --- | --- | --- |
| Public GitHub repository | ready if repo is public at submission time | README and public reviewer docs already exist |
| Hedera Agent Kit | live | `@hashgraph/hedera-agent-kit` v4, `lib/hedera-agent-kit/runtime.ts`, `npm run hedera:agent-check` |
| Hooks and Policies | live after 2026-06-19 update | runtime context now attaches `MaxRecipientsPolicy(1)` and `RejectToolPolicy([...])` |
| Payments in HBAR or USDC | live for HBAR; live allowance for HTS/USDC | refund/release sends real testnet HBAR; x402 HBAR settlement is proven; wallet-funded HTS/USDC allowance is proven |
| Runtime policy integration | live | official HAK policies plus YourTurn domain policy checks are both verifier-covered |
| Interface/execution flow | live | app recovery flow and Telegram Concierge use preview -> approval -> confirm -> receipt |
| Live demo URL | existing | https://yourturn-sage.vercel.app |
| 90-day availability | needs owner commitment | Vercel project must stay deployed until at least 2026-09-19 if submitted on 2026-06-21 |
| Feedback link | required, done | https://github.com/hashgraph/hedera-agent-kit-js/issues/940 |
| x402 | HBAR and USDC settlement live | `/api/x402/recovery-policy` exposes Hedera exact requirements for HBAR and HTS/USDC; both settlement paths succeeded through Blocky402 |
| Wallet-funded autonomy | live allowance proof + optional browser approval path | Agent Kit runtime includes allowance tools and policy budget support; Guest A approved a bounded 5 USDC allowance; Concierge panel can request a connected wallet signature through WalletConnect/Reown |
| Hedera WalletConnect / Reown | optional product path | `WalletBudgetConnector` connects through Reown and asks the user wallet to sign an HTS/USDC allowance transaction prepared by `/api/wallet-budget/allowance-request` |
| Agent Lab | reviewer artifact | `docs/agent-lab/yourturn-concierge-agent-lab.ts` mirrors the Concierge policy-agent shape for Agent Lab inspection |
| NFT Studio | reviewer artifact + metadata proof | `/api/nft-studio/proof` and `npm run hedera:nft-studio-proof` generate HIP-412-style booking-right metadata and token-control risk review |
| No-terminal reviewer proof | live | hidden `/week5-proof` page and `/api/agent/week5-proof` JSON bundle expose the policy/runtime/payment evidence without adding this to product navigation |

## What changed for Week 5

`lib/hedera-agent-kit/runtime.ts` now exposes official Hedera Agent Kit policy hooks in the Agent Kit runtime context:

- `MaxRecipientsPolicy(1)` constrains core transfer and airdrop tools to one recipient.
- `RejectToolPolicy` blocks destructive or out-of-scope tools such as account deletion, topic deletion/update, schedule deletion, allowance deletion, dissociation, and token update.
- `HcsAuditTrailHook` is attached to Agent Kit value-moving tools when an app audit topic exists, so the Agent Kit tool surface can write official HCS audit entries without replacing the product's existing lifecycle messages.

`scripts/hedera-agent-check.mjs` now fails unless:

- `MaxRecipientsPolicy` is present in runtime context
- `RejectToolPolicy` is present in runtime context
- `RejectToolPolicy` blocks a destructive account tool
- `MaxRecipientsPolicy` blocks a multi-recipient HBAR transfer

The existing YourTurn policy layer remains the business policy:

- `lib/hedera-agent-kit/policies.ts` checks holder, slot state, provider policy, duplicate listing, approval, refund amount, schedule serial, and budget.
- `lib/hedera-agent-kit/budget.ts` implements the demo-funded HBAR budget check.
- `lib/hedera-agent-kit/tool-manifest.ts` declares the agent tools, mutations, approval requirements, policy gates, and proof outputs.

Additional 2026-06-19 odds-booster work:

- `lib/x402/hedera.ts` defines Hedera exact x402 payment requirements for HBAR and HTS/USDC.
- `app/api/x402/recovery-policy/route.ts` exposes a real `402 Payment Required` endpoint for paid recovery-policy quotes.
- Agent Kit runtime now discovers token allowance approval and fungible-token transfer-with-allowance tools.
- `lib/hedera-agent-kit/budget.ts` represents both live server HBAR budgets and configured wallet-funded HTS/USDC allowance budgets.
- Agent Kit runtime now attaches the official `HcsAuditTrailHook` to value-moving Agent Kit tools when the app audit topic exists.
- `scripts/hedera-usdc-allowance-proof.mjs` can create a real HTS/USDC wallet allowance after explicit operator approval.
- `scripts/x402-hedera-settlement-proof.mjs` can create a signed x402 payment payload and retry the paid endpoint after explicit operator approval.
- `npm run hedera:agent-check` verifies HBAR x402 requirements, USDC x402 requirements, configured USDC allowance policy, and token allowance tool discovery.
- `/week5-proof` and `/api/agent/week5-proof` package the same Week 5 evidence for reviewers who should not need a terminal during the live demo.
- `components/wallet/WalletBudgetConnector.tsx`, `/api/wallet-budget/config`, and `/api/wallet-budget/allowance-request` add the optional in-app WalletConnect/Reown path for user-signed USDC allowance budgets.
- `docs/agent-lab/yourturn-concierge-agent-lab.ts` packages a judge-readable Agent Lab companion version of the Concierge agent.
- `lib/nft-studio/booking-rights.ts`, `/api/nft-studio/proof`, and `scripts/nft-studio-proof.mjs` generate NFT Studio-ready booking-right metadata and token-control risk evidence.

Live proof captured on 2026-06-19:

- HBAR x402 settlement: payer `0.0.8504405`, facilitator tx `0.0.7162784@1781897754.732455686`, network `hedera:testnet`.
- USDC x402 settlement: payer `0.0.8504405`, facilitator tx `0.0.7162784@1781898426.444560516`, asset `0.0.429274`, amount `10000` atomic units, network `hedera:testnet`.
- USDC owner association: Guest A `0.0.8504405`, token `0.0.429274`, tx `0.0.8504405@1781897764.902633681`, status `SUCCESS`.
- USDC spender association: Treasury `0.0.8504300`, token `0.0.429274`, tx `0.0.8504300@1781897767.326794048`, status `SUCCESS`.
- USDC allowance: owner `0.0.8504405`, spender `0.0.8504300`, token `0.0.429274`, amount `5 USDC`, tx `0.0.8504405@1781897770.436631261`, status `SUCCESS`.

## Verification

Run:

```bash
npm run hedera:agent-check
npm run build
npm run hedera:agent-lab-proof
npm run hedera:nft-studio-proof
npm run hedera:usdc-allowance-proof
npm run hedera:x402-settlement-proof
```

Latest local result on 2026-06-19:

- `npm run hedera:agent-check`: passed
- `npm run build`: passed
- `npm run hedera:agent-lab-proof`: pass after Week 5 booster work
- `npm run hedera:nft-studio-proof`: pass after Week 5 booster work when Redis/token env is available

The checker output includes:

- `agentKitVersion: 4.0.0`
- runtime tools: `transfer_hbar_tool`, `transfer_hbar_with_allowance_tool`, `approve_hbar_allowance_tool`, `submit_topic_message_tool`, `yourturn_budget_inspect`, `yourturn_manifest_describe`
- HAK hooks/policies: `Max Recipients Policy`, `Reject Tool Call`, and `HCS Audit Trail Hook` when an app audit topic exists
- domain policy scenarios: valid listing, valid refund, non-holder blocked, resale-disabled blocked, duplicate listing blocked, budget overflow blocked
- x402 requirements: HBAR and HTS/USDC over Hedera exact
- wallet-budget scenario: configured USDC allowance budget passes policy inspection

Dry-run proof commands:

```bash
npm run hedera:usdc-allowance-proof
npm run hedera:x402-settlement-proof -- --asset=HBAR
```

Live allowance proof, after explicit operator approval:

```bash
npm run hedera:usdc-allowance-proof -- --associate-owner --associate-spender --execute
```

Live x402 HBAR settlement proof, after the payer account is funded and the server is started with settlement enabled:

```bash
HEDERA_X402_SETTLEMENT_ENABLED=true npx next dev -p 3015
npm run hedera:x402-settlement-proof -- --asset=HBAR --execute
```

USDC x402 settlement additionally requires the payer to hold Hedera testnet USDC. Guest A and Treasury are already associated with token `0.0.429274`; the live proof above used Circle faucet-funded testnet USDC.

## Submission positioning

One-line description:

> YourTurn Concierge is a Hedera Policy Agent that helps a customer recover value from a booked service slot only when provider policy, holder state, budget, and explicit approval all pass.

Short summary:

> A provider sets recovery rules for a booked service slot. When Person A cannot attend, YourTurn Concierge previews policy-valid recovery options, blocks invalid actions, requires scoped human approval or a pre-authorized allowance budget, and then executes a Hedera-backed action. The listing path creates a budget-gated Schedule Service payment proof; the release path sends a real testnet HBAR refund, returns/closes the booking right, and writes HCS proof. Hedera Agent Kit v4 is used for the runtime tool surface, official policy hooks, allowance tooling, and reviewer-verifiable constraints. The Week 5 build also exposes a Hedera x402 exact payment-required endpoint for HBAR and HTS/USDC recovery-policy quotes, an optional Hedera WalletConnect/Reown allowance flow, plus Agent Lab and NFT Studio proof artifacts.

Implementation details:

> The Next.js app uses `@hashgraph/hedera-agent-kit` v4 with a YourTurn plugin plus selected core tools. The Agent Kit runtime configures official `MaxRecipientsPolicy(1)`, `RejectToolPolicy`, and `HcsAuditTrailHook` support, HBAR allowance tools, token allowance tools, and fungible-token transfer-with-allowance discovery. The product-specific policy layer checks live holder state, booked-time provider policy, no duplicate listings, refund amount, explicit approval or configured allowance budget, schedule reference, and HBAR/HTS budget limits. Value-moving HBAR paths run through server-side Hedera SDK routes and return `agentProof` receipts with policy checks, approval id, tx ids, schedule ids, HCS audit tx ids, and HashScan links. `/api/x402/recovery-policy` returns Hedera x402 exact payment requirements for HBAR and HTS/USDC. `/api/wallet-budget/allowance-request` prepares the bounded USDC allowance transaction for a connected Hedera wallet to sign through WalletConnect/Reown. Agent Lab and NFT Studio companion artifacts make the same policy-agent and HTS NFT metadata story inspectable outside the app. The verifier commands prove the manifest, runtime policies, blocked scenarios, HCS-14 identity, allowance tooling, x402 requirements, capability descriptors, Agent Lab packet, and NFT metadata/risk packet.

## Submission form map

Use this as the form-fill source of truth. Replace private/payout fields manually.

| Field | Value |
| --- | --- |
| Project name | `YourTurn Concierge` |
| Your name | `Devinson Peña` or preferred public display name |
| First name | private payout record |
| Last name | private payout record |
| Country of residence | private payout record |
| Email address | private contact |
| Other contact | optional Discord, X, Telegram, or GitHub |
| Bounty | `Week 5: Hedera Policy Agent` |
| Project description | `A Hedera Policy Agent that helps a customer recover value from a booked service slot only when provider policy, holder state, budget, and explicit approval all pass.` |
| Project summary | Use the `Short summary` paragraph above. |
| GitHub repository URL | public repo URL after pushing this Week 5 commit |
| Demo or social-media URL | `https://yourturn-sage.vercel.app` or an X demo video URL |
| Wallet address | private payout wallet, Hedera account id preferred if the form accepts `0.0.x` |
| Implementation details | Use the `Implementation details` paragraph above. |
| Feedback link | https://github.com/hashgraph/hedera-agent-kit-js/issues/940 |
| Project images | 1 tile image plus up to 5 supporting images from the policy/demo flow |
| Additional info | Suggested: verifier commands, HashScan proof links, `/.well-known/agent.json`, `/api/agent/capabilities`, and the Week 5 readiness doc |
| Additional resources | Suggested: `/week5-proof`, `/api/agent/week5-proof`, `/api/nft-studio/proof`, `docs/HEDERA-AI-BOUNTY-WEEK5-POLICY-AGENT.md`, `docs/agent-lab/YOURTURN-CONCIERGE-AGENT-LAB.md`, `docs/ethglobal-nyc-2026/HEDERA-AGENT-KIT-INTEGRATION.md`, `docs/TX-LOG.md` |

## Probability boosters

Do these before submitting, in order:

1. Feedback issue is already created: https://github.com/hashgraph/hedera-agent-kit-js/issues/940.
2. Push a clean Week 5 commit so Git history clearly shows the policy-agent work happened during the bounty period.
3. Confirm the GitHub repo is public and the live deployment points at the branch/commit containing the Week 5 HAK policy update.
4. Record a short demo if there is any doubt about the live site path. The recording should show policy first, transaction second:
   - provider policy visible
   - Person A as holder
   - invalid action blocked or verifier output showing block
   - valid recovery preview
   - explicit approval
   - HBAR/schedule proof receipt
   - Agent Kit proof/policy checks
5. Add one tile image that visually says "policy agent" rather than generic booking app. Best tile: proof receipt with policy checks + HBAR proof visible.
6. Keep claim language tight: live HBAR movement; live HBAR/USDC x402 settlement proof; bounded wallet-funded allowance autonomy through explicit wallet approval, not raw autonomous private-key signing.
7. Run final commands and paste their result in the submission notes or additional resources:

```bash
npm run hedera:agent-check
npm run build
```

## Remaining gaps to close

| Gap | Why it matters | Close path |
| --- | --- | --- |
| Feedback issue submitted | required form field | https://github.com/hashgraph/hedera-agent-kit-js/issues/940 |
| Public repo URL not confirmed in this packet | required form field and git-history criterion | Push the Week 5 commit to the public repo; verify GitHub shows the policy-runtime commit. |
| Demo freshness not proven today | judges may see old ETHGlobal flow instead of Week 5 policy flow | Either deploy this commit and test the live site, or record an X demo tied to this commit. |
| Project images missing | first image is public tile and affects click-through | Capture 1 strong tile image plus 2-3 proof-flow images. |
| 90-day hosting commitment | explicit requirement | Keep Vercel live until at least 2026-09-19 if submitted on 2026-06-21. |
| Git history criterion | submission requires evidence that submitted agentic features were created during the bounty program | Make the Week 5 HAK policy wiring and docs a visible commit with a clear message. |
| Hosted deployment not refreshed with Week 5 booster branch | live judges need the WalletConnect, Agent Lab links, NFT proof API, and proof page from this commit | Deploy this branch and smoke `/week5-proof`, `/api/agent/week5-proof`, and `/api/nft-studio/proof` on the hosted URL. |

## Feedback issue candidates

File one concise feedback issue before submission. Best issue:

Title:

> Agent Kit policy docs should show a full payment-policy example with custom app policy plus built-in hooks

Body:

> While building a policy-constrained HBAR recovery agent, the built-in `MaxRecipientsPolicy` and `RejectToolPolicy` were easy to attach, but the docs could use a complete end-to-end example showing how to combine official HAK policies with app-specific business policy checks. The missing bridge is a pattern for "domain policy says this action is allowed" plus "Agent Kit policy constrains the core transfer tool" plus "receipt exposes which layer blocked or allowed execution." A short sample with `context.hooks`, a payment tool, a rejected destructive tool, and a receipt-friendly policy result would make bounty builds and production audits clearer.

## Honest gaps

- USDC is integrated as a configured HTS/USDC policy budget, an optional wallet-signed allowance path, and proven x402 settlement; it is not a user-facing fiat/onramp.
- Wallet-funded budgets are bounded by allowance policy metadata and Agent Kit allowance tools; the browser path still requires an explicit connected-wallet signature.
- The user-facing app has policy receipts, but the official HAK policies are mainly verifier/runtime guardrails around the Agent Kit tool surface; do not claim every app route is a BaseTool.
- OpenClaw ACP remains descriptor-only.
- x402 payment requirements are live and both HBAR/USDC settlement paths have been verified on testnet; hosted repeated settlement should stay disabled unless the payer remains funded.
- Do not claim raw fully autonomous private-key signing. Claim bounded autonomy after pre-authorization and within policy.
- Keep hosted deployment stable for 90 days after submission.

## Chance assessment

Chance: real, but not automatic.

Before the 2026-06-19 update, this was a good agentic-payment project but a weaker Week 5 policy submission because the policies were mostly custom app logic. After wiring official HAK policies into runtime and verifying them, the project has a credible Week 5 angle.

Best winning angle:

- narrow real-world service recovery use case
- visible provider/user policy
- HBAR movement already proven on testnet
- USDC/HTS and x402 payment requirements visible in the agent surface, with HBAR x402 settlement proven
- allowance-funded autonomy represented without unsafe key custody, with a live 5 USDC allowance transaction
- official HAK runtime policies
- receipt-level policy proof
- honest approval and budget boundaries

Main thing that can still lose it:

- if judges expect a fresh purpose-built policy demo rather than a prior ETHGlobal project adapted for Week 5
- if the feedback issue is missing
- if the demo does not visibly show the policy layer before the transaction proof
