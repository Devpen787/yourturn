# Page overview — purpose, controls, copy, clarity, status

**Purpose:** Single place to answer: *what is on each route, what can the user do, what the copy is trying to say, whether the job-to-be-done is obvious, and whether behaviour matches the labels.*  

**Not:** Full verbatim copy (that lives in components); automated QA. **Status** is a **living judgement** — re-check after meaningful UI or API changes.

**Legend — `Status`**

| Value | Meaning |
|-------|--------|
| **Works** | Label matches behaviour for the happy path; errors surface from API. |
| **Partial** | Mostly right; edge cases, naming drift, or demo-only caveats. |
| **Review** | Known gap, misleading line, or needs manual retest. |

**Cross-cutting:** `components/ActorSelector.tsx` is now the **customer-side** demo switcher on `/slots`, `/my-bookings`, and `/resale/*`. It only flips between **Person A** and **Person B**, and when you use the one-click demo sign-ins it can lock to the signed-in customer. `/issuer` is a separate provider dashboard surface, not part of the same customer switcher.

---

## Global chrome (`app/layout.tsx`, `components/SiteHeader.tsx`)

| Item | Detail |
|------|--------|
| **Purpose** | Brand + navigation on every page. |
| **Controls** | Links: **YourTurn** → `/`, **Browse** → `/slots` (nav item stays active on `/resale/*` too), **My passes** → `/my-bookings`, **Provider dashboard** → `/issuer` when shown; auth actions change between **Sign in / Register** and **Sign out** with a signed-in email label. **Provider dashboard** is omitted on customer routes unless `NEXT_PUBLIC_SHOW_PROVIDER_NAV_ON_CUSTOMER_PAGES=true`, or you are on `/` or `/issuer`. |
| **Copy role** | Consumer-first labels; provider dashboard as secondary entry. **Brand lab** is not in product nav (internal route only). |
| **Purpose clear?** | **Yes** for demo: customer routes first, provider dashboard secondary where visible. |
| **Status** | **Works** as navigation. |

---

## `/login` — Sign in

| Item | Detail |
|------|--------|
| **Purpose** | Enter the app as provider, demo user A, demo user B, or an email/password account. |
| **Controls** | **Demo issuer**, **Demo user A**, **Demo user B**; email/password form; forced logout helper when you need the other role; link to `/register`. |
| **Copy role** | Explains that app auth now sits above the Hedera demo actors, and that the demo A/B sign-ins are meant for split-browser or split-computer runs. |
| **Purpose clear?** | **Yes**. |
| **Status** | **Works**; one-click demo sign-in now lands on the correct protected surface. |

---

## `/register` — Create account

| Item | Detail |
|------|--------|
| **Purpose** | Create a guest app account with email + password. |
| **Controls** | Email field, password field, submit, link back to `/login`. |
| **Copy role** | Explains this is app account creation, not wallet auth. |
| **Purpose clear?** | **Yes**. |
| **Status** | **Works**. |

---

## `/` — Home (`app/page.tsx`)

| Item | Detail |
|------|--------|
| **Purpose** | Marketing + route into browse / passes / provider. |
| **Blocks** | `HomeHero`, `ExperiencePillars`, `StartFlowCta` (`components/home/*`). |
| **Controls** | **Browse sessions**, **Open my passes** (hero + customer CTA); **Open provider dashboard** (business card). |
| **Copy role** | Hero frames transferable bookings for service businesses; body copy is customer-first (“customers keep a pass…”) with explicit separation from the provider card. |
| **Purpose clear?** | **Yes** for browse + hub, with provider tools framed as a separate business surface. |
| **Status** | **Works** for navigation. |

---

## `/slots` — Public list (`SlotsClient`)

| Item | Detail |
|------|--------|
| **Purpose** | See sessions, status, **F1** book. |
| **Controls** | Customer-only compact `ActorSelector` (Person A / Person B); short demo-identity note linking to `/demo-help`; per row: **Session details** → `/slots/[serial]`, **Book** (only if `AVAILABLE`) opens a review dialog before the API call; empty state → **Open provider dashboard**; summary tile **Paused** = movement on hold. |
| **Copy role** | Explains AVAILABLE vs later states; readable session times, status hints + “Next step”, aggregate counts (Available / Held / Paused / Used), and explicit note that bookings are final in this demo. |
| **Purpose clear?** | **Yes** for booking; explains issuer prerequisite when empty. |
| **Status** | **Works**; success/error lines after `POST /api/book` now stay visible in-page with a HashScan link instead of relying on toast alone. Mirror lag may still need refresh — **Partial** UX. |

---

## `/slots/[serial]` — Slot detail (Server Component)

| Item | Detail |
|------|--------|
| **Purpose** | Truth panel for one serial: status, holder, policy fields, proof links, HCS filter, optional resale CTA. |
| **Controls** | Link **← All sessions**; **Sell pass** (`SlotResaleCta` → `/resale/[serial]` when allowed); external **HashScan** token/topic; optional metadata `<details>`. |
| **Copy role** | `statusSummary`, `nextStepSummary`; “Not booked yet” / Person A / Person B holder summary; readable start/end times; proof and audit sections clearly demoted as optional. |
| **Purpose clear?** | **Yes** for lifecycle and next step; still heavier than the browse and pass-hub screens. |
| **Status** | **Works**; invalid refs now return an explicit “Session not found” state, while Redis/Mirror/token errors still return plain `<p>` messages and the audit trail can show no events — **Partial** polish. |

---

## `/my-bookings` — Hub (`MyBookingsClient`)

| Item | Detail |
|------|--------|
| **Purpose** | Passes held by **selected guest** (Mirror-backed); links to detail / resale. |
| **Controls** | Customer-only `ActorSelector` (Person A / Person B); short demo-identity note linking to `/demo-help`; per held row: **Session details**, **Sell pass** (if allowed + HELD); **Refresh** (router.refresh); empty state → **Browse sessions**. |
| **Copy role** | “What you can do next”; status copy for HELD/FROZEN/USED; **Ref #** on rows; explicit note that **Session details** is where the full lifecycle history and proof links live; **Recently finished in this demo** clearly labelled as shared demo history for USED. |
| **Purpose clear?** | **Yes** for demo; explains Mirror-derived view. |
| **Status** | **Works**; token missing → init message. The finished-history section is honest about being shared demo history rather than filtered personal history — **Works**. |

---

## `/resale/[serial]` — Resale (page + `ResaleClient`)

| Item | Detail |
|------|--------|
| **Purpose** | **F2** — list at ask, buy listing; explain royalty handoff. |
| **Controls** | Link back to session; customer-only `ActorSelector` (seller / buyer); short demo-identity note linking to `/demo-help`; **Ask** input; **List this pass** and **Buy this pass** both open review dialogs before the API call; success/error blocks. |
| **Copy role** | Resale vs free transfer clarified; fixed **10%** **provider fee on resale**; estimate disclaimer; explicitly states that listing is the seller approval and buying transfers immediately. |
| **Purpose clear?** | **Yes** for demo roles; buyer must understand **actor = payer**. |
| **Status** | **Works** when token + listing state correct; listing and buy confirmations stay visible in-page with proof links. **Partial** for two reasons: (1) judges may expect marketplace discovery; (2) when the pass is **USED** or otherwise not resellable, primary actions are correctly disabled but the long “how resale works” blocks can still read like an active next step. **Review** for unknown / stale serials after **Start over**: messaging should not sound like “no holder yet” when the ref is simply outside the current demo mint set. |

---

## `/issuer` — Provider dashboard (`IssuerPanel`)

| Item | Detail |
|------|--------|
| **Purpose** | Separate provider dashboard: define the business-facing demo sessions, set up the business, inspect live sessions, **F3** pause/reopen pass, **F4** check-in / mark used. |
| **Controls** | Provider banner; **Upcoming sessions** preview; **Live inventory snapshot**; **Business name** field; 3 editable session cards (**Service**, **Starts**, **Ends**, **Location**, **Price**, **Resale**); **Save session plan**; **Set up business**, **Create demo sessions**, **Start over** (typed confirm); table column **Ref**, **Use this pass**; pause: **Ref #** + Person, **Pause pass** (confirm) / **Reopen pass**; check-in: **Ref #**, **Check in / mark used** (typed confirm); **System details** disclosure for token/topic ids. |
| **Copy role** | Business view first; session-planning language is plain English; upcoming schedule and inventory counts make the page read more like a dashboard; destructive actions now explain what is irreversible before commit; system ids stay behind a disclosure; **How this dashboard works** bullets keep pause and check-in grounded in provider tasks. |
| **Purpose clear?** | **Yes** for operators; still dense because setup, live oversight, and redemption all share one page — **Partial**. |
| **Status** | **Works**; saving the session plan persists through `/api/session-plan`, and **Create demo sessions** / **Start over** now pull from that saved plan. Provider actions also leave a durable in-page confirmation instead of only a toast. Holder mismatch still returns inline API feedback — **Works**. |

---

## API-only (no dedicated UI page)

| Surface | Purpose |
|---------|--------|
| `POST /api/agent/*` | Agent integration — see `docs/AGENT-INTEGRATION.md`, `docs/UI-MAP.md`. |
| `POST /api/associate`, `GET /api/mirror` | Tooling / debug, not linked from shipped consumer UI. |

---

## `/demo-help` — Demo explainer

| Item | Detail |
|------|--------|
| **Purpose** | Explain Person A / Person B / Provider, which actions require confirmation, and current demo limits. |
| **Controls** | Static read-only help page linked from customer surfaces. |
| **Copy role** | Keeps demo-identity disclosure inside the app instead of expecting technical context from README alone. |
| **Purpose clear?** | **Yes**. |
| **Status** | **Works**. |

---

## Shared UI infrastructure

| Surface | Detail |
|---------|--------|
| `components/ui/Button.tsx` | Shared action primitive with loading state, spinner, and focus treatment. |
| `components/ui/LiveFeedback.tsx` | Inline success/error feedback used on booking, resale, and provider actions. |
| `components/ui/Skeleton.tsx` | Loading placeholder primitive for route-level `loading.tsx` files. |
| `app/**/loading.tsx` | Route loading shells for browse, detail, hub, resale, and provider dashboard. |

---

## How to use this doc in review

1. Walk route-by-route with **`docs/DEMO.md`** and tick **Purpose clear?** / **Status** from a real run.  
2. If you change a **button label** or **section**, update the relevant row here in the **same PR** (lightweight).  
3. For stakeholder “expectations”, cross-check **`docs/PERSONAS-EXPECTATIONS.md`**.  
4. For wiring and APIs, **`docs/UI-MAP.md`** remains canonical.

---

## Last-minute improvement candidates (Apr 2026)

Prioritised from exploratory demo runs (happy path + edge cases). Implement only what fits before freeze; otherwise treat as post-hack backlog.

1. **`/resale/[serial]` — terminal / invalid states:** When list and buy are off, replace or shorten the instructional blocks so the page reads “closed / not in this demo” rather than “here is how you trade.” Align unknown-serial copy with issuer “not in current session list” language.  
2. **Cross-page consistency:** After check-in, **`/slots/[serial]`** is the clearest “USED” truth; **`/resale/[serial]`** should not contradict it in tone. Optional one-line pointer: “Open session details for full status.”  
3. **Issuer ↔ slot detail:** Issuer accounts are blocked from `/slots/*` by design; keep **`docs/DEMO.md`** explicit about switching to a guest to open **Session details** (no code change required if the script is clear).  
4. **Mirror lag:** Reuse existing **Refresh** patterns; a short note after resale actions is enough if a full auto-poll is out of scope.

Table form of the same list lives in **`docs/UI-MAP.md`** (“Last-minute improvement targets”).

---

## Changelog

- **2026-04-04:** Synced global nav description (Browse includes `/resale`, conditional provider link, no Brand lab in product nav); home hero copy intent; resale **Partial** / **Review** notes and consolidated improvement list; cross-link to **`docs/UI-MAP.md`** improvement table.
- **2026-04-05:** Compact customer switcher on browse / passes / resale, softer provider nav, readable session times on browse/detail, and provider system ids moved behind disclosure.
- **2026-04-05:** Provider dashboard gained editable business setup and a saved 3-session plan; mint/reset now follow that saved plan instead of only file-seeded defaults.
- **2026-04-05:** Split the app more clearly into customer surfaces, a shared truth page, and a provider dashboard; actor switcher now stays on customer routes only.
- **2026-04-05:** Synced with market-vocab copy pass: session details, Ref #, provider dashboard labels, Sell pass, PAGE-OVERVIEW control rows updated.
- **2026-04-05:** Initial page overview (home split into `components/home/*`; issuer “Redeem / mark used” label).
