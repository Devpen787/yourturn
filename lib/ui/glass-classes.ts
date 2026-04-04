/**
 * Tasteful glass surfaces — blur, soft borders, light translucency.
 * Compose with `cn` from `@/lib/cn`, e.g. `cn(glassSection, 'p-6', className)`.
 */

/** Primary frosted card (sections, lab panels, elevated surfaces). */
export const glassSection =
  "rounded-2xl border border-white/50 bg-white/72 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_32px_-10px_rgba(15,23,42,0.08)] backdrop-blur-md ring-1 ring-slate-900/[0.035] supports-[backdrop-filter]:bg-white/65";

/** More transparent panel (stacked passes, hero mocks, overlays on gradients). */
export const glassPanel =
  "rounded-2xl border border-white/42 bg-white/44 shadow-[0_1px_2px_rgba(15,23,42,0.045),0_14px_40px_-12px_rgba(15,23,42,0.09)] backdrop-blur-md ring-1 ring-slate-900/[0.04] supports-[backdrop-filter]:bg-white/40";

/** Inset chips, day cells, time pills on a glass parent. */
export const glassInset =
  "rounded-xl border border-white/36 bg-white/34 backdrop-blur-sm ring-1 ring-slate-900/[0.028]";

/** Browser-chrome style mock (outer shell). */
export const glassFakeWindowShell =
  "overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100/70 shadow-inner backdrop-blur-sm";

/** Fake window title bar strip. */
export const glassFakeWindowChrome =
  "flex items-center gap-2 border-b border-slate-200/70 bg-slate-200/55 px-3 py-2 backdrop-blur-sm";

/** Fake window content well. */
export const glassFakeWindowBody = "bg-white/85 p-3 backdrop-blur-sm";

/** Sticky toolbar: full-width on mobile, rounded glass card from `sm`. */
export const glassStickyBar =
  "sticky top-0 z-10 -mx-4 border-b border-slate-200/70 bg-slate-50/90 px-4 py-3 shadow-sm shadow-slate-900/[0.04] backdrop-blur-md sm:mx-0 sm:rounded-xl sm:border sm:border-white/48 sm:bg-white/68 sm:px-4 sm:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.07)] sm:ring-1 sm:ring-slate-900/[0.032] sm:backdrop-blur-md";

/** Muted callout strip (info boxes on grey backgrounds). */
export const glassMutedCallout =
  "rounded-2xl border border-slate-200/80 bg-slate-50/90 shadow-sm backdrop-blur-sm";

/** Low-contrast horizontal band on light gradients (brand tagline strip). */
export const glassBrandStrip =
  "rounded-2xl border border-slate-200/60 bg-slate-900/[0.03] backdrop-blur-sm";

/** Small meta chip with border (e.g. “Glass + depth”). */
export const glassPillMuted =
  "rounded-full border border-slate-200/80 bg-white/50 px-3 py-1 text-xs font-medium text-slate-600 backdrop-blur-sm";

/** Soft filled chip on glass (e.g. “Ready to use”). */
export const glassPillSoft =
  "rounded-full bg-white/60 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-white/45 backdrop-blur-sm";

/**
 * Large signature band: gradient field, depth shadow, padding.
 * Pair with soft blurred orbs (absolute) + `relative` inner content — see brand-lab.
 */
export const signatureSurfaceCanvas =
  "relative overflow-hidden rounded-[1.75rem] border border-slate-200/88 bg-gradient-to-br from-slate-100 via-white to-sky-100/70 p-6 shadow-[0_1px_0_rgba(255,255,255,0.55)_inset,0_1px_2px_rgba(15,23,42,0.04),0_24px_72px_-20px_rgba(15,23,42,0.13)] md:p-8";
