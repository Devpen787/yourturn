# Cold-Start Gaps (judge / reviewer rehearsal)

Evidence class: **CI-LOCAL**, from a clean disposable checkout. Env **names only**; no values recorded anywhere.

## Sequence actually tested

`npm ci --legacy-peer-deps` → `npx tsc --noEmit` → `npm run build` → `npm run start` → probe routes → reset → probe again.

| Step | Result |
| --- | --- |
| `npm ci --legacy-peer-deps` | exit 0 |
| `tsc --noEmit` | exit 0 |
| `next build` | exit 0 |
| start with **no env file at all** | server boots |

## What works with zero configuration

| Route | HTTP | Note |
| --- | --- | --- |
| `/` | 200 | |
| `/product-preview` | 200 | full Golden render, ~9.6 KB |
| `/product-preview?view=bookings` | 200 | |
| `/product-preview?view=xc-provider-policy` | 200 | |
| `/product-preview?view=xc-bob-success` | 200 | |
| `/api/auth/me` | 200 | |
| `/slots`, `/my-bookings` | 307 | redirect to auth |

**The hero demo route needs no environment, no Redis and no secrets, and is stable across repeated loads.** That is the single strongest reliability property found in this audit.

## Blocking cold-start chain for anything stateful

1. **`AUTH_SESSION_SECRET`** (min 16 chars) — **undocumented in `.env.example`**. Without it every demo login returns `503 NOT_CONFIGURED`, so `/api/init` and `/api/reset-demo` return `401`. A judge cannot initialise or reset the demo.
2. **`KV_REST_API_URL` + `KV_REST_API_TOKEN`** — documented, but require provisioning an external Vercel KV / Upstash instance. With the secret set but KV absent, login returns `503 Redis (KV) is not configured.`
3. Hedera/World/Ledger variables on top of that for any on-chain or verification step.

`ENABLE_DEMO_LOGIN` is also undocumented (defaults permissive: `!== "false"`).

## Documentation gap

> **CORRECTED 2026-09-11.** The count below is an inventory of env names read
> anywhere in the repo, including CI-only and script-only paths. It is **not** a
> list of 52 universally required secrets. Requirements are mode-specific — see
> `scripts/preflight/mode-preflight.mjs`, which derives required vs optional per
> demo mode from the actual code gates.


- env names read by code: **70**
- documented in `.env.example`: **19**
- **undocumented but read at runtime: 52**

Product-critical members of that set (names only): `AUTH_SESSION_SECRET`, `BOOKED_RIGHTS_APPROVAL_SECRET`, `BOOKED_RIGHTS_PREVIEW_SECRET`, `BOOKED_RIGHTS_APPROVAL_ADMIN_SECRET`, `ENABLE_DEMO_LOGIN`, `HEDERA_USDC_TOKEN_ID`, `WORLD_AGENT_ADDRESS`, `NEXT_PUBLIC_REOWN_PROJECT_ID`, `YOURTURN_POLICY_USDC_LIMIT_UNITS`, `HEDERA_*_KEY_TYPE`.

Documented but never read: `HEDERA_FEE_COLLECTOR_KEY`, `KV_REST_API_READ_ONLY_TOKEN`.

`scripts/ethglobal-preflight.mjs` exists but contains **zero** `process.env` references — it is not an environment preflight, so nothing today tells an operator which variables are missing before the demo.

## Undocumented manual dependencies

1. A running Redis/KV instance is mandatory for every stateful path.
2. Provider-role login is required before `init` or `reset-demo`; no unauthenticated demo bootstrap exists.
3. `AUTH_SESSION_SECRET` must be invented by the operator — no example, no generator, no error message pointing at `.env.example`.
4. There is no single documented "run the demo" command sequence that ends in a working stateful demo.
