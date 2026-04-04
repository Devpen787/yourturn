import { cn } from "@/lib/cn";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2";

const base =
  "inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";

export const buttonClasses = {
  primary: cn(
    base,
    focusRing,
    "bg-slate-800 text-white hover:bg-slate-900"
  ),
  primarySuccess: cn(
    base,
    focusRing,
    "bg-emerald-800 text-white hover:bg-emerald-900"
  ),
  secondary: cn(
    base,
    focusRing,
    "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
  ),
  danger: cn(base, focusRing, "bg-red-700 text-white hover:bg-red-800"),
  amber: cn(base, focusRing, "bg-amber-700 text-white hover:bg-amber-800"),
  muted: cn(base, focusRing, "bg-slate-600 text-white hover:bg-slate-700"),
  table: cn(
    "inline-flex min-h-[40px] items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-50",
    focusRing
  ),
  textLink: cn(
    "rounded-md text-blue-700 underline decoration-blue-700/40 underline-offset-2 transition-colors hover:text-blue-900 hover:decoration-blue-900/50",
    focusRing
  ),
} as const;

export type ButtonVariant = keyof typeof buttonClasses;

export function getButtonClassName(
  variant: ButtonVariant,
  className?: string
): string {
  return cn(buttonClasses[variant], className);
}
