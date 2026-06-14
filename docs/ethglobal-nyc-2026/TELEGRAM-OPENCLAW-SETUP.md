# Telegram and OpenClaw Setup

## Status

Telegram Concierge is implemented as a bounded webhook transport over the existing YourTurn recovery actions.

OpenClaw ACP remains descriptor-only until an OpenClaw gateway/runtime is configured for this repo.

## Source Pattern

The setup follows the AgentOps personal-bot guardrail pattern:

- allowlisted Telegram chat only for live delivery
- dry-run fixture first
- no mutation unless `TELEGRAM_ALLOW_MUTATIONS=true`
- no secrets in repo
- no separate Telegram-only business logic
- every value-moving action goes through the same BookingPort and Hedera proof paths as the web app

## Environment

Required for live Telegram delivery:

```bash
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_ALLOWED_CHAT_IDS=
NEXT_PUBLIC_APP_URL=
```

Required for Telegram-initiated listing/refund execution:

```bash
TELEGRAM_ALLOW_MUTATIONS=true
```

Optional default actor:

```bash
TELEGRAM_DEMO_ACTOR=guestA
```

## Commands

Dry-run fixture:

```bash
npm run telegram:fixture
```

Supported Telegram messages:

- `show my bookings`
- `recover booking ref 123`
- `approve listing ref 123`
- `approve refund ref 123`

## Claim Boundary

Live today:

- Telegram webhook parsing
- allowlisted delivery gate
- dry-run fixture safety
- recovery preview
- mutation-gated recovery listing approval
- mutation-gated release/refund approval
- Hedera Agent Kit proof receipts for approved actions

Configured / not live until credentials are supplied:

- Telegram bot delivery through Telegram's API
- Telegram-initiated mutations

Not claimed live:

- OpenClaw ACP gateway execution
- x402 facilitator payments
- wallet-funded user budgets
