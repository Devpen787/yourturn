import Link from "next/link";
import { cn } from "@/lib/cn";

const heroFocus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/90 focus-visible:ring-offset-slate-950";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-10 text-white shadow-[0_40px_120px_rgba(15,23,42,0.18)] md:px-10 md:py-14">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.25),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(244,114,182,0.16),transparent_30%)]" />
      <div className="relative grid gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.9fr)] md:items-center">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-300">
            YourTurn
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Book the spot. Keep your options.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 md:text-lg">
            For studios, therapists, and coaching-led services where a missed
            session still matters. Customers keep the reservation like a pass in
            one simple booking flow, while providers use a separate dashboard for
            check-in, pausing movement, and resale rules.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/slots"
              className={cn(
                "inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-slate-950",
                heroFocus
              )}
            >
              Browse sessions
            </Link>
            <Link
              href="/my-bookings"
              className={cn(
                "inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white",
                heroFocus
              )}
            >
              Open my passes
            </Link>
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-sm flex-col gap-5 py-2 md:mx-0 md:ml-auto md:max-w-none md:py-0 md:pl-2 md:pr-1">
          <div className="w-full rounded-[1.75rem] border border-white/10 bg-white/10 p-5 shadow-sm backdrop-blur md:max-w-[17.5rem] md:self-end">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
              Tonight
            </p>
            <p className="mt-3 text-2xl font-semibold text-white">Handstand Flow</p>
            <p className="mt-2 text-sm text-slate-300">6:00 PM · 1 spot left</p>
            <div className="mt-5 h-px bg-white/10" />
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              Last opening, still governed by provider rules.
            </p>
          </div>
          <div className="w-full rounded-[1.75rem] border border-slate-200/60 bg-slate-50 p-5 pb-6 text-slate-900 shadow-lg md:max-w-[18rem] md:self-end md:ring-1 md:ring-slate-900/[0.04]">
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
