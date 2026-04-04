# Booked Rights v1

Demo web app for **ETHGlobal Hedera “No Solidity Allowed”**: transferable booking rights as Hedera NFTs on **testnet**, with **HTS** (mint, associate, transfer, 10% royalty custom fee, freeze/unfreeze, burn) plus **HCS** (one topic for lifecycle JSON events). **Mirror Node REST** is used for reads (token, NFT serial, account NFTs, topic messages, transactions). **No Solidity, no smart contracts** — only `@hashgraph/sdk` from Node.js API routes.

## Architecture (short)

- **Next.js 14** App Router, TypeScript, Tailwind.
- **Writes**: internal `POST /api/*` routes only; each Hedera route sets `export const runtime = "nodejs"`.
- **App state**: **Upstash Redis** with keys `bookedrights:tokenId`, `bookedrights:topicId`, `bookedrights:slots`, `bookedrights:listings`.
- **Actors (demo)**: `issuer` (treasury keys), `guestA`, `guestB` — selected in the UI; authority is **server-side keys** from env (not wallet connect).

## Royalty

Configured on token create: **numerator 1, denominator 10** (10%). **No fallback fee** in v1. Resale settlement uses an atomic transfer: buyer pays ask, **seller receives net**, **fee collector receives royalty** (see `lib/domain/fees.ts` and `lib/hedera/token.ts`).

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Environment

Copy `.env.example` to `.env.local` and fill values.

- **Hedera**: operator pays fees; treasury holds NFT supply; fee collector may be the same account as treasury for hackathon setups.
- **Redis**: `KV_REST_API_URL` and `KV_REST_API_TOKEN` from [Upstash](https://upstash.com/docs/redis/howto/vercelintegration).
- Optional: `BOOKED_RIGHTS_TOKEN_ID` / `BOOKED_RIGHTS_TOPIC_ID` to reuse existing resources (otherwise `/api/init` creates and stores IDs in Redis).

## Local workflow

1. `npm run dev`
2. Open `/issuer` → **Initialize** (token + topic) → **Mint Demo Slots** (3 NFTs from `public/demo-slots.json`).
3. As **guestA**, book serial `1` on `/slots`.
4. List resale on `/resale/1`, buy as **guestB**, freeze/unfreeze holder from Issuer, **Mark used** to burn.

## Deploy (Vercel)

1. Create a Vercel project from this repo.
2. Set the same env vars as `.env.example` in the Vercel dashboard ([docs](https://vercel.com/docs/environment-variables)).
3. Set `NEXT_PUBLIC_APP_URL` to the production URL after first deploy.
4. Redeploy if needed.

## After first successful flows (fill in for submission)

- **Deployed public URL**: _add your Vercel URL_
- **Token ID**: _from Issuer or Redis `bookedrights:tokenId`_
- **Topic ID**: _from Issuer or Redis `bookedrights:topicId`_
- **Sample tx IDs / HashScan**: _paste links using `NEXT_PUBLIC_HASHSCAN_BASE` (default `https://hashscan.io/testnet`)_

## Mirror endpoints used

Base: `NEXT_PUBLIC_MIRROR_BASE` (default `https://testnet.mirrornode.hedera.com/api/v1`)

- `GET /tokens/{tokenId}`
- `GET /tokens/{tokenId}/nfts/{serial}`
- `GET /accounts/{id}/nfts?token.id=...`
- `GET /accounts/{id}/tokens?token.id=...` (freeze status)
- `GET /topics/{topicId}/messages`
- `GET /transactions/{transactionId}`

## Known limitations

- Demo-only auth: actor switch is **not** a security boundary.
- No refunds, no wallet UI, no scheduled transactions.
- **Node 18**: `@hashgraph/sdk` pulls logging deps; this repo pins `pino@8.17.2` via `overrides` so `next build` works on Node 18. **Node 20+** is recommended when available.

## Full build spec

See `docs/booked-rights-build-spec.txt`.
