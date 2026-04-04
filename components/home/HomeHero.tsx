import Link from "next/link";
import { BrandLockup } from "@/components/brand-lab/brandLogoVariants";
import { getButtonClassName } from "@/components/ui/button-classes";
import { cn } from "@/lib/cn";
import {
  glassInset,
  glassPanel,
  signatureSurfaceCanvas,
} from "@/lib/ui/glass-classes";

const heroFocus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2";

export function HomeHero() {
  return (
    <section className={cn(signatureSurfaceCanvas, "px-6 py-10 md:px-10 md:py-14")}>
      <div
        className="pointer-events-none absolute -top-16 right-0 h-56 w-56 rounded-full bg-brand-schedule/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-10 left-8 h-40 w-40 rounded-full bg-brand-motion/12 blur-3xl"
        aria-hidden
      />
      <div className="relative grid gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.9fr)] md:items-center">
        <div>
          <div className="inline-flex rounded-full border border-white/70 bg-white/75 px-3 py-2 shadow-sm backdrop-blur-sm">
            <BrandLockup variant="calendarTurn" markClassName="h-8 w-8" />
          </div>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-word-accent">
            Transferable service bookings
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-brand-mark md:text-5xl">
            Book the spot. Keep your options.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-700 md:text-lg">
            For studios, therapists, and coaching-led services where a missed
            session still matters. Customers keep the reservation like a pass in
            one simple booking flow, while providers use a separate dashboard for
            check-in, pausing movement, and resale rules.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/slots"
              className={cn(
                getButtonClassName("primary"),
                "rounded-full no-underline shadow-sm",
                heroFocus
              )}
            >
              Browse sessions
            </Link>
            <Link
              href="/my-bookings"
              className={cn(
                getButtonClassName("secondary"),
                "rounded-full no-underline bg-white/70 backdrop-blur-sm",
                heroFocus
              )}
            >
              Open my passes
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className={cn(glassInset, "px-3 py-1.5 font-medium")}>
              Provider-controlled resale
            </span>
            <span className={cn(glassInset, "px-3 py-1.5 font-medium")}>
              One live holder per pass
            </span>
            <span className={cn(glassInset, "px-3 py-1.5 font-medium")}>
              Final check-in closes the pass
            </span>
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-sm flex-col gap-5 py-2 md:mx-0 md:ml-auto md:max-w-none md:py-0 md:pl-2 md:pr-1">
          <div className={cn(glassPanel, "w-full p-5 md:max-w-[18rem] md:self-end")}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Tonight
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">Handstand Flow</p>
            <p className="mt-2 text-sm text-slate-600">6:00 PM · 1 spot left</p>
            <div className="mt-5 h-px bg-slate-200/80" />
            <p className="mt-4 text-sm leading-relaxed text-slate-700">
              Last opening, still governed by provider rules.
            </p>
          </div>
          <div className={cn(glassPanel, "w-full p-5 pb-6 text-slate-900 md:max-w-[18rem] md:self-end")}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              My pass
            </p>
            <p className="mt-3 text-xl font-semibold">Active booking</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              See status, resale when your provider allows it, and what happens
              next in one place.
            </p>
            <div className="mt-5 inline-flex rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-900">
              Ready to use
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
