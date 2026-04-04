# Booked Rights

Booked Rights turns a service booking into a transferable right under issuer rules.

This repo is the **canonical** source for the hack build. Product, build, and demo decisions live in `docs/` (see [Repo map](#repo-map) below). The full agent-oriented build checklist remains in `docs/booked-rights-build-spec.txt` (unchanged).

## Current product frame

**Hero customer:** SMB services and classes (studios, coaching, therapy-style sessions).

**Hero problem:** Someone booked a slot, cannot make it, and wants to transfer or resell without heavy manual coordination, while the issuer keeps rules and economics.

## Locked technical direction

- **Primary track:** Hedera [No Solidity Allowed](https://ethglobal.com/events/cannes2026/prizes)
- **On-chain services in the runnable MVP:** **HTS + HCS** + **Mirror Node REST** (reads), **no Solidity**, **`@hashgraph/sdk` only** from Node.js API routes — see `docs/ARCHITECTURE.md` and `docs/booked-rights-build-spec.txt`
- **No autonomous signing** in product vision: demo app uses server-side keys + actor selector (not wallet); value-moving txs are explicit user clicks

## Must-ship build scope (product slices)

- **F1** Primary booking  
- **F2** Transfer or resale with issuer royalty  
- **F4** Mark used  

**Strong next layer:** F3 freeze/unfreeze (already in current MVP), F7 cancel/refund (out of MVP).

## Product rules (locked)

- Issuer earns on secondary resale where policy allows  
- Plain language: booking, slot, transfer, resale, rebook, refund  
- Do not lead user-facing hero copy with “NFT” in the first line  

## Runnable app (merged)

**Next.js 14** App Router demo: `npm install` → `npm run dev` → `/issuer` Initialize + Mint, then `/slots`, `/resale/[serial]`, etc.

```bash
npm install
npm run dev
npm run build
npm run lint
```

Copy `.env.example` → `.env.local` (Hedera accounts, Upstash Redis, optional reuse `BOOKED_RIGHTS_*`). Deploy on **Vercel** with the same vars.

If you are integrating another backend or agent, see `docs/AGENT-INTEGRATION.md` and set dedicated approval secrets for `/api/agent/approval-grant`.

### Implementation notes

- **Royalty:** numerator **1** / denominator **10** (10%), no fallback fee — enforced by **HTS `CustomRoyaltyFee`** on resale (buyer pays seller full ask + NFT transfer in one tx); `lib/domain/fees.ts` is for **UI preview** only  
- **Redis keys:** `bookedrights:tokenId`, `bookedrights:topicId`, `bookedrights:slots`, `bookedrights:listings`  
- **Agent approval secrets:** set `BOOKED_RIGHTS_APPROVAL_SECRET` and `BOOKED_RIGHTS_APPROVAL_ADMIN_SECRET` for `/api/agent/*` integrations  
- **Node:** `pino@8.17.2` override for Node 18 `next build`; Node 20+ recommended  

### Local smoke path

1. `/issuer` → **Initialize** → **Mint Demo Slots**  
2. As **Person A** (`guestA` underneath), book one live serial from `/slots`  
3. List resale on `/resale/[serial]`, buy as **Person B** (`guestB`), then issuer **Freeze** / **Unfreeze** / **Redeem / Mark used** as needed  

## Repo map

| Doc | Purpose |
|-----|---------|
| `docs/SPEC.md` | Canonical working spec / paste-in surface |
| `docs/DECISIONS.md` | Locked decisions |
| `docs/TASKS.md` | Living build checklist |
| `docs/ARCHITECTURE.md` | System boundaries, Hedera usage |
| `docs/AGENT-INTEGRATION.md` | How another backend or agent should call `/api/agent/*` |
| `docs/DEMO.md` | Demo order and stage rules |
| `docs/TX-LOG.md` | Testnet tx ids + HashScan |
| `docs/booked-rights-build-spec.txt` | Full agent V1 instructions (original) |
| `AGENTS.md` | Agent / automation notes |
| `ISSUES-SEED.md` | Slices to open as GitHub issues |

GitHub **issue** and **PR** templates live under `.github/`.

## Repo discipline

- Keep the repo scoped to this hack  
- Prefer coherent slices on `main` with a verification path  
- Coordinate before parallel edits to **shared glue**: `README.md`, `.env.example`, future `BookingPort` / adapters, lockfile  

## Submission proof (fill as you ship)

- Deployed URL: _TBD_  
- Testnet token id: `0.0.8505698`  
- Topic id: `0.0.8505699`  
- Treasury / demo accounts: treasury `0.0.8504300`, Person A `0.0.8504405`, Person B `0.0.8504715`  
- HashScan links: [token](https://hashscan.io/testnet/token/0.0.8505698), [topic](https://hashscan.io/testnet/topic/0.0.8505699), [F1 book](https://hashscan.io/testnet/transaction/0.0.8504300-1775311056.646893028), [F2 resale buy](https://hashscan.io/testnet/transaction/0.0.8504300-1775311076.681678722), [F4 transfer to treasury](https://hashscan.io/testnet/transaction/0.0.8504300-1775311104.625214821), [F4 burn](https://hashscan.io/testnet/transaction/0.0.8504300-1775311102.263715214)  
- Video: _TBD_  

## Mirror endpoints (MVP)

Base: `NEXT_PUBLIC_MIRROR_BASE` — `GET /tokens/...`, `/nfts/...`, `/accounts/.../nfts`, `/accounts/.../tokens`, `/topics/.../messages`, `/transactions/...`

## Known limitations (MVP)

- Demo actor switch is **not** a security boundary  
- No wallet UI, no refunds, no scheduled txs in v1  
