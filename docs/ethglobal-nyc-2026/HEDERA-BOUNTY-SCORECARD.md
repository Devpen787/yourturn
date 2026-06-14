# Hedera Bounty Scorecard

Last scored: 2026-06-14 after live Telegram listing/refund proofs and final E2E regression.

Scale: 1-10. A score of 10 means the track requirement is met with live product state, public proof, a clear user story, and a repeatable verifier path. Scores are not prize predictions.

## Summary

| Hedera track | Current score | Status | Why |
| --- | ---: | --- | --- |
| Autonomous On-Chain Automation Platform | 9.2 / 10 | Strong live claim | A user-facing recovery flow creates a Hedera Schedule Service payment proof after human approval; Telegram and in-app flows expose the action; schedule `0.0.9228236` executed on testnet. |
| AI & Agentic Payments on Hedera | 9.0 / 10 | Strong live claim | YourTurn Concierge has an Agent Kit runtime/manifest, HCS-14 identity, policy checks, approval gates, budget checks, Telegram transport, live recovery listing, and a real testnet HBAR refund/release. |
| No Solidity Allowed | 9.4 / 10 | Strong live claim | The implementation uses Hedera SDK/native services: HTS, HCS, Schedule Service, Mirror Node, HashScan, and Agent Kit. No Solidity is used for the new proof path. |
| Tokenization on Hedera | 8.0 / 10 | Supporting claim | Booking rights are HTS NFT serials with lifecycle operations: book, list, resell, release/refund, close/burn. This is real, but the hackathon delta is stronger for automation and agentic payments than for a new tokenization category. |

## Live Evidence

Facts:

- Telegram preview command worked for booking `193`.
- Telegram `approve listing ref 193` created an active resale listing.
- Telegram `approve refund ref 194` sent an `18` HBAR testnet refund and closed the booking right.
- Schedule `0.0.9228236` executed on Hedera testnet.
- Receipt `bc9155e7-17dd-451d-8f4f-1ba56e4fb99f` proves the listing path.
- Receipt `143c5cee-8d08-468d-9f6e-d4f349857a08` proves the refund/release path.
- `npm run hedera:agent-check` verifies the agent manifest, policy gates, runtime adapter, HCS-14 identity, A2A descriptor, OpenClaw/x402 claim boundaries, and budget overflow block.
- `npm run ethglobal:e2e` passed after screenshot capture and produced fresh regression proof for serials `196`, `197`, and `198`.

Primary proof links:

- Telegram listing audit: `0.0.8504300@1781403839.479174338`
- Telegram schedule create: `0.0.8504300@1781403839.567406004`
- Telegram scheduled execution: `0.0.8504300-1781403839-567406004`
- Telegram refund/release: `0.0.8504300@1781404315.316217004`
- Telegram refund close/burn: `0.0.8504300@1781404320.752860402`
- Telegram refund audit: `0.0.8504300@1781404320.697190583`

Final regression proof:

- E2E schedule: `0.0.9228519`
- E2E scheduled execution: `0.0.8504300-1781406966-580404829`
- E2E refund/release: `0.0.8504300@1781406949.343880789`
- E2E listing receipt: `6351521d-13e2-4973-9d33-08eb521fa1ca`
- E2E refund receipt: `fb0e38dd-9ed8-4d93-9bd8-82abbaa8f7aa`

## Track Notes

### Autonomous On-Chain Automation Platform

Score: 9.2 / 10.

What is strong:

- User creates and approves recovery through product UI or Telegram.
- Hedera Schedule Service is load-bearing, not decorative.
- The receipt stores schedule id, create tx, execution tx, policy checks, and agent proof.
- Provider dashboard and recovery page can inspect schedule proof.

Why not 10:

- The scheduled action is a small recovery payment proof, not the full future production automation surface for all owner policies.
- Time/condition policy editing is still demo-shaped.

### AI & Agentic Payments on Hedera

Score: 9.0 / 10.

What is strong:

- Concierge has identity, tools, policy gates, explicit approval, and proof receipts.
- Telegram makes the agent loop legible to judges.
- Real HBAR value moved on testnet after policy and approval.
- Agent proof shows the selected tool and policy checks.

Why not 10:

- OpenClaw ACP and x402 are honest descriptor-only, not live gateway/facilitator runtimes.
- Budget is server-enforced for the demo, not wallet-funded by a user allowance.

### No Solidity Allowed

Score: 9.4 / 10.

What is strong:

- HTS, HCS, Schedule Service, Mirror Node, HashScan, and SDK-native flows are used.
- No Solidity was added for the hackathon delta.
- The user-visible flow combines multiple native Hedera services.

Why not 10:

- The project also has a broader web app surface, so the demo must keep the native Hedera proof front and center.

### Tokenization on Hedera

Score: 8.0 / 10.

What is strong:

- Booking slots are tokenized as HTS NFTs.
- The hackathon work added stronger lifecycle behavior around resale, release/refund, and burn.
- Owner policy snapshots and royalties make the token lifecycle understandable.

Why not 10:

- Tokenization is not the most differentiated new weekend claim compared with Automation and Agentic Payments.
- The project does not add a new token class, oracle-backed real-world asset, or deep compliance surface for this track.

## Decision

Primary Hedera story:

1. Autonomous On-Chain Automation Platform
2. AI & Agentic Payments on Hedera
3. No Solidity Allowed

Supporting story:

- Tokenization on Hedera

## Next Improvement Before Final Pack

- Record/upload the optional 2-4 minute demo video.
- Add the final deployed URL once available.
