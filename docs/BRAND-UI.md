# Brand UI system (YourTurn)

Single reference for **visual identity**, **design tokens**, and **how to apply them in code** so product, lab, and future screens stay aligned.

**Canonical product mark (locked direction):** **Calendar + turn** — scheduling (calendar frame + arc) plus motion (turn arrow). See `components/brand-lab/brandLogoVariants.tsx` (`MarkCalendarTurn`) and token names `brand.mark` / `brand.schedule` / `brand.motion`.

---

## For agents and LLMs — what to use when

This section is written for **autonomous coders and LLMs** (including Cursor). Follow it when touching `app/**/*.tsx`, `components/**/*.tsx`, `app/globals.css`, or `tailwind.config.ts`.

### Load order

1. This file (`docs/BRAND-UI.md`), at least **this section** + **§2 Colour tokens** + **§8 Components**.
2. If the task touches **`/brand-lab`** or `components/brand-lab/**`: read **§12** end-to-end (routes, `#fragment` ids, render order, mock inventory, checklists). Optionally diff **`docs/BRAND-UI-APPENDIX.generated.md`** after **`npm run docs:brand-appendix`** to verify exports and anchors.
3. Repo rule: **`.cursor/rules/brand-ui.mdc`** applies when matching paths are edited in Cursor.

### Decision table (quick)

| You are adding or changing… | Use this |
|------------------------------|----------|
| Logo / wordmark in product UI | `BrandLockup`, `BrandMark`, or `BrandWordmark` from `components/brand-lab/brandLogoVariants.tsx`, variant **`calendarTurn`**. |
| “YourTurn” colours (frame, arc, arrow, wordmark accent) | Tailwind **`brand-*`** classes (`text-brand-mark`, `stroke-brand-schedule`, `stroke-brand-motion`, `text-brand-word-accent`, …). |
| Ordinary text, borders, chrome | **`slate-*`** (and existing blue/amber/emerald/red for status and buttons). |
| Page background / marketing wash | **`brand-canvas`** / **`brand-canvas-mid`** via `body` tokens in `globals.css` — do not fork a second gradient without updating `:root`. |
| Frosted card, signature hero band | Constants from **`lib/ui/glass-classes.ts`** + `cn()` — not hand-pasted blur/shadow strings. |
| Primary / secondary / danger buttons | **`getButtonClassName`** from `components/ui/button-classes.ts`. |
| Text links | **`textLink`** variant or **`text-brand-link`** consistently. |
| Pass row, money, serials, times | **`tabular-nums`**; tight **eyebrow** caps (see §3). |
| Session / chain status badge | **§2** status table (slate / blue / amber / emerald + rings where specified). |
| Dense pass summary hero | Reuse **`components/slots/SlotPassHeroCard.tsx`** or match its patterns. |
| Brand lab static mocks only | **`components/brand-lab/LabMockPrimitives.tsx`** — **never** import into `app/**` product routes. |
| A colour that does not exist yet | **Four files in one PR:** `app/globals.css` (`:root`), `tailwind.config.ts` (`brand.*`), `lib/ui/brand-tokens.ts` (name), `docs/BRAND-UI.md` §2 (row in table). |
| Anything under **`/brand-lab`** or **`components/brand-lab/**`** | **`docs/BRAND-UI.md` §12** (routes, `#fragment` registry, file inventory, checklists) + obey **lab-only** rules (no `LabMockPrimitives` in `app/**`). |

### What “you should still do” meant (humans vs agents)

- **Agents:** Nothing extra — follow the table above and `.cursor/rules/brand-ui.mdc`. That is the full contract for code.
- **Humans / org:** Optional **Figma** variables, **README** one-liner, **exported SVG/PNG** marks for marketing — outside the repo’s automatic enforcement; they reduce drift but are not required for the app to build correctly.

---

## 1. Source of truth map

| Layer | Role |
|--------|------|
| **`app/globals.css`** | `:root` CSS variables (colours, canvas gradient, focus). **Edit here first** when changing brand colours. |
| **`tailwind.config.ts`** | Maps those variables to Tailwind (`bg-brand-mark`, `text-brand-schedule`, …). |
| **`lib/ui/glass-classes.ts`** | Composed **glass / signature surfaces** (cards, panels, sticky bar). Prefer importing constants + `cn()`. |
| **`lib/ui/brand-tokens.ts`** | TypeScript names for variables (docs, tests, codegen). |
| **This doc** | Rules, patterns, accessibility, and **rollout checklist**. |

If Figma (or another tool) is added later, treat **CSS variables** as the contract: design tokens in Figma should match `:root` names and values.

---

## 2. Colour tokens

Semantic names tie to the **calendar + turn** story; use Tailwind classes in UI.

| Token (Tailwind) | CSS variable | Use |
|------------------|--------------|-----|
| `brand-mark` | `--brand-mark` | Calendar frame, primary wordmark “Your”, monogram fill, primary type on light surfaces. |
| `brand-schedule` | `--brand-schedule` | Scheduling arc in the mark, sky accents, pass “next step” emphasis (pair with tints in components). |
| `brand-motion` | `--brand-motion` | Turn arrow in the mark, secondary accent strokes. |
| `brand-word-accent` | `--brand-word-accent` | Wordmark **“Turn”** on white (darker than mark strokes for readability). |
| `brand-link` | `--brand-link` | Inline text links (matches existing `textLink` pattern). |
| `brand-canvas` / `brand-canvas-mid` | `--brand-canvas`, `--brand-canvas-mid` | Page wash / gradient endpoints (see `body` in `globals.css`). |

**Neutrals:** Keep using Tailwind **slate** scales for body copy, borders, and disabled states unless a screen explicitly needs brand colours.

**Status (product semantics, not logo colours):**

| Status | Typical surface | Notes |
|--------|-----------------|--------|
| AVAILABLE | `slate` | Neutral “open” |
| HELD | `blue` + light ring | Active pass |
| FROZEN | `amber` + light ring | Paused |
| USED | `emerald` + light ring | Completed |
| Destructive / check-in | `red` / `rose` | Use existing button variants |

---

## 3. Typography

- **Stack:** System UI sans (Tailwind default / browser). No custom font files in repo today.
- **Hierarchy:** Page title `text-xl font-semibold`; section titles `font-medium text-slate-900`; supporting `text-sm` / `text-xs text-slate-600`.
- **Eyebrows:** `text-[10px] font-semibold uppercase tracking-[0.16em]` or `tracking-wider` — used on pass-style cards (session, browse row, lab mocks).
- **Money & refs:** `tabular-nums` for ℏ amounts, serials, and timestamps in dense UI.
- **Wordmark:** “Your” + “Turn” split: `text-brand-mark` + `text-brand-word-accent` (see `BrandWordmark`).

---

## 4. Layout & spacing

- **App shell:** `main` uses `mx-auto max-w-5xl px-4 py-6` (`app/layout.tsx`). New full-width marketing pages may break out intentionally; default product stays in this rail.
- **Touch targets:** Prefer **min 44×44px** for primary actions (buttons, sticky bars) — already enforced in `button-classes.ts`.
- **Safe area:** `pb-[max(1.5rem,env(safe-area-inset-bottom))]` on `main` for notched devices.

---

## 5. Radius, elevation, glass

- **Cards:** `rounded-xl` to `rounded-2xl` for product cards; **signature / hero** bands use `rounded-[1.75rem]` via `signatureSurfaceCanvas`.
- **Rings:** Subtle `ring-1 ring-slate-900/[0.03–0.04]` on elevated glass; status pills may add `ring-1` in `blue` / `amber` / `emerald` tints.
- **Glass:** Do **not** hand-roll long blur/border strings in new screens — compose from `lib/ui/glass-classes.ts` (`glassSection`, `glassPanel`, `glassInset`, `signatureSurfaceCanvas`, …). Extend that file if a **new** surface type is needed, then document the export here.

---

## 6. Motion

- **Respect `prefers-reduced-motion`:** `globals.css` already disables spin/pulse for reduced motion. Avoid decorative auto-animations on critical paths; keep transitions to `transition-colors` where possible.

---

## 7. Logo usage (calendar + turn)

- **Default variant in product:** `calendarTurn` when showing mark + wordmark together.
- **Minimum mark size:** 24px for favicon-style; **32px** (`h-8 w-8`) for header / list rows; larger only when hero context demands it.
- **Do not:** change arc vs arrow colours independently in product without updating `:root`; do not place the full-colour mark on busy photographs without a backing plate (use `glassInset` or solid `white/slate` chip).

Implementation: `BrandMark`, `BrandWordmark`, `BrandLockup`, `BrandFaviconMark` in `brandLogoVariants.tsx` — mark paths should use **`brand-*` utilities** so they track tokens.

---

## 8. Components (existing contracts)

| Area | File / pattern |
|------|----------------|
| Buttons & focus ring | `components/ui/button-classes.ts` — `focus-visible:ring-brand-focus ring-offset-2` |
| Primary CTA | `variant="primary"` (slate) |
| Positive money / buy | `primarySuccess` (emerald) |
| Warning / pause | `amber` variant |
| Text links | `textLink` (maps to `brand-link` colour family) |
| Pass summary hero | `components/slots/SlotPassHeroCard.tsx` |
| Lab-only composed mocks | `components/brand-lab/LabMockPrimitives.tsx` (not for production routes) |

When adding a **new** button style, extend `button-classes.ts` and add a row to this table.

---

## 9. Accessibility checklist (per screen)

- [ ] Focus visible on all interactive elements (keyboard).
- [ ] Colour is not the only cue for status (pair pill + text).
- [ ] Contrast: body text on `slate-50/white` meets WCAG AA for normal text; `text-slate-600` for secondary is acceptable on large areas only — prefer `text-slate-700` for small labels if in doubt.
- [ ] Hit targets ≥ 44px where users tap (mobile).

---

## 10. Engineer rollout checklist (so nothing is missed)

When touching **any** customer or issuer screen:

1. **Colours:** Prefer `brand-*` only for **brand moments** (logo, hero accents, schedule/motion cues). Keep functional UI on slate/semantic palettes.
2. **Surfaces:** Use `glass-*` helpers or existing card patterns from brand-lab-aligned components before inventing new shadows.
3. **Type:** Eyebrows + `tabular-nums` for pass/session density.
4. **Status:** Match domain status → pill + copy (see §2 table).
5. **Links:** Use `getButtonClassName('textLink')` or `text-brand-link` consistently.
6. **Documentation:** If you introduce a **new** token or surface, update **`globals.css`**, **`tailwind.config.ts`**, **`lib/ui/brand-tokens.ts`**, and **this file** in the same PR.

When adding **marketing** or **empty states:**

- Reuse **signature band** pattern (`signatureSurfaceCanvas` + soft gradient orbs) from brand lab for hero sections.
- Align wordmark with **BrandWordmark** rules.

---

## 11. What we have not centralised yet (intentional backlog)

- **Spacing scale** beyond app shell (no custom `spacing` theme yet — Tailwind default is OK).
- **Dark mode** — not active; tokens assume light UI.
- **Icon set** — ad hoc SVGs; if Lucide/Heroicons is adopted, document stroke width (1.5–2) to sit near the mark.
- **Figma variables** — add when a design file exists; mirror `:root` names.

---

## 12. Brand lab — executable reference (routes, anchors, files)

This section is **normative** for anyone implementing or reviewing brand-lab work: **URLs, DOM ids, source files, render order, and rules**. If code and this section disagree, **fix the code or update this section in the same change**.

### 12.1 Authority

- **Product spec** for visuals: **§0–§11** of this doc + `app/globals.css` + `tailwind.config.ts` + `lib/ui/glass-classes.ts`.
- **Brand lab** (`/brand-lab`): internal **reference and exploration** only (`robots: noindex` on `app/brand-lab/page.tsx` and `app/brand-lab/assistant/page.tsx`). It does **not** override tokens or DECISIONS.
- **Canonical logo in product:** **calendar + turn** (`BrandLogoVariantId` = `calendarTurn` in `components/brand-lab/brandLogoVariants.tsx`).

### 12.2 How to run (execute)

1. From repo root: `npm run dev` (default dev server: **port 3000** per `package.json`).
2. Open **`http://localhost:3000/brand-lab`** (hyphen required for this page).
3. **Alias:** `http://localhost:3000/brandlab` → redirects to `/brand-lab` (`app/brandlab/page.tsx`).
4. Assistant-only surface: **`http://localhost:3000/brand-lab/assistant`**.
5. After editing lab components, hard-refresh the browser if HMR leaves stale CSS.

### 12.3 Routes → entry files

| URL path | App Router file | Primary UI export |
|----------|-----------------|-------------------|
| `/brand-lab` | `app/brand-lab/page.tsx` | Renders page header + `<BrandLabClient marketingComposites={<BrandLabMarketingComposites />} />` |
| `/brand-lab/assistant` | `app/brand-lab/assistant/page.tsx` | Renders nav link back to full lab + `<BrandLabAgentPrototype mode="customerOnly" />` |
| `/brandlab` | `app/brandlab/page.tsx` | `redirect("/brand-lab")` only |

### 12.4 Fragment IDs (in-page anchors)

Use these **exact** fragments after `/brand-lab` (or `http://localhost:3000/brand-lab#…`). Elements use `scroll-mt-24` where noted so fixed headers do not cover titles.

| Fragment | Full example URL | Defined in | Notes |
|----------|------------------|------------|--------|
| `#signature` | `http://localhost:3000/brand-lab#signature` | `components/brand-lab/BrandLabConcepts.tsx` — root `<div id="signature" className="scroll-mt-24 …">` | **Signature surfaces** band. Linked from lab nav and from flow mock copy (`href="#signature"`). |
| `#flow-mocks` | `http://localhost:3000/brand-lab#flow-mocks` | `components/brand-lab/BrandLabFlowMocks.tsx` — root `<div id="flow-mocks" …>` | **Product flow mocks** grid. |
| `#agent-ux` | `http://localhost:3000/brand-lab#agent-ux` | `components/brand-lab/BrandLabClient.tsx` — wrapper `<div id="agent-ux" className="scroll-mt-24 …">` | **Assistant-style prototype** heading + `BrandLabAgentPrototype` (`mode="lab"`). |
| `#logo-lab` | `http://localhost:3000/brand-lab#logo-lab` | `components/brand-lab/BrandLabClient.tsx` — `<div id="logo-lab" className="scroll-mt-24 …">` | Logo direction picker + favicon/header/hero/placement mocks. |
| `#ui-kit` | `http://localhost:3000/brand-lab#ui-kit` | `components/brand-lab/BrandLabClient.tsx` — `<div id="ui-kit" …>` | **UI kit** (`BrandLabUiKit`). |
| `#marketing` | `http://localhost:3000/brand-lab#marketing` | `components/brand-lab/BrandLabClient.tsx` — conditional wrapper | Only rendered if `marketingComposites` prop is passed (it is passed from `app/brand-lab/page.tsx`). |

**No fragment:** `/brand-lab/assistant` is a separate route (no `#agent-ux`; it embeds the prototype directly).

### 12.5 Lab page nav (Story & UX / Systems) — exact links

Rendered inside `BrandLabClient.tsx` (amber “Internal” callout). These are the **authoritative** in-page links:

**Story & UX**

- `href="#signature"` — label: “Signature surfaces”
- `href="#flow-mocks"` — label: “Flow mocks”
- `href="#agent-ux"` — label: “Assistant-style UI”
- `href="/brand-lab/assistant"` — label: “Same UI, no side panel (prototype)”

**Systems & marketing**

- `href="#logo-lab"` — label: “Logo directions”
- `href="#ui-kit"` — label: “UI kit”
- `href="#marketing"` — label: “Marketing” (only if composites present)

### 12.6 Render order on `/brand-lab` (top → bottom)

Order spans **`app/brand-lab/page.tsx`** and **`BrandLabClient.tsx`**. When documenting a new block, **insert it here and in code in the same PR**.

0. **`app/brand-lab/page.tsx` (page shell, above client tree)** — `<header>`: `h1` “Brand lab”, decorative gradient rule (`from-sky-500/75 via-sky-400/45`), subtitle “Internal — design and UX reference…”. **`metadata`**: `title: "Brand lab"`, internal description, **`robots: { index: false, follow: false }`**. Then **`BrandLabClient`** with `marketingComposites={<BrandLabMarketingComposites />}`.

1. **Internal banner** (amber) + **nav** (§12.5) — inside `BrandLabClient.tsx`.
2. **`<BrandLabConcepts />`** — anchor `#signature`. Contains `LabSectionLead` + concept cards + proposed confirm card + `glassBrandStrip` footer. File: `components/brand-lab/BrandLabConcepts.tsx`. Uses `signatureSurfaceCanvas`, `glassPanel`, `glassInset`, `glassPillSoft`, `glassPillMuted`, `glassBrandStrip` from `lib/ui/glass-classes.ts`; `Button`, `QrDecor` local.
3. **Border divider** then **`<BrandLabFlowMocks />`** — anchor `#flow-mocks`. File: `components/brand-lab/BrandLabFlowMocks.tsx`. Uses `LabMockPrimitives.tsx` (**lab-only**; **do not** import from `app/**`). Local helpers **`PersonaStripMock`**, **`MockShell`**, **`statusTone`** are **not** exported — defined only in this file.
4. **Assistant block** — `id="agent-ux"`: heading “Assistant-style prototype (not an LLM)” + **`<BrandLabAgentPrototype mode="lab" />`**. File: `components/brand-lab/BrandLabAgentPrototype.tsx`.
5. **Logo directions** — `id="logo-lab"`: heading + sticky **variant picker** (`BRAND_VARIANT_OPTIONS` from `brandLogoVariants.tsx`) + subsections: **Browser tab** (`FakeWindow` + `BrandFaviconMark`), **Global header** (`BrandLockup`), **Home hero**, **Browse sessions**, **My passes**, **Provider dashboard**, **Resale handoff**, **Share / system sheet**. **`FakeWindow`** / **`Section`** are **local** to `BrandLabClient.tsx` (not shared exports).
6. **UI kit** — `id="ui-kit"`: heading + **`<BrandLabUiKit />`**. File: `components/brand-lab/BrandLabUiKit.tsx`. **`LabSection`** is local to that file.
7. **Marketing** — `id="marketing"`: heading + **`<BrandLabMarketingComposites />`**. File: `components/brand-lab/BrandLabMarketingComposites.tsx` (wraps `HomeHero`, `ExperiencePillars`, `StartFlowCta` from `components/home/*`). **`CompositeSection`** is local to that file.

Supporting components:

- `components/brand-lab/LabSectionLead.tsx` — used inside `BrandLabConcepts` (and elsewhere if added).
- `components/brand-lab/LabMockPrimitives.tsx` — **only** consumed by `BrandLabFlowMocks.tsx`.

### 12.7 Product flow mocks — `MockShell` inventory

All inside `BrandLabFlowMocks.tsx`, inside `#flow-mocks`. Each `MockShell` shows a **route pill** (`route` prop), **title**, **description**, and static content. **No** production API calls; copy in file is the source of truth for mock text.

| Title (UI) | `route` prop | Product route mirrored | Notable implementation |
|------------|--------------|-------------------------|-------------------------|
| Available sessions | `/slots` | `app/slots/*` | `PersonaStripMock`, stats tiles, **`LabSessionBrowseRow`**, violet “Proposed” note linking `#signature`. |
| Session detail | `/slots/[serial]` | `app/slots/[serial]/page.tsx` | **`SlotPassHeroCard`**, `LabAlertCallout` (listing), **`LabProofLinksPanel`**, **`LabPassHistoryTimeline`**, footer note on `SlotDetailStickyBar`. |
| Resell this pass | `/resale/[serial]` | `app/resale/[serial]/*` | `PersonaStripMock`, stacked **`LabAlertCallout`** (info/warn/success), **`LabResalePricingStrip`**, confirm cards, `ResaleClient` note. |
| My passes | `/my-bookings` | `app/my-bookings/*` | **`LabMyPassTile`**, empty-state note. |
| Provider dashboard | `/issuer` | `app/issuer/*` | Business banner, table, freeze panel (Ref/Holder/Mirror tiles + guardrail), check-in + proposed confirm. |
| Empty & blocked copy | `Various` | N/A | **`LabEmptyStatePatterns`** rows. |

**Lead copy** for the band: `LabSectionLead` inside `BrandLabFlowMocks` — eyebrow “YourTurn · flows”, title “Product flow mocks”, static disclaimer about not calling the server.

### 12.8 UI kit — `LabSection` titles (BrandLabUiKit.tsx)

Each row is a subsection inside `#ui-kit`. Primary implementation file: **`components/brand-lab/BrandLabUiKit.tsx`**. Match product to these patterns before inventing new ones.

| Section title | Primary product / file reference (from description or intent) |
|---------------|------------------------------------------------------------------|
| Typography | Rhythm for `app/**` pages (h1/h2/eyebrow/body/mono). |
| Button | `components/ui/Button.tsx` + `button-classes.ts` — variants listed in code (`BUTTON_VARIANTS`). |
| ButtonLink | `components/ui/ButtonLink.tsx`. |
| Table & compact actions | `getButtonClassName("table")` — issuer rows. |
| LiveFeedback | `components/ui/LiveFeedback.tsx`. |
| Toast stack | `useToast()` / `ToastProvider` — app root. |
| Spinner & Skeleton | `components/ui/Spinner.tsx`, `Skeleton.tsx`. |
| Status chips | Tones aligned with browse / slot detail status pills. |
| Surfaces & callouts | Neutral / warning / positive / error panel pattern. |
| Form control | Resale / issuer-style inputs, `min-h-[44px]`. |
| Disclosure (details) | Issuer-style `<details>` pattern. |
| ActorSelector | `components/ActorSelector.tsx` — **two** demos with distinct `actorStorageKey` (`brandlab:actor:compact`, `brandlab:actor:full`). |
| Sticky mobile action bar | Pattern for resale / session detail sticky bars. |
| Site header (reference) | **`components/SiteHeader.tsx`** — not duplicated; navigate real app for active states. |

### 12.9 Logo directions — variant ids and usage

Defined in **`components/brand-lab/brandLogoVariants.tsx`**:

| `BrandLogoVariantId` | Label (UI) | Product use |
|----------------------|------------|-------------|
| `text` | Text only | Matches minimal header / wordmark only. |
| `calendarTurn` | Calendar + turn | **Default for product** (DECISIONS + §0). |
| `dualSlot` | Double slot | Exploration only in lab. |
| `ticketQueue` | Ticket + queue | Exploration; wordmark styling matches calendar+turn branch in `BrandWordmark`. |
| `monogram` | YT monogram | Favicon / compact mark exploration. |

**Execution:** Changing SVG paths or colours for `calendarTurn` must keep **`brand-*`** Tailwind classes (or update `:root` + §2 in the same PR).

### 12.10 Assistant prototype — behaviour contract

**Component:** `components/brand-lab/BrandLabAgentPrototype.tsx`.

| Prop `mode` | Where used | UI difference |
|-------------|------------|----------------|
| `lab` (default) | `/brand-lab#agent-ux` | Full lab chrome (assistant toggle, live API toggle, issuer actor, side tooling as implemented in file). |
| `customerOnly` | `/brand-lab/assistant` | Narrower layout; same scripted / pattern-matched demo (see opening assistant message in code). |

**Not an LLM:** Scripted rules + optional calls when **Live API** is on — **not** open-ended chat. Any value-moving action still uses explicit confirm UI in the prototype.

**HTTP (live mode):** The component uses **`POST /api/agent/read`** and **`POST /api/agent/preview`** with JSON bodies (`action` fields such as `listSlots`, etc.). **Exact payloads** are defined in **`BrandLabAgentPrototype.tsx`** only — keep UI-MAP or API notes aligned if those routes’ contracts change.

**Local duplicate:** File defines a string constant `glassPanel` for the prototype shell — **not** the same export as `lib/ui/glass-classes.ts` `glassPanel`. When aligning visuals, prefer **one** source of truth (`glass-classes.ts`) and delete the duplicate in a dedicated refactor (document in PR).

### 12.11 Marketing composites — production files

**Component:** `components/brand-lab/BrandLabMarketingComposites.tsx`.

| Composite section title | Production component file |
|-------------------------|---------------------------|
| HomeHero | `components/home/HomeHero.tsx` |
| ExperiencePillars | `components/home/ExperiencePillars.tsx` |
| StartFlowCta | `components/home/StartFlowCta.tsx` |

These are **real** compositions used on **`/`** — changing them affects the homepage and the lab preview together.

### 12.12 Cross-links inside the lab and from product

**In-page (`#…`)**

- From **flow mocks** (`BrandLabFlowMocks.tsx`): link **`#signature`** in **Available sessions** next-step copy and inside **`LabSessionBrowseRow`** next-step/footer content.
- Lab nav links: §12.5.

**Routes (full paths)**

- **`components/SiteHeader.tsx`** — includes a nav link to **`/brand-lab`** (product chrome → lab). If the link is removed or renamed, update this doc and **`docs/UI-MAP.md`**.
- **`BrandLabAgentPrototype.tsx`** (lab mode) — contains a link to **`/brand-lab/assistant`** (“narrow prototype” copy next to full lab). Assistant page links back to **`/brand-lab`** (`app/brand-lab/assistant/page.tsx`).

If you add a new `href="#…"`, you **must** add a matching **`id="…"`** on a stable element and document the fragment in **§12.4**.

### 12.13 `LabMockPrimitives.tsx` — exported API (lab-only)

File: **`components/brand-lab/LabMockPrimitives.tsx`**. **Only** imported by **`BrandLabFlowMocks.tsx`**. Do **not** use on product routes.

| Export | Kind | Role |
|--------|------|------|
| `labGlassCard` | `string` (class bundle) | Default glass card shell for mocks |
| `LabNextStepCallout` | component | Sky/slate “next step” block |
| `LabProofLinksPanel` | component | HashScan-style pill actions |
| `LabPassHistoryTimeline` | component | Vertical timeline for history lines |
| `LabSessionBrowseRow` | component | Browse list row (gradient strip + facts + next step) |
| `LabMyPassTile` | component | My passes tile |
| `LabResalePricingStrip` | component | Ask + fee two-up |
| `LabAlertCallout` | component | Info / warn / success callout |
| `LabEmptyStatePatterns` | component | Label + body rows for empty/blocked copy |

### 12.14 `brandLogoVariants.tsx` — exported API

| Export | Kind | Role |
|--------|------|------|
| `BrandLogoVariantId` | type | Union of variant ids |
| `BRAND_VARIANT_OPTIONS` | const | Picker labels + hints (lab + product) |
| `BrandMark` | component | SVG mark only |
| `BrandWordmark` | component | “Your” / “Turn” text |
| `BrandLockup` | component | Mark + wordmark row |
| `BrandFaviconMark` | component | Tab / favicon-style preview |

Internal SVG helpers (`MarkCalendarTurn`, …) are **not** exported.

### 12.15 Keep `docs/UI-MAP.md` aligned

The **route index** in **`docs/UI-MAP.md`** includes `/brand-lab`, `/brand-lab/assistant`, and `/brandlab`. When you **add a brand-lab route**, **rename entry URLs**, or **change which component owns a page**, update **both** this §12 and **`docs/UI-MAP.md`** in the same PR.

### 12.16 Agent / human checklist when changing brand lab

1. **Fragments:** Any new in-page target → update **§12.4** and **§12.5** (if linked from nav).
2. **Render order / page shell** → update **§12.6** (includes `app/brand-lab/page.tsx` step **0**).
3. **New mock shell** → update **§12.7** and ensure product route parity is intentional.
4. **New UI kit section** → update **§12.8** and **§8** if it becomes a production contract.
5. **New `LabMockPrimitives` export** → update **§12.13**.
6. **New `brandLogoVariants` export** → update **§12.14** and §12.9 if ids change.
7. **Lab-only imports:** Never add `LabMockPrimitives` or lab-only mock components to **`app/**`** (see `.cursor/rules/brand-ui.mdc`).
8. **Token / colour changes for logo** → follow **§0 four-file rule** (`globals.css`, `tailwind.config.ts`, `brand-tokens.ts`, §2 table).
9. **Assistant behaviour, API, or nav links** → update **§12.10**, **§12.12**, and **`docs/UI-MAP.md`** as needed.
10. **Site header link to lab** → if changed, update **§12.12** and **UI-MAP**.
11. **Mechanical index** → run **`npm run docs:brand-appendix`** and commit **`docs/BRAND-UI-APPENDIX.generated.md`** whenever you change **`glass-classes`**, **`brand-tokens`**, **`LabMockPrimitives`**, **`brandLogoVariants`**, or **DOM `id`s / `href="#…"`** under brand lab (so PRs show a clear diff).

### 12.17 Generated mechanical appendix

- **File:** `docs/BRAND-UI-APPENDIX.generated.md` (**do not edit by hand**).
- **Regenerate:** `npm run docs:brand-appendix` (runs `scripts/generate-brand-ui-appendix.mjs`).
- **Contents:** (1) all `export const` names from `lib/ui/glass-classes.ts`, (2) `brandCssVar` keys + TS exports from `lib/ui/brand-tokens.ts`, (3) exports from `LabMockPrimitives.tsx` and `brandLogoVariants.tsx`, (4) every `id="…"` in `components/brand-lab/**` and `app/brand-lab/**`, (5) every `href="#…"` there, (6) file inventory under `components/brand-lab/`.
- **Use:** Diff this file in CI or PR review to catch **accidental renames or missing anchors**. Narrative meaning stays in **§12**; this file is **truth from code**.

### 12.18 Gap (explicit)

- **Pixel-level mock copy** inside TSX is not duplicated verbatim in this doc; the **tables above** are the index. For legal/marketing strings, treat **`BrandLabMarketingComposites`** and **`components/home/*`** as source.
- **BrandLabAgentPrototype** internal state machine is **not** fully specified here; read the component for step logic. This doc states **intent** (non-LLM, confirm for risky actions).
- **Logo lab “Home hero”** mock (`BrandLabClient.tsx`) uses **`text-sky-300`** for inline “Turn” in one branch — not **`text-brand-word-accent`**. Harmless for lab; align to **`brand-*`** in a dedicated tidy-up if you want zero drift from §2.

---

## 13. Quick reference: files to open

**Tokens / glass (product)**

```
app/globals.css
tailwind.config.ts
lib/ui/brand-tokens.ts
lib/ui/glass-classes.ts
components/ui/button-classes.ts
```

**Brand lab (all TSX under lab)**

```
app/brand-lab/page.tsx
app/brand-lab/assistant/page.tsx
app/brandlab/page.tsx
components/brand-lab/BrandLabClient.tsx
components/brand-lab/BrandLabConcepts.tsx
components/brand-lab/BrandLabFlowMocks.tsx
components/brand-lab/BrandLabUiKit.tsx
components/brand-lab/BrandLabAgentPrototype.tsx
components/brand-lab/BrandLabMarketingComposites.tsx
components/brand-lab/LabMockPrimitives.tsx
components/brand-lab/LabSectionLead.tsx
components/brand-lab/brandLogoVariants.tsx
```

**Spec**

```
docs/BRAND-UI.md                        # This document — §12 = full brand lab execution map
docs/BRAND-UI-APPENDIX.generated.md     # Machine index — run npm run docs:brand-appendix
scripts/generate-brand-ui-appendix.mjs  # Generator for the appendix above
.cursor/rules/brand-ui.mdc              # Cursor injection for UI paths
```
