# Agent integration

This doc explains how a backend service or external agent should use the agent-safe API surface under `app/api/agent/*`.

Use this doc with:

- `docs/SPEC.md` for product and agent boundaries
- `docs/ARCHITECTURE.md` for system-level rules
- `docs/UI-MAP.md` for route and API inventory

## Scope

This surface is for:

- internal agent backends
- external orchestration services
- server-to-server integrations

This surface is not the customer UI flow. The browser demo still uses the existing `/api/book`, `/api/resale-*`, `/api/freeze`, `/api/unfreeze`, and `/api/mark-used` routes.

## Core rule

Agent actions follow this sequence:

1. Read current state
2. Preview an action
3. Obtain a delegated approval grant from trusted backend code
4. Confirm using the preview token plus approval grant

An agent may prepare and compare actions, but it must not skip the approval step.

For the ETHGlobal Concierge proof layer, see `docs/ethglobal-nyc-2026/HEDERA-AGENT-KIT-INTEGRATION.md`. The shipped verifier command is:

```bash
npm run hedera:agent-check
```

Public capability descriptors:

- `GET /.well-known/agent.json` returns an A2A-style agent card with the HCS-14 `uaid:aid`.
- `GET /api/agent/capabilities` returns the agent identity, YourTurn tool manifest, and protocol descriptors.

OpenClaw ACP and x402 are descriptor-only in this repo until their gateway/facilitator runtimes are configured.

Telegram Concierge transport is documented in `docs/ethglobal-nyc-2026/TELEGRAM-OPENCLAW-SETUP.md`. It is a bounded webhook adapter over the same BookingPort recovery actions, not a separate agent business-logic path.

## Endpoints

| Endpoint | Method | Use |
|----------|--------|-----|
| `/api/agent/read` | `POST` | Read slots, one slot, holdings, active listing, or lifecycle |
| `/api/agent/preview` | `POST` | Preview `book`, `create_listing`, `buy_listing`, `freeze`, `unfreeze`, `mark_used`, `cancel_release` |
| `/api/agent/approval-grant` | `POST` | Mint a scoped delegated approval grant |
| `/api/agent/confirm` | `POST` | Confirm a previewed action using a valid approval grant |

## Actor format

All agent endpoints use a `BookingActorRef`.

Demo actor:

```json
{
  "kind": "demoActor",
  "id": "guestA"
}
```

Explicit Hedera account:

```json
{
  "kind": "hederaAccount",
  "accountId": "0.0.123456"
}
```

Current MVP caveat:

- reads can use either shape
- write actions only succeed for accounts the server can sign for in this MVP
- in practice that means `guestA`, `guestB`, and `issuer`

## 1. Read state

### List slots

```bash
curl -X POST http://localhost:3000/api/agent/read \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "listSlots"
  }'
```

### Get one slot

```bash
curl -X POST http://localhost:3000/api/agent/read \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "getSlot",
    "serial": 1
  }'
```

### List holdings

```bash
curl -X POST http://localhost:3000/api/agent/read \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "listHoldings",
    "holder": { "kind": "demoActor", "id": "guestA" }
  }'
```

### Get listing

```bash
curl -X POST http://localhost:3000/api/agent/read \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "getListing",
    "serial": 1
  }'
```

### Get lifecycle

```bash
curl -X POST http://localhost:3000/api/agent/read \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "getLifecycle",
    "serial": 1
  }'
```

Example response shape:

```json
{
  "ok": true,
  "action": "getSlot",
  "data": {
    "tokenId": "0.0.900001",
    "serial": 1,
    "slotId": "slot-1",
    "title": "Demo session",
    "startTime": "2026-04-04T10:00:00.000Z",
    "endTime": "2026-04-04T11:00:00.000Z",
    "location": "Studio A",
    "primaryPriceHbar": 20,
    "resaleAllowed": true,
    "listingActive": false,
    "status": "AVAILABLE",
    "holderAccountId": null
  }
}
```

## 2. Preview an action

### Preview booking

```bash
curl -X POST http://localhost:3000/api/agent/preview \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "book",
    "buyer": { "kind": "demoActor", "id": "guestA" },
    "serial": 1
  }'
```

### Preview listing creation

```bash
curl -X POST http://localhost:3000/api/agent/preview \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "create_listing",
    "seller": { "kind": "demoActor", "id": "guestA" },
    "serial": 1,
    "askPriceHbar": 30
  }'
```

### Preview listing purchase

```bash
curl -X POST http://localhost:3000/api/agent/preview \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "buy_listing",
    "buyer": { "kind": "demoActor", "id": "guestB" },
    "serial": 1
  }'
```

### Preview freeze

```bash
curl -X POST http://localhost:3000/api/agent/preview \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "freeze",
    "issuer": { "kind": "demoActor", "id": "issuer" },
    "serial": 1,
    "holder": { "kind": "demoActor", "id": "guestB" }
  }'
```

### Preview mark used

```bash
curl -X POST http://localhost:3000/api/agent/preview \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "mark_used",
    "issuer": { "kind": "demoActor", "id": "issuer" },
    "serial": 1
  }'
```

### Preview cancel / release

This is the agent-safe F7 path. The current holder approves release; the backend transfers the NFT back to treasury, sends the policy-derived testnet HBAR refund to the holder, burns the NFT, clears any active listing, and writes a `CANCEL_RELEASED` HCS lifecycle event.

```bash
curl -X POST http://localhost:3000/api/agent/preview \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "cancel_release",
    "holder": { "kind": "demoActor", "id": "guestA" },
    "serial": 1
  }'
```

Example preview response:

```json
{
  "ok": true,
  "preview": {
    "action": "buy_listing",
    "previewId": "eyJ...signed-preview-token",
    "summary": "Buy listed serial 1 for 30 ℏ as guestB.",
    "details": {
      "tokenId": "0.0.900001",
      "serial": 1,
      "sellerAccountId": "0.0.700001",
      "askPriceHbar": 30,
      "royaltyHbar": 3,
      "sellerNetHbar": 27,
      "active": true,
      "createdAt": "2026-04-04T12:00:00.000Z"
    },
    "expiresAt": "2026-04-04T12:10:00.000Z"
  }
}
```

## 3. Mint a delegated approval grant

This endpoint is for trusted backend code only.

It requires the header:

```text
x-booked-rights-approval-secret: <BOOKED_RIGHTS_APPROVAL_ADMIN_SECRET>
```

If `BOOKED_RIGHTS_APPROVAL_ADMIN_SECRET` is not set, the server falls back to the approval secret chain in `lib/server/approval-grants.ts`. For deployment, set a dedicated admin secret explicitly.

### Example

```bash
curl -X POST http://localhost:3000/api/agent/approval-grant \
  -H 'Content-Type: application/json' \
  -H 'x-booked-rights-approval-secret: change-me' \
  -d '{
    "action": "buy_listing",
    "actor": { "kind": "demoActor", "id": "guestB" },
    "serial": 1,
    "approvedBy": "ops@bookedrights.local",
    "ttlSeconds": 900,
    "source": "agent_handoff"
  }'
```

Example response:

```json
{
  "ok": true,
  "grantToken": "eyJ...signed-grant-token",
  "claims": {
    "kind": "booked-rights-approval-grant",
    "grantId": "4b0d7a7b-1111-2222-3333-444444444444",
    "action": "buy_listing",
    "actor": { "kind": "demoActor", "id": "guestB" },
    "serial": 1,
    "approvedBy": "ops@bookedrights.local",
    "approvedAt": "2026-04-04T12:01:00.000Z",
    "expiresAt": "2026-04-04T12:16:00.000Z",
    "source": "agent_handoff"
  }
}
```

## 4. Confirm an action

Confirmation requires:

- `previewId` from `/api/agent/preview`
- `approvalGrant` from `/api/agent/approval-grant`

The server checks:

- preview signature and expiry
- grant signature and expiry
- action match
- serial match if the grant is serial-scoped
- actor match if the grant is actor-scoped

### Example

```bash
curl -X POST http://localhost:3000/api/agent/confirm \
  -H 'Content-Type: application/json' \
  -d '{
    "previewId": "eyJ...signed-preview-token",
    "approvalGrant": "eyJ...signed-grant-token"
  }'
```

Example response for **book** or **buy_listing** (HTS transfer; `txId` is the NFT-moving transaction):

```json
{
  "ok": true,
  "result": {
    "txId": "0.0.700001@1712232066.123456789",
    "hashscanUrl": "https://hashscan.io/testnet/transaction/0.0.700001-1712232066-123456789"
  }
}
```

Example response for **create_listing** (no HTS transfer in this MVP; `auditTxId` is the **HCS** topic message submit for the LISTED lifecycle event):

```json
{
  "ok": true,
  "result": {
    "listing": {
      "tokenId": "0.0.900001",
      "serial": 1,
      "sellerAccountId": "0.0.700001",
      "askPriceHbar": 30,
      "royaltyHbar": 3,
      "sellerNetHbar": 27,
      "active": true,
      "createdAt": "2026-04-04T12:00:00.000Z"
    },
    "auditTxId": "0.0.600001@1712232100.987654321",
    "hashscanUrl": "https://hashscan.io/testnet/transaction/0.0.600001-1712232100-987654321"
  }
}
```

The same **`listing` + `auditTxId` + `hashscanUrl`** triplet is returned by **`POST /api/resale-list`** for the browser demo.

Example response for **freeze**, **unfreeze**, or **mark_used** (issuer actions; no `txId` in the response body today):

```json
{
  "ok": true,
  "result": {
    "ok": true
  }
}
```

Example response for **cancel_release**:

```json
{
  "ok": true,
  "result": {
    "txIds": {
      "transferToTreasury": "0.0.700001@1712232200.111111111",
      "burn": "0.0.700001@1712232202.222222222",
      "audit": "0.0.600001@1712232204.333333333"
    },
    "hashscanUrls": {
      "transferToTreasury": "https://hashscan.io/testnet/transaction/0.0.700001-1712232200-111111111",
      "burn": "https://hashscan.io/testnet/transaction/0.0.700001-1712232202-222222222",
      "audit": "https://hashscan.io/testnet/transaction/0.0.600001-1712232204-333333333"
    },
    "refundHbar": 18
  }
}
```

## Error shape

All endpoints use the same failure shape:

```json
{
  "ok": false,
  "error": "Human-readable message",
  "code": "CONFLICT"
}
```

Current error codes:

- `VALIDATION_ERROR`
- `NOT_FOUND`
- `CONFLICT`
- `HEDERA_TX_ERROR`
- `INTERNAL_ERROR`

## Recommended backend flow

For a real agent backend:

1. Read slot and listing state first
2. Decide whether the action is allowed and useful
3. Request a preview
4. Show summary and fee impact to the human
5. Mint a scoped approval grant from trusted backend code only after explicit approval
6. Confirm the preview
7. Persist proof ids as returned: for **book** / **buy_listing** use **`txId`** (and **`hashscanUrl`**); for **create_listing** persist **`auditTxId`** (and **`hashscanUrl`**) — that pair refers to the **HCS** audit submit, not an NFT transfer. For **cancel_release**, persist all three tx ids: holder-to-treasury transfer, burn, and HCS audit.

## Current MVP limitations

- The write path still only succeeds for server-managed demo accounts
- There is no end-user auth or wallet delegation yet
- Approval grants are delegated by trusted backend code, not by the browser demo
- There is no idempotency key on confirm yet
- `cancel_release` performs an immediate testnet HBAR refund/release in this MVP; scheduled token release/refund remains future hackathon scope
- This is an integration surface, not a finished agent product

## Related files

- `app/api/agent/read/route.ts`
- `app/api/agent/preview/route.ts`
- `app/api/agent/confirm/route.ts`
- `app/api/agent/approval-grant/route.ts`
- `lib/adapters/booking-port.ts`
- `lib/server/approval-grants.ts`
- `lib/validation/agent.ts`
