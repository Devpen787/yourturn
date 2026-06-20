# YourTurn Concierge Agent Lab Packet

This packet is the Hedera Agent Lab companion artifact for the Week 5 Policy Agent submission.

Agent Lab is not the production host for YourTurn. The production app is the Next.js Concierge flow. This packet exists so reviewers can inspect a clean Agent Lab-shaped version of the same agent design:

- autonomous Hedera Agent Kit runtime
- official `MaxRecipientsPolicy(1)`
- official `RejectToolPolicy`
- optional official `HcsAuditTrailHook`
- YourTurn recovery, allowance-budget, x402, and proof tools
- narrow service-recovery prompt and claim boundaries

Files:

- `docs/agent-lab/yourturn-concierge-agent-lab.ts`
- verifier: `npm run hedera:agent-lab-proof`

Use in Agent Lab:

1. Open Hedera Portal -> Agent Lab -> Advanced Mode.
2. Copy `yourturn-concierge-agent-lab.ts` into the editor.
3. Set `HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY`, optional `BOOKED_RIGHTS_TOPIC_ID`, and app endpoint values.
4. Run the agent against Hedera testnet.

This is a compatibility/export artifact, not a separate product claim.
