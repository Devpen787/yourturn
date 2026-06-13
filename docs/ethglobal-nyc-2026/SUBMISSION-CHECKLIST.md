# ETHGlobal NYC 2026 submission checklist

Status: working checklist.

Deadline: Sunday, 2026-06-14 at 09:00 EDT.

Official event page checked: https://ethglobal.com/events/newyork2026

Submission dashboard: https://ethglobal.com/events/newyork2026/home

## Must submit

- project title
- project description
- public GitHub repository link
- selected Continuity Track
- partner prize selection
- clear old-vs-new work disclosure
- demo video, ideally 2-4 minutes and always <=5 minutes for Hedera prize requirements
- setup and usage README
- proof links and testnet artifacts

## Continuity disclosure

Include this structure in the README or submission:

| Area | Pre-existing | New during ETHGlobal NYC 2026 |
| --- | --- | --- |
| Base app | Next.js YourTurn booked-rights app | Concierge recovery feature |
| Hedera | HTS booking rights, HCS topic, Mirror reads, resale royalty, freeze/use flows | New Concierge recovery receipt, booked policy snapshot, Schedule Service payment proof, real testnet HBAR refund/release, and Agent Kit-guided trace |
| Agent API | Read/preview/approval/confirm endpoints exist | In-app Concierge recovery loop and bounded agent trace |
| Automation | Not present in the base app | Schedule Service schedule/execution proof for approved recovery payment |
| Telegram | Not present in the base app | Webhook command adapter with fixture-tested mutation guard; live bot credentials still optional |
| Docs | Existing demo/spec/architecture docs | This continuity packet, updated README/submission/video script |

## Required proof before submit

- [ ] Fresh commit boundary or tag that marks pre-existing state.
- [ ] Commit history shows incremental event work, not one giant dump.
- [ ] Public repo URL is ready.
- [ ] README explains setup, architecture, old-vs-new, and Hedera proof.
- [ ] `npm run lint` passes or failure is documented.
- [ ] `npm run build` passes or failure is documented.
- [ ] `npm run test --if-present` passes or failure is documented.
- [ ] `npm run ethglobal:e2e` passes from a clean reset or any failure is documented.
- [ ] Demo can be run from reset state.
- [ ] In-app Concierge surface works from a clean demo account; Telegram fixture passes and any live Telegram claim has a real allowlisted bot test.
- [ ] Agent action trace is visible or exported.
- [ ] Hedera tx proof exists for the new action.
- [ ] HCS event proof exists for the new action.
- [ ] Mirror/HashScan link opens.
- [ ] If claiming Automation, a Schedule Service schedule id and executed tx id exist.
- [ ] Demo video recorded and uploaded.
- [ ] Submission description does not claim Classic / From Scratch.
- [ ] Final video was recorded after the integration scenario worked end to end.

## Demo video outline

Target length: 2-4 minutes.

1. 15 seconds: problem and continuity disclosure.
2. 30 seconds: show base booked-right state and provider policy.
3. 45 seconds: customer uses in-app Concierge after saying they cannot make it.
4. 45 seconds: Concierge checks booked policy and shows preview.
5. 30 seconds: customer approves.
6. 30 seconds: Hedera operation executes and proof link appears.
7. 30 seconds: provider/proof view shows changed lifecycle.
8. 15 seconds: old-vs-new and selected Hedera tracks.

## Recommended selected prize strategy

Partner 1: Hedera.

Hedera track focus:

- Automation if Schedule Service is real.
- AI & Agentic Payments if the agent executes a Hedera financial/token/lifecycle operation.
- No Solidity if the feature stays SDK-only and uses HTS/HCS/Mirror/Schedule.
- Tokenization only as secondary/supporting if the new work changes token lifecycle.

Do not add two more partner prizes unless they are genuinely in the proof path. Extra sponsor clutter will weaken the story.

## Final submission copy draft

Title:

> YourTurn Concierge

Description:

> YourTurn Concierge is a continuity feature for YourTurn, a Hedera-backed booked-rights app. When a customer cannot attend a paid service slot, they open Concierge from their pass. Concierge reads the booking right, checks the provider policy snapshot, recommends a policy-valid recovery action, asks for explicit approval, creates a resale listing with a scheduled Hedera recovery payment or executes a real testnet HBAR refund/release, and returns proof through HCS, Mirror, HashScan, and an Agent Kit-guided trace.

Old-vs-new note:

> The base YourTurn app existed before ETHGlobal NYC 2026 with HTS booking rights, HCS lifecycle messages, Mirror reads, resale royalties, freeze/unfreeze, mark-used, and agent-safe API boundaries. During ETHGlobal NYC 2026 we added the Concierge recovery loop, owner policy snapshots, Schedule Service automation proof, real testnet refund/release proof, Telegram webhook adapter, Agent Kit-guided trace, and new Hedera proof for the selected recovery action.
