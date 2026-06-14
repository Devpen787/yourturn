# Demo Recording Checklist

Use this immediately before recording and uploading the ETHGlobal video.

## Export Rules

- Length: `2-4 minutes`. Target `2:45-3:15`.
- Resolution: `720p` minimum; record/export at `1080p` if possible.
- Audio: spoken walkthrough with clear mic audio.
- No speeding footage to fit the timebox.
- No phone-camera recording of the screen.
- No music-only or AI/TTS-only narration.
- Keep notifications, private tabs, and unrelated bookmarks out of frame.

## Narrative Guardrail

Lead with the human story:

> Person A cannot attend. YourTurn Concierge recovers value under provider rules. Hedera proves the policy, approval, automation, and value movement.

Do not lead with transaction ids, HCS-14, OpenClaw, x402, or internal BookingPort terms.

## Required Shots

1. `https://yourturn-sage.vercel.app/my-bookings`
   - Show Person A's booking / recovery entry point.
2. Telegram recovery preview for booking `193`
   - Show ask price, owner royalty, seller net, and human approval language.
3. Telegram listing success for booking `193`
   - Show the listing proof and schedule proof link.
4. `https://yourturn-sage.vercel.app/resale/193?mode=recovery`
   - Show the in-app recovery receipt.
5. `https://hashscan.io/#/testnet/schedule/0.0.9228236`
   - Show the executed Hedera Schedule Service proof.
6. Telegram refund/release success for booking `194`
   - Show the `18 HBAR` testnet refund/release proof.
7. `https://hashscan.io/#/testnet/transaction/0.0.8504300-1781404315-316217004`
   - Show the refund/release transaction.
8. `https://yourturn-sage.vercel.app/api/agent/capabilities`
   - Show bounded agent capabilities, approval gates, and budget checks.

## Fallback Screenshots

If Telegram, HashScan, or the deployed app is slow, use the local screenshot pack while narrating it as recorded proof:

- `output/ethglobal-final-proof/screenshots/01-telegram-recovery-preview.png`
- `output/ethglobal-final-proof/screenshots/02-telegram-listing-success.png`
- `output/ethglobal-final-proof/screenshots/03-telegram-refund-success.png`
- `output/ethglobal-final-proof/screenshots/04-resale-193-recovery-proof.png`
- `output/ethglobal-final-proof/screenshots/05-resale-194-refund-proof.png`
- `output/ethglobal-final-proof/screenshots/08-hashscan-schedule-9228236.png`
- `output/ethglobal-final-proof/screenshots/10-hashscan-refund-release.png`

## Pre-Recording Commands

```bash
npm run ethglobal:preflight
npm run hedera:agent-check
npm run telegram:fixture
npm run build
```

Optional only if you want fresh demo/testnet mutations:

```bash
npm run ethglobal:e2e
```

## Claim Boundaries To Say Once

- "This is Hedera testnet value movement, not production fiat refunding."
- "OpenClaw ACP and x402 are documented future gateway integrations; they are not claimed as live settlement in this demo."
- "Live Telegram mutation is credential-gated and allowlist-gated; recorded proof is included for judging."

## Upload Check

- File is between `2:00` and `4:00`.
- File is at least `720p`.
- Voice is audible in the first `5` seconds.
- First `20` seconds explain the user problem and what judges should watch.
- The final video shows both proof types:
  - Schedule Service automation proof.
  - Testnet HBAR refund/release proof.
