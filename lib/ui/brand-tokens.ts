/**
 * Brand token names — values are defined in `app/globals.css` (`:root`).
 * Use Tailwind `bg-brand-*`, `text-brand-*`, `stroke-brand-*`, `fill-brand-*` in components.
 *
 * @see docs/BRAND-UI.md
 */

export const brandCssVar = {
  mark: "--brand-mark",
  schedule: "--brand-schedule",
  motion: "--brand-motion",
  wordAccent: "--brand-word-accent",
  link: "--brand-link",
  canvas: "--brand-canvas",
  canvasMid: "--brand-canvas-mid",
  focusRing: "--brand-focus-ring",
} as const;

export type BrandCssVarName = (typeof brandCssVar)[keyof typeof brandCssVar];
