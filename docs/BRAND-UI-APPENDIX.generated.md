# BRAND-UI appendix (generated)

> **Do not edit by hand.** Regenerate with `npm run docs:brand-appendix`.

Generated (UTC): `2026-04-04T19:06:42.807Z`

See **`docs/BRAND-UI.md` §12** for narrative spec. This file is a **mechanical index** so diffs surface when exports or `id`s change.

---

## 1. `lib/ui/glass-classes.ts` — `export const` names

Composable Tailwind class strings for glass / signature surfaces.

| Export |
|--------|
| `glassSection` |
| `glassPanel` |
| `glassInset` |
| `glassFakeWindowShell` |
| `glassFakeWindowChrome` |
| `glassFakeWindowBody` |
| `glassStickyBar` |
| `glassMutedCallout` |
| `glassBrandStrip` |
| `glassPillMuted` |
| `glassPillSoft` |
| `signatureSurfaceCanvas` |

---

## 2. `lib/ui/brand-tokens.ts`

### `brandCssVar` keys → CSS custom properties

| Key | Tailwind usage (examples) |
|-----|---------------------------|
| `mark` | `text-brand-mark`, `fill-brand-mark`, `stroke-brand-mark`, … |
| `schedule` | `text-brand-schedule`, `stroke-brand-schedule`, `fill-brand-schedule`, … |
| `motion` | `text-brand-motion`, `stroke-brand-motion`, … |
| `wordAccent` | `text-brand-word-accent` |
| `link` | `text-brand-link` |
| `canvas` | `bg-brand-canvas` |
| `canvasMid` | `bg-brand-canvas-mid` |
| `focusRing` | `ring-brand-focus` (see `tailwind.config` `ringColor`) |

### TypeScript exports

| Kind | Name |
|------|------|
| const | `brandCssVar` |
| type | `BrandCssVarName` |

---

## 3. `components/brand-lab/LabMockPrimitives.tsx` — exports

| Kind | Name |
|------|------|
| const | `labGlassCard` |
| function | `LabNextStepCallout` |
| function | `LabProofLinksPanel` |
| function | `LabPassHistoryTimeline` |
| function | `LabSessionBrowseRow` |
| function | `LabMyPassTile` |
| function | `LabResalePricingStrip` |
| function | `LabAlertCallout` |
| function | `LabEmptyStatePatterns` |

---

## 4. `components/brand-lab/brandLogoVariants.tsx` — exports

| Kind | Name |
|------|------|
| type | `BrandLogoVariantId` |
| const | `BRAND_VARIANT_OPTIONS` |
| function | `BrandMark` |
| function | `BrandWordmark` |
| function | `BrandLockup` |
| function | `BrandFaviconMark` |

---

## 5. DOM `id="…"` in brand lab (deduped)

Scanned: `components/brand-lab/**`, `app/brand-lab/**` (`.ts` / `.tsx`).

| `id` | Files |
|------|-------|
| `agent-ux` | `components/brand-lab/BrandLabClient.tsx` |
| `flow-mocks` | `components/brand-lab/BrandLabFlowMocks.tsx` |
| `logo-lab` | `components/brand-lab/BrandLabClient.tsx` |
| `marketing` | `components/brand-lab/BrandLabClient.tsx` |
| `signature` | `components/brand-lab/BrandLabConcepts.tsx` |
| `ui-kit` | `components/brand-lab/BrandLabClient.tsx` |

---

## 6. In-page `href="#…"` in brand lab (deduped)

| Fragment | Files |
|----------|-------|
| `#agent-ux` | `components/brand-lab/BrandLabClient.tsx` |
| `#flow-mocks` | `components/brand-lab/BrandLabClient.tsx` |
| `#logo-lab` | `components/brand-lab/BrandLabClient.tsx` |
| `#marketing` | `components/brand-lab/BrandLabClient.tsx` |
| `#signature` | `components/brand-lab/BrandLabClient.tsx`<br>`components/brand-lab/BrandLabFlowMocks.tsx` |
| `#ui-kit` | `components/brand-lab/BrandLabClient.tsx` |

---

## 7. `components/brand-lab/*.tsx` files (inventory)

- `components/brand-lab/BrandLabAgentPrototype.tsx`
- `components/brand-lab/BrandLabClient.tsx`
- `components/brand-lab/BrandLabConcepts.tsx`
- `components/brand-lab/BrandLabFlowMocks.tsx`
- `components/brand-lab/BrandLabMarketingComposites.tsx`
- `components/brand-lab/BrandLabUiKit.tsx`
- `components/brand-lab/LabMockPrimitives.tsx`
- `components/brand-lab/LabSectionLead.tsx`
- `components/brand-lab/brandLogoVariants.tsx`
