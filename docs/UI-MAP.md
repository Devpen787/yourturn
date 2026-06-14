# UI map and flow index

Living map of **routes**, **React surfaces**, **API calls**, and **spec flows** (`F1`–`F7` from `docs/SPEC.md`). Use it for flow review, component tracking, and spotting gaps.

## How to use this doc

- **Before a product PR:** confirm the route row still matches the page and client component; add or adjust **APIs called** if you introduce new `fetch` targets.
- **Flow review:** walk `docs/DEMO.md` (happy path) and cross-check each step against the tables below.
- **“Does this have a purpose?”** If a new component has no route or parent, either document the exception here or fold it into an existing surface.

## When to update this doc (PR checklist)

Update **`docs/UI-MAP.md` in the same PR** when you change any of the following (so flow review and agent context stay accurate):

- A new or removed **App Router page** under `app/`, or a renamed route segment.
- A new or removed **client component** that calls `fetch` to `app/api/*`, or a changed API path / method from the browser.
- A new **`POST` / `GET` under `app/api/`** (add a row to the API table and set **Called from UI?** correctly).
- A **spec flow** (`F1`–`F7`) that gains or loses a user-visible step — align the **Spec flows** table and, if the happy path changes, **`docs/DEMO.md`**.

**PR description:** If the slice touched routes or APIs, add a short note such as: `Updated docs/UI-MAP.md` (or explain why it did not apply). This is repo policy; see **`AGENTS.md`** — read order and “After you finish a slice”.

## Routes → server page → UI → APIs

| Route | Server module | Renders | Client / child UI | User actions (primary) | APIs invoked from browser |
|-------|----------------|---------|-------------------|-------------------------|---------------------------|
| `/` | `app/page.tsx` | Marketing home | `HomeHero`, `ExperiencePillars`, `StartFlowCta` (`components/home/*`, Server Components) | Hero CTAs → `/slots`, `/my-bookings`; business card → `/issuer` | — |
| `/login` | `app/login/page.tsx` | App sign-in | `DemoLoginButtons`, `LoginForm`, `LogoutToSwitchAccount` | Sign in as demo issuer / demo user A / demo user B, or sign in with email + password | `POST /api/auth/demo-login`, `POST /api/auth/login`, `POST /api/auth/logout` |
| `/register` | `app/register/page.tsx` | App registration | `RegisterForm` | Create a guest app account | `POST /api/auth/register` |
| `/slots` | `app/slots/page.tsx` | Premium customer browse list | `SlotsClient`, `SessionCard` | Signed-in guest sees marketplace-style session cards; local search/filter helps scanning; demo user A / B sign-ins lock the page to that customer; review and book an AVAILABLE slot | `POST /api/book` |
| `/slots/[serial]` | `app/slots/[serial]/page.tsx` | Shared truth page: status, verified receipt, HCS lifecycle history | `SlotPassHeroCard`, `RecoveryProofCard`, `VerifiedLifecycleTimeline`, `SlotDetailStickyBar`, `SlotResaleCta` (mostly Server Component tree) | Open resale when eligible; inspect verified lifecycle; HashScan / technical details | — |
| `/my-bookings` | `app/my-bookings/page.tsx` | Customer pass hub | `MyBookingsClient`, `PassTile` | Signed-in guest sees only their customer view; open details, start Concierge recovery for eligible held passes, open Telegram Concierge, refresh | — (`router.refresh()` only) |
| `/resale/[serial]` | `app/resale/[serial]/page.tsx` | Customer recovery + resale handoff page | `ResaleClient`, `RecoveryConciergePanel`, `RecoveryProofCard` | Signed-in guest previews and approves Concierge recovery listing or release/refund, sees refreshed proof state, inspects Schedule Service execution, or uses the manual seller / buyer resale flow | `POST /api/recovery/preview`, `POST /api/recovery/confirm`, `POST /api/automation/inspect`, `POST /api/resale-list`, `POST /api/resale-buy` |
| `/issuer` | `app/issuer/page.tsx` | Provider dashboard shell | `IssuerPanel` | Signed-in issuer saves business name + 3-session plan, init, mint, typed-confirm reset, confirm freeze, reopen, typed-confirm mark used; live rows show schedule automation proof and recovery/refund proof when present | `POST /api/session-plan`, `POST /api/init`, `POST /api/mint-slots`, `POST /api/reset-demo`, `POST /api/freeze`, `POST /api/unfreeze`, `POST /api/mark-used` |
| `/demo-help` | `app/demo-help/page.tsx` | In-app explanation of demo identities and confirm steps | — (Server Component) | Read how Person A / Person B / Provider map to the demo | — |
| `/brand-lab` | `app/brand-lab/page.tsx` | Logo variants first, then internal UI kit + homepage composites | `BrandLabClient`, `BrandLabUiKit`, `BrandLabAgentPrototype` | Switch logo direction chips; preview buttons, feedback, toasts, ActorSelector; **assistant-style prototype** (scripted routing, not an LLM) calls `/api/agent/read` + `/api/agent/preview` when “Live API” is on | — |
| `/brand-lab/ethglobal` | `app/brand-lab/ethglobal/page.tsx` | Hidden ETHGlobal Wave 1 sandbox | `SessionCard`, `PassTile`, static proof/policy/Concierge mock blocks | Static premium target states for browse, pass hub, proof drawer, Concierge preview, and owner-policy preview; no live API calls and not linked from product nav | — |
| `/brand-lab/assistant` | `app/brand-lab/assistant/page.tsx` | **Customer-only** conversation-shaped **prototype** (scripted routing, not an LLM); no internal column | `BrandLabAgentPrototype` (`mode="customerOnly"`) | Starter actions, preview/confirm cards; Person A + Live API defaults | — |
| `/brandlab` | `app/brandlab/page.tsx` | Redirect → `/brand-lab` (typo alias) | — | — | — |

Global chrome: `app/layout.tsx` + `components/SiteHeader.tsx` (header nav only; no API calls). **Browse** is active for both `/slots` and `/resale/*`; **Provider dashboard** is hidden on customer-only paths unless `NEXT_PUBLIC_SHOW_PROVIDER_NAV_ON_CUSTOMER_PAGES=true` or the path is `/` or `/issuer` (see `showProviderInNav` in `SiteHeader.tsx`). **Brand lab** is not linked from the shipped product nav (lab remains at `/brand-lab` for internal use).

## Shared components

| Component | File | Role | Used on |
|-----------|------|------|---------|
| `ActorSelector` | `components/ActorSelector.tsx` | Demo persona switcher; compact Person A / Person B toggle on customer routes, with `lockTo` support when demo user A / B is signed in | `/slots`, `/my-bookings`, `/resale/*` |
| `SessionCard` | `components/marketplace/SessionCard.tsx` | Premium session card for browse/sandbox states; does not call APIs itself | `/slots`, `/brand-lab/ethglobal` |
| `PassTile` | `components/passes/PassTile.tsx` | Premium customer pass tile with status, next step, booking number, and route action slot; does not call APIs itself | `/my-bookings`, `/brand-lab/ethglobal` |
| `RecoveryConciergePanel` | `components/concierge/RecoveryConciergePanel.tsx` | In-app recovery preview, explicit approval, and receipt surface for resale listing or release/refund Concierge flows | `/resale/[serial]` |
| `RecoveryProofCard` | `components/proof/RecoveryProofCard.tsx` | Reusable verified receipt/proof card for recovery listing, release/refund, active listing, resale-completed states, and Hedera Agent Kit proof details | `/resale/[serial]`, `/slots/[serial]` |
| `VerifiedLifecycleTimeline` | `components/proof/RecoveryProofCard.tsx` | Judge-readable lifecycle trail reconstructed from HCS events, with raw event details collapsed | `/slots/[serial]` |
| `SlotResaleCta` | `app/slots/[serial]/SlotResaleCta.tsx` | Link to `/resale/[serial]` | `/slots/[serial]` when resale allowed |
| `SiteHeader` | `components/SiteHeader.tsx` | Global product nav, session display, sign in / register / sign out actions | All routes via `app/layout.tsx` |
| `GuestPortalShell` | `components/GuestPortalShell.tsx` | Shared signed-in customer wrapper used by role-gated layouts | `/slots`, `/my-bookings`, `/resale/*` |
| `BrandLabClient` | `components/brand-lab/BrandLabClient.tsx` | Mock surfaces + switchable SVG logo directions for design review | `/brand-lab` only |
| `Button` | `components/ui/Button.tsx` | Shared action primitive with loading state and variants | Customer + provider action surfaces |
| `LiveFeedback` | `components/ui/LiveFeedback.tsx` | Shared success/error messaging | `/slots`, `/resale/[serial]`, `/issuer` |
| `Skeleton` | `components/ui/Skeleton.tsx` | Shared loading placeholder | Route-level `loading.tsx` files |

**Note:** `statusTone` / status copy helpers are duplicated across several files; consider one shared helper when touching styling (see prior review).

## Route loading states

| Route | Loading file | Purpose |
|-------|--------------|---------|
| `/slots` | `app/slots/loading.tsx` | Browse skeleton while sessions load |
| `/slots/[serial]` | `app/slots/[serial]/loading.tsx` | Detail/proof skeleton |
| `/my-bookings` | `app/my-bookings/loading.tsx` | Pass-hub skeleton |
| `/resale/[serial]` | `app/resale/[serial]/loading.tsx` | Resale handoff skeleton |
| `/issuer` | `app/issuer/loading.tsx` | Provider dashboard skeleton |

## API routes → purpose → typical caller

| API | Method | Purpose | Called from UI? |
|-----|--------|---------|-----------------|
| `/api/auth/demo-login` | POST | One-click demo issuer / user A / user B sign-in | Yes — Login |
| `/api/auth/login` | POST | Email + password sign-in | Yes — Login |
| `/api/auth/logout` | POST | End current app session | Yes — Header / login helpers |
| `/api/auth/me` | GET | Current signed-in app user | No — server/auth support |
| `/api/auth/register` | POST | Create guest app account | Yes — Register |
| `/api/init` | POST | Create/store token + topic ids | Yes — Issuer |
| `/api/session-plan` | POST | Save business name + 3 planned demo sessions used by mint/reset | Yes — Issuer |
| `/api/mint-slots` | POST | Seed slots in Redis (+ mint NFTs per demo policy) | Yes — Issuer |
| `/api/reset-demo` | POST | Reset demo state | Yes — Issuer |
| `/api/book` | POST | Primary booking (`F1`) | Yes — Slots list |
| `/api/recovery/preview` | POST | Browser-safe Concierge recovery preview for resale listing or release/refund; validates signed customer + current holder before returning a preview token | Yes — Resale recovery panel |
| `/api/recovery/confirm` | POST | Browser-safe Concierge recovery confirm; mints approval server-side, creates resale listing plus Schedule Service proof, or executes real testnet HBAR refund/release; stores a Hedera Agent Kit proof trace and returns a compact receipt | Yes — Resale recovery panel |
| `/api/automation/inspect` | POST | Refresh Schedule Service proof from Mirror/HashScan-visible state, including executed scheduled transaction status | Yes — Resale recovery panel |
| `/api/telegram/webhook` | POST | Telegram Concierge webhook adapter; supports bookings, recovery preview, mutation-gated resale listing approval, and mutation-gated release/refund approval; fixture safe by default; live delivery requires `TELEGRAM_ALLOWED_CHAT_IDS` and mutations require `TELEGRAM_ALLOW_MUTATIONS=true` | No — external Telegram transport |
| `/api/resale-list` | POST | Create resale listing (`F2`) | Yes — Resale page |
| `/api/resale-buy` | POST | Buy active listing (`F2`) | Yes — Resale page |
| `/api/freeze` | POST | Freeze current holder (`F3`) | Yes — Issuer |
| `/api/unfreeze` | POST | Unfreeze (`F3`) | Yes — Issuer |
| `/api/mark-used` | POST | Mark used / burn path (`F4`) | Yes — Issuer |
| `/api/associate` | POST | Associate token to guest (same tx path as book can do inline) | **No** — manual / tooling; booking path may associate inside `POST /api/book` |
| `/api/mirror` | GET | Mirror debug / reads by query | **No** — tooling / scripts |
| `/api/agent/read` | POST | Agent-safe read surface over `BookingPort` (`listSlots`, `getSlot`, holdings, listings, lifecycle) | **No** — external agent / backend integration |
| `/api/agent/preview` | POST | Agent preview surface over `BookingPort` for `F1` / `F2` / `F3` / `F4` / F7 `cancel_release` | **No** — external agent / backend integration |
| `/api/agent/confirm` | POST | Agent confirm surface; requires preview token + delegated approval grant | **No** — external agent / backend integration |
| `/api/agent/approval-grant` | POST | Mint scoped delegated approval grants; trusted backend only via secret header | **No** — backend tooling only |
| `/api/agent/capabilities` | GET | Public agent capability descriptor with HCS-14 identity, tool manifest, A2A card, and honest OpenClaw/x402 descriptor status | **No** — external agent / verifier integration |
| `/.well-known/agent.json` | GET | A2A-style public agent card for `yourturn-concierge`, including HCS-14 `uaid:aid` identity | **No** — external agent / verifier integration |

## Spec flows (`docs/SPEC.md`) vs shipped UI

| Flow | Meaning | Where it shows up | Notes |
|------|---------|-------------------|--------|
| **F1** Primary booking | Guest books AVAILABLE slot | `/slots` → `POST /api/book` | Holder + tx feedback in UI |
| **F2** Resale + royalty | Recover/list and buy | `/my-bookings` → `/resale/[serial]?mode=recovery`, plus manual `/resale/[serial]`; optional Telegram transport through `/api/telegram/webhook` | Concierge preview + approval creates a listing; proof receipt persists in demo state; approved recovery also creates a Schedule Service payment proof and Hedera Agent Kit proof trace; Telegram can preview and approve listing when allowlisted/mutation-enabled; manual seller and buyer dialogs remain available; royalty copy on page + `lib/domain/fees.ts` |
| **F3** Freeze / unfreeze | Issuer blocks movement | `/issuer` | Mirror holder must match `holderActor` (API enforced) |
| **F4** Mark used | Close lifecycle | `/issuer` → `POST /api/mark-used` | Typed confirm in provider dashboard; guest views update via Mirror on refresh |
| **F7** Cancel / release / refund | Holder-approved release path | `/resale/[serial]?mode=recovery` with `cancel_release_refund`; `/api/agent/preview` + `/api/agent/confirm` with `cancel_release`; Telegram adapter can route to the same bounded action when configured | Holder-approved release transfers the NFT back to treasury, moves testnet HBAR refund value to the holder, burns the NFT, emits `CANCEL_RELEASED`, and stores a recovery proof receipt |

## Where customer and provider “meet”

Both rely on the **same** on-chain + Mirror-derived status for a serial:

```mermaid
flowchart LR
  subgraph guest
    S["/slots"]
    D["/slots/serial"]
    M["/my-bookings"]
    R["/resale/serial"]
  end
  subgraph issuer
    I["/issuer"]
  end
  subgraph server
    API["POST /api/*"]
    Chain["Mirror + HTS state"]
  end
  S --> API
  R --> API
  I --> API
  API --> Chain
  D --> Chain
  M --> Chain
```

- **Customer** drives: book, recover/list resale, buy resale (and reads detail / hub).
- **Provider** drives: seed, freeze/unfreeze, mark used.
- **Convergence:** serial `N` has one lifecycle; pages re-read state after `router.refresh()` or navigation. There is no separate “guest DB” vs “issuer DB” for ownership — Redis holds slot **metadata**, active listings, and demo proof receipts; holder truth is chain + Mirror.

## Gap and orphan checklist

Use when auditing “are we missing something?”

| Item | Status |
|------|--------|
| F7 cancel / refund | Live for in-app Concierge release/refund and agent-safe `cancel_release`; latest proof is in `docs/TX-LOG.md`. Scheduled token release/expiry remains future work. |
| `POST /api/associate` in UI | Not linked — optional explicit associate for demos/debug |
| `GET /api/mirror` | Not linked from app — intentional tooling |
| `/api/agent/*` | Not linked from app — intentional agent/backend integration surface |
| Real tx proof lines | See `docs/TX-LOG.md`; re-run and extend after new testnet proof |
| Component inventory | This file — update when adding routes, `*Client.tsx`, shared app chrome, or route loading states |

## Last-minute improvement targets (product QA, Apr 2026)

Small, high-leverage UI/copy passes before demo freeze — no new flows required:

| Target | Where | Why |
|--------|--------|-----|
| **Resale “dead state” layout** | `ResaleClient` on `/resale/[serial]` | Fixed for terminal and policy-blocked states: manual **List** / **Buy** controls are hidden when the page has a resale block reason, and the page shows **No manual resale action available** instead. |
| **Unknown or retired serial** | Same | For refs outside the live inventory (e.g. after **Start over**), status lines can read like “nothing to resell yet” instead of “this ref is not in the current demo schedule.” Tighten wording to match `IssuerPanel`’s “not in the current session list” idea. |
| **Cross-role slot detail** | `/slots/[serial]` | Issuer sessions cannot open guest slot detail without switching to a guest account (`/login?need=user`). Document in demo script; optional future: read-only issuer peek (out of current scope). |
| **Mirror / Redis lag** | Browse, hub, resale | Already **Partial** in `PAGE-OVERVIEW.md`; a single “Refresh” or “state updates after chain” hint on resale after buy/list can reduce judge confusion. |

See **`docs/PAGE-OVERVIEW.md`** for route-by-route **Status** and the same items in narrative form.

## Surface split

- **Customer surfaces:** `/slots`, `/my-bookings`, `/resale/[serial]`
- **Shared truth surface:** `/slots/[serial]`
- **Provider surface:** `/issuer`

Keep that split visible in copy and controls. If a customer page starts explaining provider operations too early, it is drifting out of role.

## Related docs

- `docs/PAGE-OVERVIEW.md` — per-route purpose, controls, copy intent, and **Works / Partial / Review** status
- `docs/MARKET-VOCABULARY.md` — Web2 booking / class / ticket terminology vs our copy
- `docs/AGENT-INTEGRATION.md` — concrete backend and agent request / response examples for `/api/agent/*`
- `docs/DEMO.md` — shipped walkthrough
- `docs/INTERNAL.md` — local-only audits and checklists (`docs/internal/`, gitignored)

## Trust reminder (demo)

The browser still sends a demo **`actor`** for booking and resale actions, but those routes now also require a signed-in app session and enforce the locked demo user where applicable. This is still demo auth, not wallet auth. Security-sensitive checks (e.g. provider-only APIs, freeze vs Mirror holder, user A vs user B lock) live in **API routes**, not in client components. See `lib/auth/*`, `lib/validation/api.ts`, and individual `app/api/*/route.ts` files.
