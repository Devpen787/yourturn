import Link from "next/link";
import { getButtonClassName } from "@/components/ui/button-classes";
import { cn } from "@/lib/cn";
import { glassPanel, signatureSurfaceCanvas } from "@/lib/ui/glass-classes";

export function StartFlowCta() {
  return (
    <section className={cn(signatureSurfaceCanvas, "px-6 py-8 md:px-8")}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={cn(glassPanel, "p-6")}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-word-accent">
            Customer app
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Find it, book it, keep track of it.
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-700">
            Browse a session, review the booking, then manage the pass from one
            booking hub.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/slots"
              className={cn(
                getButtonClassName("primary"),
                "rounded-full no-underline shadow-sm"
              )}
            >
              Browse sessions
            </Link>
            <Link
              href="/my-bookings"
              className={cn(
                getButtonClassName("secondary"),
                "rounded-full no-underline"
              )}
            >
              Open my passes
            </Link>
          </div>
        </div>

        <div className={cn(glassPanel, "p-6")}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-word-accent">
            Business dashboard
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Set the rules behind the scenes.
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-700">
            Provider tools stay separate so customers get a simple booking
            experience while the business still controls check-in, pausing passes,
            and resale policy.
          </p>
          <div className="mt-6">
            <Link
              href="/issuer"
              className={cn(
                getButtonClassName("secondary"),
                "rounded-full no-underline"
              )}
            >
              Open provider dashboard
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
