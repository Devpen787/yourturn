# Final Proof Pack

Prepared: 2026-06-14 for ETHGlobal NYC 2026 final rehearsal.

This packet separates live proof, local screenshot evidence, repeatable verifier commands, and honest gaps.

## Anchor Flow

Primitive: tokenized service booking recovery.

Proof object: Concierge recovery receipt with policy checks, approval id, Hedera transaction ids, HashScan links, schedule proof, and Agent Kit proof.

Verifier:

- user-facing app receipt at `/resale/[serial]?mode=recovery`
- HashScan schedule and transaction pages
- `npm run hedera:agent-check`
- `npm run telegram:fixture`
- optional full regression with `npm run ethglobal:e2e`

Live state change:

- booking `193` was listed for resale through Telegram Concierge
- booking `193` created executed Schedule Service proof `0.0.9228236`
- booking `194` completed a real testnet HBAR refund/release through Telegram Concierge

## Screenshot Evidence

Local-only evidence folder:

`output/ethglobal-final-proof/screenshots/`

Files captured:

| File | What it proves |
| --- | --- |
| `01-telegram-recovery-preview.png` | Telegram Concierge preview for booking `193`, including ask, owner royalty, seller net, and approval instruction. |
| `02-telegram-listing-success.png` | Telegram approval listed booking `193`, returned schedule proof, listing proof, and receipt link. |
| `03-telegram-refund-success.png` | Telegram approval completed refund/release for booking `194`, returned refund amount, HashScan proof, and receipt link. |
| `04-resale-193-recovery-proof.png` | In-app recovery receipt for booking `193`. |
| `05-resale-194-refund-proof.png` | In-app recovery/refund status for booking `194`. |
| `06-agent-card-endpoint.png` | `/.well-known/agent.json` exposes the YourTurn Concierge agent descriptor. |
| `07-agent-capabilities-endpoint.png` | `/api/agent/capabilities` exposes identity, tools, policy boundaries, and capabilities. |
| `08-hashscan-schedule-9228236.png` | HashScan schedule page shows schedule `0.0.9228236` executed. |
| `09-hashscan-scheduled-execution.png` | HashScan transaction page for scheduled execution. |
| `10-hashscan-refund-release.png` | HashScan transaction page for refund/release. |

## Primary Telegram Proofs

Listing/recovery proof:

- booking: `193`
- Telegram command: `approve listing 193`
- listing receipt id: `bc9155e7-17dd-451d-8f4f-1ba56e4fb99f`
- listing audit tx: `0.0.8504300@1781403839.479174338`
- schedule create tx: `0.0.8504300@1781403839.567406004`
- schedule id: `0.0.9228236`
- scheduled execution tx: `0.0.8504300-1781403839-567406004`
- scheduled execution timestamp: `1781403936.047653147`
- schedule HashScan: https://hashscan.io/#/testnet/schedule/0.0.9228236
- scheduled execution HashScan: https://hashscan.io/#/testnet/transaction/0.0.8504300-1781403839-567406004

Refund/release proof:

- booking: `194`
- Telegram command: `approve refund 194`
- refund receipt id: `143c5cee-8d08-468d-9f6e-d4f349857a08`
- refund/release tx: `0.0.8504300@1781404315.316217004`
- close/burn tx: `0.0.8504300@1781404320.752860402`
- audit tx: `0.0.8504300@1781404320.697190583`
- refund HashScan: https://hashscan.io/#/testnet/transaction/0.0.8504300-1781404315-316217004

## Final Regression Proof

Optional full regression was run after the screenshot capture. It passed and intentionally mutated the demo state.

Command:

```bash
npm run ethglobal:e2e
```

Result:

- status: `ok: true`
- main serial: `196`
- no-resale/refund serial: `197`
- open guardrail serial: `198`
- main booking tx: `0.0.8504300@1781406935.833248799`
- Person B buy tx: `0.0.8504300@1781407063.661400011`
- refund/release tx: `0.0.8504300@1781406949.343880789`
- refund close/burn tx: `0.0.8504300@1781406952.109135628`
- refund audit tx: `0.0.8504300@1781406954.718544691`
- listing receipt id: `6351521d-13e2-4973-9d33-08eb521fa1ca`
- refund receipt id: `fb0e38dd-9ed8-4d93-9bd8-82abbaa8f7aa`
- schedule id: `0.0.9228519`
- schedule create tx: `0.0.8504300@1781406966.580404829`
- schedule status: `executed`
- scheduled execution tx: `0.0.8504300-1781406966-580404829`
- schedule HashScan: https://hashscan.io/#/testnet/schedule/0.0.9228519
- scheduled execution HashScan: https://hashscan.io/#/testnet/transaction/0.0.8504300-1781406966-580404829

Passed checks included:

- A2A agent card exposes HCS-14 identity
- agent capabilities expose honest protocol descriptors
- issuer saves ETHGlobal session plan
- issuer reset creates fresh serials
- unheld recovery is blocked
- Person A books main serial
- non-holder recovery is blocked
- Person A books no-resale serial
- resale-disabled recovery is blocked by snapshot
- Person A confirms real test HBAR refund release
- refund receipt includes Hedera agent proof
- refund release closes no-resale pass
- Person A confirms recovery and creates schedule
- listing receipt includes Hedera agent proof
- already-listed recovery routes to listing
- Schedule proof reaches executed status
- Person B buys listed pass
- issuer marks main serial used
- used recovery is blocked after Mirror catches up
- Mirror NFT is deleted after mark used

## Verification Commands

Final pass completed:

```bash
npm run ethglobal:preflight
npm run hedera:agent-check
npm run telegram:fixture
npm run ethglobal:e2e
npm run build
```

Final `hedera:agent-check` reported:

- automation: `live`
- agentic payments: `live`
- no Solidity: `live`
- tokenization: `supporting`

## Submission Claims

Primary Hedera tracks:

1. Autonomous On-Chain Automation Platform
2. AI & Agentic Payments on Hedera
3. "No Solidity Allowed" - Build with Hedera SDKs

Supporting Hedera story:

- Tokenization on Hedera

## Honest Gaps

Do not claim these as live:

- OpenClaw ACP Gateway runtime
- x402 facilitator-backed settlement
- remote A2A multi-agent negotiation
- wallet connect
- wallet-funded user allowances
- fiat/stablecoin onramp
- scheduled token release/refund

These are documented as descriptor/configured/roadmap boundaries, not final live proof.

## Safety Closeout

- Keep `TELEGRAM_ALLOW_MUTATIONS=false` outside rehearsal/live proof moments.
- Rotate the Telegram bot token after submission/rehearsal because it was pasted in chat.
- Do not publish `.env.local` or bot credentials.
