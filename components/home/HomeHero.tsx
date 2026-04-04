import Link from "next/link";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-10 text-white shadow-[0_40px_120px_rgba(15,23,42,0.18)] md:px-10 md:py-14">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.25),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(244,114,182,0.16),transparent_30%)]" />
      <div className="relative grid gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] md:items-end">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-300">
            YourTurn
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Book the spot. Keep your options.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 md:text-lg">
            For studios, therapists, and coaching-led services where a missed
            slot still matters. Customers hold the booking like a pass.
            Providers keep the rules around movement, redemption, and resale.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/slots"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-slate-950"
            >
              Browse sessions
            </Link>
            <Link
              href="/my-bookings"
              className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white"
            >
              Open my passes
            </Link>
          </div>
        </div>

        <div className="relative min-h-[280px]">
          <div className="absolute right-0 top-6 h-36 w-60 rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
              Tonight
            </p>
            <p className="mt-4 text-2xl font-semibold text-white">Handstand Flow</p>
            <p className="mt-2 text-sm text-slate-300">6:00 PM · 1 spot left</p>
            <div className="mt-6 h-px bg-white/10" />
            <p className="mt-4 max-w-[12rem] text-sm text-slate-300">
              Last opening, still governed by provider rules.
            </p>
          </div>
          <div className="absolute bottom-2 left-3 h-40 w-56 rounded-[1.75rem] border border-slate-200/60 bg-slate-50 p-5 text-slate-900 shadow-lg">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              My pass
            </p>
            <p className="mt-4 text-xl font-semibold">Active booking</p>
            <p className="mt-2 text-sm text-slate-600">
              See status, transfer options, and what happens next in one place.
            </p>
            <div className="mt-6 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900">
              Ready to use
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
