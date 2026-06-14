# Hedera bounty map

Status: live-checked summary for ETHGlobal NYC 2026.

Checked on: 2026-06-13.

Official source: https://ethglobal.com/events/newyork2026/prizes/hedera

## Hedera prize set

Hedera pool: $15,000.

| Track | Amount | Current fit | What must be true for YourTurn |
| --- | ---: | --- | --- |
| AI & Agentic Payments on Hedera | $6,000 | Strong with current Concierge recovery proof | Agent or multi-agent system executes at least one payment, token transfer, or financial operation on Hedera testnet. Current implementation uses a Hedera Agent Kit-guided Concierge trace, creates a scheduled HBAR recovery payment proof after explicit human approval, and executes a real testnet HBAR refund/release path. Public repo, README, <=5 minute demo video. |
| Tokenization on Hedera | $3,000 | Supporting fit | Use HTS to create/manage/interact with tokens on testnet and show at least one lifecycle operation. YourTurn already tokenizes booking rights; the new feature should add a new lifecycle operation, not just reuse old proof. |
| "No Solidity Allowed" - Build with Hedera SDKs | $3,000 | Strong baseline fit | Use JS/TS or Python SDK, no Solidity, at least two native Hedera services such as HTS + HCS, HTS + Scheduled Transactions, or HCS + Mirror Node. Public repo, README, <=5 minute demo video. |
| Autonomous On-Chain Automation Platform | $3,000 | Strongest continuity-specific target; live proof now exists | Continuity Track only. Use Hedera Schedule Service to create and execute scheduled transactions on testnet. Current implementation exposes preview/approval/inspect in `/resale/[serial]?mode=recovery` and has one executed scheduled payment proof. Public repo, README, <=5 minute demo video. |

## Recommended prize selection

ETHGlobal submission allows up to 3 Partner Prizes. Hedera counts as one partner even with multiple Hedera tracks. If the form allows selecting Hedera tracks under the partner, target these in priority order:

1. Autonomous On-Chain Automation Platform, only if Schedule Service is implemented and proven.
2. AI & Agentic Payments on Hedera, if Concierge executes a real Hedera financial/token/lifecycle action after a bounded approval flow.
3. "No Solidity Allowed" - Build with Hedera SDKs, if the new work remains SDK-only and uses at least two native services.
4. Tokenization on Hedera, only if the new feature changes token lifecycle, policy, fee, or transfer state.

Partner eligibility note: this is not about whether YourTurn can submit to ETHGlobal. It means whether Hedera's reviewers can judge the project for a specific prize track. We should only claim the Hedera tracks whose qualification requirements are visibly satisfied in the repo and demo.

## Fit analysis

Facts from this repo:

- `README.md` says the app uses HTS + HCS + Mirror Node REST and no Solidity.
- `docs/ARCHITECTURE.md` says API routes call `@hashgraph/sdk` server-side and HCS emits JSON lifecycle events.
- `docs/UI-MAP.md` lists agent-safe API routes for read, preview, confirm, and approval grants.
- `docs/SPEC.md` keeps the agent as a helper with no autonomous signing.
- `docs/ethglobal-nyc-2026/HEDERA-AGENT-KIT-INTEGRATION.md` defines the `yourturn-concierge` agent identity, Agent Kit runtime adapter, HCS-14 UAID, tool manifest, policy gates, budget gate, and verifier command.
- `npm run hedera:agent-check` validates the Agent Kit runtime, agent manifest, approval requirements, budget overflow block, protocol descriptors, policy scenarios, and bounty coverage locally.

Inferences:

- The base repo already fits No Solidity technically, but continuity judging needs event-built delta.
- AI & Agentic Payments is credible because the Concierge makes a bounded policy decision, asks for approval, and triggers real Hedera financial/token operations.
- Automation is now credible for the approved recovery payment path because the app creates a real Hedera Schedule Service schedule id and Mirror shows scheduled execution.
- Tokenization is a supporting story unless new work adds a meaningful lifecycle event beyond existing booking/resale/freeze/use flows.

Assumptions:

- Partner prize reviewers will accept Continuity Track projects for Hedera tracks if each selected track's requirements are met.
- A booking-right resale/list/release counts as a token or financial operation for the agentic track.
- A scheduled release, refund, or resale expiry would be an even cleaner automation story than the current scheduled recovery payment, but the current payment is tied to the approved recovery listing and is visible in the product receipt. A direct real refund/release path is also now implemented and tested for the agentic payments story.
- AgentOps/OpenClaw prior work gives us useful Telegram safety and approval patterns, but not a completed YourTurn execution bot.

## Kill conditions

Do not claim AI & Agentic Payments if:

- the agent only explains options
- the web app executes everything manually
- there is no visible agent trace or proof object

Do not claim Automation if:

- scheduling is simulated with app timers or cron only
- no Hedera Schedule Service schedule id is created
- no scheduled transaction executes on testnet

Do not claim Tokenization as new weekend work if:

- all token lifecycle proof predates the hackathon
- the new feature is only UI/copy around existing tokens

Do not claim No Solidity if:

- new work adds Solidity or EVM smart contracts as core execution
- native Hedera services are not in the new proof path

## Track claim rules

Claim Automation if:

- a real Hedera Schedule Service transaction is created and executed on testnet
- users can create, approve, and inspect the scheduled action in the product

Claim Agentic Payments if:

- the concierge performs a payment, transfer, or financial operation on Hedera after applying policy and approval
- the repo explains the agent role, tools, boundaries, and trace

Claim No Solidity if:

- the hackathon delta remains SDK-only
- at least two native Hedera services are visibly used in the flow

Claim Tokenization only if:

- the weekend work adds new HTS token creation, configuration, or lifecycle behavior, not only documentation around the pre-existing booking-right NFT

## Best Hedera proof bundle

Minimum:

- testnet token id
- topic id
- Concierge preview artifact
- approval grant artifact
- tx id from agent-assisted action
- HCS message id/hash for the agent-assisted lifecycle event
- Mirror/HashScan link showing resulting status

Strong:

- schedule id: `0.0.9227497`
- scheduled transaction execution tx id: `0.0.8504300-1781397488-488433669`
- executed timestamp: `1781397585.057210004`
- refund/release tx id: `0.0.8504300@1781397472.551738960`
- refund close/burn tx id: `0.0.8504300@1781397474.102316916`
- refund audit tx id: `0.0.8504300@1781397476.746514442`
- agent verifier: `npm run hedera:agent-check`
- Agent Kit runtime methods: `transfer_hbar_tool`, `approve_hbar_allowance_tool`, `transfer_hbar_with_allowance_tool`, `submit_topic_message_tool`, `yourturn_manifest_describe`, `yourturn_budget_inspect`
- HCS-14 UAID: generated by `lib/hedera-agent-kit/identity.ts`
- A2A/capabilities endpoints: `/.well-known/agent.json`, `/api/agent/capabilities`
- budget gate: `budget_allows_payment` blocks scheduled recovery payment when the demo budget is insufficient
- agent proof fields: `agentName`, `toolId`, `approvalId`, `policyChecks`, `proofOutputs`
- recovery page and provider dashboard showing scheduled/pending/executed state
- README or demo docs command that verifies the proof chain: `npm run ethglobal:e2e`

Current live evidence from the latest clean scripted pass:

- Script verifier: `npm run ethglobal:e2e`
- Schedule proof: [HashScan schedule 0.0.9227497](https://hashscan.io/testnet/schedule/0.0.9227497)
- Scheduled execution proof: [HashScan transaction 0.0.8504300-1781397488-488433669](https://hashscan.io/testnet/transaction/0.0.8504300-1781397488-488433669)
- Refund/release proof: [HashScan transaction 0.0.8504300-1781397472-551738960](https://hashscan.io/testnet/transaction/0.0.8504300-1781397472-551738960)
- Agent verifier: `npm run hedera:agent-check`
- Agent card: `GET /.well-known/agent.json`
- Agent capabilities: `GET /api/agent/capabilities`
- API verifier: `POST /api/automation/inspect` with `{ "actor": "guestB", "serial": 187 }`

## Mentor questions

Ask Hedera or ETHGlobal mentors before final submission:

1. Does a scheduled cancel/release or refund flow satisfy the Automation track if it schedules a token transfer or token-state operation?
2. For AI & Agentic Payments, is direct Hedera SDK usage by a bounded agent enough, or do they strongly prefer Hedera Agent Kit/OpenClaw/x402/A2A?
3. Does a booking-right resale/list/release qualify as a "financial operation" for the agentic track?
4. Can the same Continuity submission be considered for the non-continuity Hedera tracks if the new feature satisfies those requirements?
