import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-900">
          Who are you in this demo?
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
          Issuer tools and guest flows are split on purpose — use the Issuer
          console only with treasury keys, and use Guest paths when acting as
          Guest A or B.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Link
          href="/issuer"
          className="group rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm transition hover:border-amber-300 hover:shadow-md"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800/70">
            Issuer
          </p>
          <h2 className="mt-2 text-xl font-semibold text-amber-950 group-hover:underline">
            Issuer console
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-950/80">
            Initialize token, mint demo slots, reset demo, freeze / unfreeze
            holders, and burn / withdraw slots.
          </p>
          <span className="mt-4 inline-block text-sm font-medium text-amber-900">
            Open issuer →
          </span>
        </Link>

        <Link
          href="/slots"
          className="group rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-white p-6 shadow-sm transition hover:border-sky-300 hover:shadow-md"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-800/70">
            Guests / users
          </p>
          <h2 className="mt-2 text-xl font-semibold text-sky-950 group-hover:underline">
            Browse slots
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-sky-950/80">
            Associate, book primary slots, list or buy resale from slot
            detail pages, and manage holdings under My bookings.
          </p>
          <span className="mt-4 inline-block text-sm font-medium text-sky-900">
            Open slots →
          </span>
        </Link>
      </div>
    </div>
  );
}
