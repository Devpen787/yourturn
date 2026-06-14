# Tight 3-Minute ETHGlobal Demo - Public Recording Checklist

This public file is intentionally **not** the author narration script. Keep the spoken script, timing notes, and presenter phrasing in a private local file under `docs/internal/` or outside the repo.

Use this page only to keep the recorded demo aligned with the shipped proof surfaces.

## Demo Thesis

Person A cannot attend. YourTurn Concierge recovers value under provider rules. Hedera proves the policy, approval, automation, and value movement.

## Public Claim Boundaries

- Live: tokenized booking rights, in-app recovery listing, Telegram recovery/listing proof, Telegram refund/release proof, HTS pass lifecycle, HCS audit trail, Hedera Schedule Service proof, Mirror/HashScan verification, Hedera Agent Kit runtime/manifest verifier.
- Demo-scoped: testnet HBAR value movement, demo users, and recorded proof refs.
- Roadmap: wallet-funded user budgets, remote A2A negotiation, scheduled token release/refund, and production fiat refunds.
- Boundary note: OpenClaw ACP and x402 are documented as future gateway integrations, not claimed as live settlement in this demo.

## Required Proof Beats

1. Welcome: YourTurn tokenizes service slots as booking rights so they can be held, verified, recovered, or passed on under owner rules.
2. Owner: show that the provider controls inventory and recovery rules.
3. Actor dynamic: Owner defines policy, Person A holds the booking, Person B can take over a listed slot.
4. Focus: this recording proves Person A's recovery path because that is where the agent checks policy, asks for approval, and creates Hedera proof.
5. Telegram listing proof: show booking `193` approved/listed by Concierge.
6. In-app receipt: show `/resale/193?mode=recovery` with owner royalty, policy basis, schedule id, and Agent Kit proof.
7. Automation proof: show HashScan schedule `0.0.9228236`.
8. Refund/release proof: show booking `194` and the `18 HBAR` testnet refund/release proof.
9. Close on value: owners keep policy control, customers recover value, and the action is verifiable end to end.

## Public URLs

- App: `https://yourturn-sage.vercel.app`
- Provider dashboard: `https://yourturn-sage.vercel.app/issuer`
- Customer passes: `https://yourturn-sage.vercel.app/my-bookings`
- Listing receipt: `https://yourturn-sage.vercel.app/resale/193?mode=recovery`
- Refund receipt: `https://yourturn-sage.vercel.app/resale/194?mode=recovery`
- Telegram bot: `t.me/YourTurnConcierge_bot`
- HashScan schedule: `https://hashscan.io/#/testnet/schedule/0.0.9228236`
- HashScan scheduled execution: `https://hashscan.io/#/testnet/transaction/0.0.8504300-1781403839-567406004`
- HashScan refund/release: `https://hashscan.io/#/testnet/transaction/0.0.8504300-1781404315-316217004`

## Recording Order

1. Open the public app.
2. Briefly show the provider dashboard. Do not run setup/reset during the recording.
3. Show customer context or positioned Telegram proof.
4. Show Telegram listing success for booking `193`.
5. Open the listing receipt and expand Hedera Agent Kit proof if useful.
6. Open HashScan schedule `0.0.9228236`; accept/load explorer content before moving on.
7. Show Telegram refund success for booking `194`.
8. Open the refund/release HashScan transaction.
9. End on the in-app receipt or Telegram proof pane.

## Verification Commands

Run these before the final recording:

```bash
npm run ethglobal:preflight
npm run hedera:agent-check
npm run telegram:fixture
npm run build
```

Do not run `npm run ethglobal:e2e` immediately before recording unless fresh demo/testnet state is intentional. It mutates demo state.
