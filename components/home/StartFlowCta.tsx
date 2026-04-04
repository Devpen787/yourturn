import Link from "next/link";

export function StartFlowCta() {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-8 md:px-8">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
          <p className="text-sm font-medium text-slate-500">For guests</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Find it, book it, keep track of it.
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-700">
            Browse a session, confirm the booking, then manage the pass from one
            booking hub.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/slots"
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white"
            >
              Browse sessions
            </Link>
            <Link
              href="/my-bookings"
              className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700"
            >
              Open my passes
            </Link>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">For providers</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Set the rules behind the scenes.
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-700">
            Provider tools stay separate so customers get a simple booking
            experience while the issuer still controls redemption, movement, and
            resale policy.
          </p>
          <div className="mt-6">
            <Link
              href="/issuer"
              className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700"
            >
              Open provider tools
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
