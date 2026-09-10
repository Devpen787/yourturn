import Link from "next/link";
import { cn } from "@/lib/cn";

const heroFocus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-900/10 bg-slate-950 px-6 py-10 text-white shadow-[0_40px_120px_rgba(15,23,42,0.18)] md:px-10 md:py-14">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.24),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(232,121,249,0.16),transparent_30%)]"
        aria-hidden
      />
      <div className="relative grid gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] md:items-center">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
            Flexible service bookings
          </p>
          <h1 className="mt-4 max-w-[14ch] text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Book the spot.
            <br />
            Keep your options.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300 md:text-lg">
            Keep every reservation in one place. Use it normally, change plans when
            life gets in the way, or recover value without giving up control of the
            rest of your account.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/product-preview"
              className={cn(
                "inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-slate-950 no-underline shadow-sm transition-colors hover:bg-slate-100",
                heroFocus
              )}
            >
              Open my bookings
            </Link>
            <Link
              href="/slots"
              className={cn(
                "inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white no-underline transition-colors hover:border-white/30 hover:bg-white/8",
                heroFocus
              )}
            >
              Browse sessions
            </Link>
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-sm flex-col gap-3 py-2 md:mx-0 md:ml-auto md:max-w-none md:py-0 md:pl-2 md:pr-1">
          <div
            className="pointer-events-none absolute right-8 top-[49%] h-52 w-52 -translate-y-1/2 rounded-full bg-sky-400/10 blur-3xl md:right-10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute right-16 top-[72%] h-36 w-36 -translate-y-1/2 rounded-full bg-fuchsia-400/10 blur-3xl"
            aria-hidden
          />
          <div className="relative w-full rounded-[1.75rem] border border-white/10 bg-white/10 p-5 shadow-[0_18px_40px_-20px_rgba(15,23,42,0.75)] backdrop-blur md:mr-5 md:max-w-[17.5rem] md:self-end">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              This Friday
            </p>
            <p className="mt-3 text-2xl font-semibold text-white">Friday Yoga</p>
            <p className="mt-2 text-sm text-slate-300">18:00 · Studio A · Zürich</p>
            <div className="mt-5 h-px bg-white/10" />
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              Confirmed now. Flexible if your plans change.
            </p>
          </div>
          <div className="relative w-full rounded-[1.75rem] border border-slate-200/60 bg-slate-50 p-5 pb-6 text-slate-900 shadow-[0_24px_50px_-24px_rgba(15,23,42,0.45)] md:-mt-3 md:mr-0 md:max-w-[18rem] md:self-end md:ring-1 md:ring-slate-900/[0.04]">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Your booking
            </p>
            <p className="mt-3 text-xl font-semibold">Keep it useful</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Check in, change plans, or set clear limits and let YourTurn look for
              a recovery on your behalf.
            </p>
            <div className="mt-5 inline-flex rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-900">
              Confirmed
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
