# YourTurn Product Design Contract

Status: **binding product-design contract extracted from human-approved Golden evidence**.

This file is a product-specific overlay on `docs/BRAND-UI.md`. It does not redesign YT-01→YT-08 and does not replace the repo-wide brand token/source-of-truth rules. When this file and a Golden record disagree, the exact human-approved Golden record wins until a reviewed successor is approved.

## Evidence basis

This contract is extracted from:
- Golden YT-01→YT-04 executable `24bbf0d7516499069f5102ae4bf724b0cb376b94` and rendered artifact `10150035697`;
- Golden YT-05→YT-08 executable `d5309a96d532ee107011c2a5cefc3000b9e4932f` and rendered artifact `10160672183`;
- Product Reviewer #34 direct inspection of the exact desktop/mobile PNG evidence;
- the current `calendarTurn` brand system in `docs/BRAND-UI.md`, `app/globals.css`, and `components/brand-lab/brandLogoVariants.tsx`;
- reusable product patterns already present in `components/SiteHeader.tsx`, `components/home/HomeHero.tsx`, and the Golden `/product-preview` implementation;
- prior provider work in `feat/product-issuer-holder-ux`, especially `app/issuer/IssuerPanel.tsx`, as REUSE/ADAPT material rather than final visual truth.

## Product stance

YourTurn should feel like a calm, trustworthy booking product that becomes unusually capable when plans change.

The visual hierarchy must always communicate in this order:
1. **the booking and the customer outcome**;
2. **the current state and next action**;
3. **the authority/rules that constrain the action**;
4. **technical proof only when requested**.

If sponsor technology becomes the visual headline, the design has drifted.

## Recognizable YourTurn signature

If the logo disappeared, YourTurn should still be recognizable by this combination:
- booking-first cards with date/time/provider/status readable at a glance;
- deep-slate decision surfaces paired with quiet white/slate operational cards;
- rounded, high-confidence customer CTAs rather than dense developer controls;
- small tracked uppercase eyebrows for context, then plain-language semibold outcomes;
- sky/fuchsia brand accents used sparingly as motion/schedule atmosphere, not as functional status colors;
- authority presented as a compact set of visible limits rather than wallet/protocol language;
- technical evidence collapsed behind `View technical proof` / equivalent progressive disclosure.

Do not manufacture a new ETHOnline visual skin around sponsor logos or protocol colors.

## Color contract

Repo-level canonical tokens remain in `app/globals.css` and `docs/BRAND-UI.md`:
- `brand-mark` / deep slate: `#0f172a`;
- `brand-schedule` / sky: `#38bdf8`;
- `brand-motion` / fuchsia: `#e879f9`;
- `brand-word-accent`: `#0284c7`;
- `brand-link`: `#1d4ed8`;
- canvas: `#f8fafc` through `#eef2ff` and back.

Use brand color for identity and atmosphere. Use semantic palettes for state:
- slate: neutral/available/inactive;
- sky/blue: informational or active non-success state;
- amber: pending/warning/FIXTURE proof label;
- emerald: confirmed/verified/recovered/success;
- rose/red: rejected, destructive, blocked when user attention is required.

Color may reinforce a state but may never be its only explanation.

## Typography and information hierarchy

Use system UI sans; there is no product-specific font dependency.

Golden hierarchy to preserve:
- page eyebrow: `text-xs`, semibold, uppercase, tracking around `0.18–0.20em`, muted slate;
- page title: about `text-3xl` mobile / `text-4xl` desktop, semibold, tight tracking;
- card title: about `text-xl` to `text-2xl`, semibold;
- body: `text-sm` or `text-base`, generous line-height, slate-600/700;
- rule/meta labels: small uppercase tracked slate-400/500;
- money, times and identifiers in dense operational views: `tabular-nums` where alignment matters.

Customer-facing headlines state the outcome (`You recovered 45 USDC`) rather than the mechanism (`TransferTransaction complete`).

## Layout and spacing

Default product rail: `max-w-5xl`, `px-4`, with the app shell from `app/layout.tsx`.

Golden journey content uses a narrower task rail (`max-w-4xl`) for high-consequence steps. Preserve this distinction:
- broad navigation/marketing/provider overview: up to `max-w-5xl`;
- focused booking/authority task: up to `max-w-4xl`;
- proof detail stays inside the task rather than opening a competing dashboard.

Spacing should create clear decision groups rather than decorative emptiness. Prefer:
- 24–32px card padding on primary customer surfaces;
- 12–16px between related facts;
- 24–28px before a new decision group;
- compact operational density for provider tables only after the primary state is obvious.

## Surfaces, radius and elevation

Customer Golden surfaces establish two main families:

### Signature / decision surface
- deep `slate-950` or the existing signature gradient field;
- radius roughly `1.75–2rem`;
- subtle depth, not neon/glow;
- used for the hero, the most important booking context, or a single high-level decision.

### Operational / fact surface
- white or `slate-50`;
- `rounded-2xl` to `rounded-[1.75rem]` on customer surfaces;
- quiet slate border, restrained shadow;
- nested rule/fact cards may use `slate-50` with `rounded-2xl`.

For non-Golden new surfaces, prefer `lib/ui/glass-classes.ts` and existing components before hand-rolling another shadow/blur recipe.

Provider surfaces may remain somewhat denser and may use the repo's standard rounded-lg controls, but the top-level provider hierarchy should be upgraded to the same surface/rhythm language before being treated as new Golden product work.

## CTA hierarchy

Golden customer journeys use rounded-full, minimum 44px-high CTAs:
- primary: deep slate fill on light surfaces, or white on the deep-slate hero;
- secondary: white/transparent with quiet border;
- quiet/back: low-emphasis slate text with visible hover/focus treatment.

One state should have one obvious primary action. Do not present several equally weighted actions at an authority or payment boundary.

Dense provider operations may reuse `getButtonClassName(...)` from `components/ui/button-classes.ts`; do not force pill buttons into every table row.

## Booking anatomy

Every booking presentation should make these immediately available:
- service/experience name;
- date/time;
- provider/venue;
- current status;
- price/recovery value when relevant;
- primary next action.

The booking is the object. Never make token serial/account IDs the main identity of a customer card.

For the ETHOnline hero, canonical booking identity remains:
- `Friday Yoga · 18:00`;
- `Studio A · Zürich`.

## Status and authority anatomy

Customer statuses describe the situation: `Confirmed`, `Recovery active`, `Offer blocked`, `Needs your approval`, `Recovered`, `Transferred`, `Expired`.

When authority exists, show the meaningful bounds together rather than forcing the user to infer them from previous screens. For delegated recovery this includes, where relevant:
- booking scope;
- minimum recovery;
- expiry;
- prohibited actions;
- whether broader authority requires the user again.

Replacement authorization must visually distinguish **proposed authority** from **currently active authority**. Rejecting/cancelling a replacement must not visually erase authority that remains active.

## Proof presentation

Normal customer surface: explain **what happened**.

Reviewer/proof surface: explain **how it was proven**.

Technical proof is progressive disclosure, normally collapsed. Evidence labels must remain truthful (`LIVE`, `TESTNET`, `CI`, `LOCAL`, `CONFIGURED`, `SIMULATED`, `RESEARCH`, `FIXTURE` where used by the workbench). Never use a green success treatment to imply LIVE execution when the state is fixture-driven.

Raw World human identifiers must never appear in customer UI or logs intended as product evidence.

## Motion and feedback

Prefer state change over decorative animation. Existing color transitions are sufficient for most interactions.

Respect `prefers-reduced-motion`. Loading/pending indicators may animate only when they communicate actual wait state; they must have textual state as well.

For authority/financial actions, feedback must preserve the distinction among:
- ready / untouched;
- submitted / waiting;
- approved;
- rejected;
- cancelled;
- timeout/error + retry;
- revoked/expired when those states exist.

Do not collapse materially different terminal states into a generic failure toast.

## Responsive contract

Hard review viewports remain approximately:
- desktop `1440×1000`;
- mobile `390×844`.

Customer mobile priorities established by Golden:
- one coherent header row; prioritize `My bookings` and sign-in/account state;
- hide lower-priority provider/browse/register chrome before allowing a cramped two-row header;
- stack information in decision order: booking → state/outcome → limits → primary action → proof;
- keep primary controls reachable and at least 44px high;
- no hover-only meaning.

For future work, add cheap no-horizontal-scroll and critical-control assertions at `360`, `430`, `768`, and `1024` where practical, while keeping full PNG review on the two canonical widths.

## Accessibility contract

At minimum for every reviewed state:
- real semantic buttons/links/inputs;
- visible keyboard focus;
- minimum 44px tap targets on primary customer actions;
- labels are not replaced by color or icon alone;
- readable contrast on white/slate/dark surfaces;
- pending/error/success changes have textual meaning;
- destructive/reject/cancel actions are distinguishable from primary approval.

The workbench review boundary is not a claim of exhaustive WCAG certification.

## Copy contract

Preferred customer language is defined in `GLOSSARY.md`. General rules:
- short, specific, outcome-first;
- say what changed and what the user can do next;
- name the exact booking when authority could be ambiguous;
- use `booking`, `provider`, `recovery`, `recover value`, `transfer`, `minimum`, `expires`;
- keep `NFT`, `HTS`, `HCS`, `AgentKit`, raw addresses, transaction bytes and sponsor implementation terminology out of the primary customer path.

Avoid prototype/workbench language on the customer surface (`candidate`, `fixture`, `this demo tests...`). Evidence classification belongs in proof/reviewer UI only.

## Provider and acquirer adaptation

Future provider/acquirer surfaces must look like the same product, not cloned holder screens.

### Acquirer
Reuse customer shell, booking anatomy, status pills, CTA hierarchy and proof progressive disclosure. Add price/eligibility/provider-rule facts without exposing protocol plumbing.

### Provider
Reuse brand shell, status semantics, spacing rhythm and booking/session anatomy. Adapt the useful operational patterns from `feat/product-issuer-holder-ux` (inventory snapshot, session editing, loading/error/success handling), but replace legacy `issuer/pass/guest/account-id` vocabulary and avoid making technical identifiers the primary hierarchy.

Provider policy should read as reusable business rules, not a manual approval inbox for each recovery.

## Anti-patterns — do not copy

- sponsor logo walls or protocol dashboards inside the customer journey;
- a second competing prototype route;
- generic SaaS metric-card grids when the user is trying to complete one booking task;
- raw token/account/address identifiers as customer-facing booking identity;
- mixed `pass` / `booking` vocabulary;
- mixed provider/customer navigation in a cramped mobile header;
- equally weighted approve/reject/cancel/retry buttons;
- green proof styling that upgrades `FIXTURE`/`CI` into implied LIVE truth;
- a provider confirmation popup for every compliant recovery;
- decorative AI-agent chrome that obscures the actual mandate and customer outcome.

## Design decision record

| Evidence | Classification | Decision |
| --- | --- | --- |
| Golden `/product-preview` desktop/mobile screenshots + #34 direct review | **Observed** | **Keep:** booking-first hierarchy, deep-slate + quiet-light surfaces, rounded customer CTAs, compact authority facts, proof drawer, responsive one-row customer header. |
| Existing repo brand tokens and `calendarTurn` mark | **Provided** | **Keep:** token values, logo direction, semantic-vs-brand color distinction. |
| Golden YT-05→YT-08 authority states | **Observed** | **Keep:** separate pending/approve/reject/cancel/replacement semantics; active limits remain visible; replacement failure preserves active authority. |
| Prior `feat/product-issuer-holder-ux` provider dashboard | **Observed** | **Adapt:** session/inventory/operational state patterns and real loading/error feedback. |
| Prior provider vocabulary (`issuer`, `pass`, guest/account IDs) | **Observed** | **Do not copy:** translate to provider/booking/customer language and hide implementation identifiers from primary hierarchy. |
| `docs/BRAND-UI.md` glass helpers | **Provided** | **Adapt:** use existing reusable surfaces for new non-Golden work; do not rewrite frozen Golden simply to normalize implementation. |
| A fully shared component library for all three stakeholder lanes | **Inferred future need** | **Change later, not now:** extract reusable components only when the Golden and next connected slice make stable boundaries obvious. |

## Implementation handoff

A new product worker should be able to start from this checklist:
1. read the relevant Golden record and this file;
2. read `GLOSSARY.md` and `CRAFT.md`;
3. reuse the `max-w-5xl` shell and `max-w-4xl` focused-task rail;
4. keep booking identity and customer outcome above authority/proof detail;
5. reuse existing semantic status palettes and 44px controls;
6. keep technical evidence collapsed and truth-labeled;
7. for provider/acquirer work, apply `stakeholder-coverage-gate.md` before implementation;
8. for fixture-backed Golden states, consult `integration-ledger.md` before wiring real sponsor behavior;
9. any executable UX change to a Golden contract requires a new candidate → render → direct PNG review → explicit human approval cycle.
