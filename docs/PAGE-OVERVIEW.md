# Page overview — purpose, controls, copy, clarity, status

**Purpose:** Single place to answer: *what is on each route, what can the user do, what the copy is trying to say, whether the job-to-be-done is obvious, and whether behaviour matches the labels.*  

**Not:** Full verbatim copy (that lives in components); automated QA. **Status** is a **living judgement** — re-check after meaningful UI or API changes.

**Legend — `Status`**

| Value | Meaning |
|-------|--------|
| **Works** | Label matches behaviour for the happy path; errors surface from API. |
| **Partial** | Mostly right; edge cases, naming drift, or demo-only caveats. |
| **Review** | Known gap, misleading line, or needs manual retest. |

**Cross-cutting:** `components/ActorSelector.tsx` on `/slots`, `/my-bookings`, `/resale/*`, `/issuer` — picks **issuer / guestA / guestB**, persists in `localStorage`. Purpose: **demo identity**, not real auth.

---

## Global chrome (`app/layout.tsx`)

| Item | Detail |
|------|--------|
| **Purpose** | Brand + navigation on every page. |
| **Controls** | Links: **YourTurn** → `/`, **Browse** → `/slots`, **My passes** → `/my-bookings`, **Provider tools** → `/issuer`. |
| **Copy role** | Consumer-first labels; issuer entry is visible to everyone (demo trade-off). |
| **Purpose clear?** | Partial — guests can open provider tools; see `docs/REVIEW-CHECKLIST.md` §3. |
| **Status** | **Works** as navigation; **Review** if you need to hide issuer for production. |

---

## `/` — Home (`app/page.tsx`)

| Item | Detail |
|------|--------|
| **Purpose** | Marketing + route into browse / passes / provider. |
| **Blocks** | `HomeHero`, `ExperiencePillars`, `StartFlowCta` (`components/home/*`). |
| **Controls** | **Browse sessions**, **Open my passes** (hero + guest CTA); **Open provider tools** (provider card). |
| **Copy role** | Value prop (“book like a pass”, provider rules); pillars “Pick a time / Keep your place / Pass it on”. |
| **Purpose clear?** | **Yes** for browse + hub. Pillar “transfer or resell” is **broader than shipped UI** (resale path exists; separate gift/transfer does not) — **Partial** honesty. |
| **Status** | **Works** for navigation; **Review** pillar vs spec if judges read literally. |

---

## `/slots` — Public list (`SlotsClient`)

| Item | Detail |
|------|--------|
| **Purpose** | See sessions, status, **F1** book. |
| **Controls** | `ActorSelector`; per row: **Session details** → `/slots/[serial]`, **Book** (only if `AVAILABLE`); empty state → **Open provider dashboard**; summary tile **Paused** = movement on hold. |
| **Copy role** | Explains AVAILABLE vs later states; status hints + “Next step”; aggregate counts (Available / Held / Paused / Used). |
| **Purpose clear?** | **Yes** for booking; explains issuer prerequisite when empty. |
| **Status** | **Works**; success/error lines after `POST /api/book`; Mirror lag may need refresh — **Partial** UX. |

---

## `/slots/[serial]` — Slot detail (Server Component)

| Item | Detail |
|------|--------|
| **Purpose** | Truth panel for one serial: status, holder, policy fields, proof links, HCS filter, optional resale CTA. |
| **Controls** | Link **← All sessions**; **Sell pass** (`SlotResaleCta` → `/resale/[serial]` when allowed); external **HashScan** token/topic; optional metadata `<details>`. |
| **Copy role** | `statusSummary`, `nextStepSummary`; active listing banner; technical / audit sections labelled. |
| **Purpose clear?** | **Yes** for lifecycle and next step; heavier for non-technical users at bottom. |
| **Status** | **Works**; Redis/Mirror/token errors return plain `<p>` messages — **Partial** polish. |

---

## `/my-bookings` — Hub (`MyBookingsClient`)

| Item | Detail |
|------|--------|
| **Purpose** | Passes held by **selected guest** (Mirror-backed); links to detail / resale. |
| **Controls** | `ActorSelector`; per held row: **Session details**, **Sell pass** (if allowed + HELD); **Refresh** (router.refresh); empty state → **Browse sessions**; **Provider** selected → switch to Person A/B. |
| **Copy role** | “What you can do next”; status copy for HELD/FROZEN/USED; **Ref #** on rows; **Recently finished** for USED. |
| **Purpose clear?** | **Yes** for demo; explains Mirror-derived view. |
| **Status** | **Works**; token missing → init message — **Works**. |

---

## `/resale/[serial]` — Resale (page + `ResaleClient`)

| Item | Detail |
|------|--------|
| **Purpose** | **F2** — list at ask, buy listing; explain royalty handoff. |
| **Controls** | Link back to session; `ActorSelector`; **Ask** input; **List this pass**; **Buy this pass** (disabled unless listing active); success/error blocks. |
| **Copy role** | Resale vs free transfer clarified; fixed **10%** **provider fee on resale**; estimate disclaimer. |
| **Purpose clear?** | **Yes** for demo roles; buyer must understand **actor = payer**. |
| **Status** | **Works** when token + listing state correct; **Partial** if users expect marketplace discovery. |

---

## `/issuer` — Provider dashboard (`IssuerPanel`)

| Item | Detail |
|------|--------|
| **Purpose** | Seed environment, inspect table, **F3** pause/reopen pass, **F4** check-in / mark used. |
| **Controls** | `ActorSelector`; **Set up business**, **Create demo sessions**, **Start over**; table column **Ref**, **Use this pass**; pause: **Ref #** + Person, **Pause pass** / **Reopen pass**; check-in: **Ref #**, **Check in / mark used**. |
| **Copy role** | Pass token / audit topic / session count; **How this dashboard works** bullets; plain-language pause and check-in. |
| **Purpose clear?** | **Yes** for operators; dense — **Partial** for first-time readers (everything on one page). |
| **Status** | **Works**; API errors shown inline; holder mismatch → 409 message — **Works**. |

---

## API-only (no dedicated UI page)

| Surface | Purpose |
|---------|--------|
| `POST /api/agent/*` | Agent integration — see `docs/AGENT-INTEGRATION.md`, `docs/UI-MAP.md`. |
| `POST /api/associate`, `GET /api/mirror` | Tooling / debug, not linked from shipped consumer UI. |

---

## How to use this doc in review

1. Walk route-by-route with **`docs/DEMO.md`** and tick **Purpose clear?** / **Status** from a real run.  
2. If you change a **button label** or **section**, update the relevant row here in the **same PR** (lightweight).  
3. For stakeholder “expectations”, cross-check **`docs/PERSONAS-EXPECTATIONS.md`**.  
4. For wiring and APIs, **`docs/UI-MAP.md`** remains canonical.

---

## Changelog

- **2026-04-05:** Synced with market-vocab copy pass: session details, Ref #, provider dashboard labels, Sell pass, PAGE-OVERVIEW control rows updated.
- **2026-04-05:** Initial page overview (home split into `components/home/*`; issuer “Redeem / mark used” label).
