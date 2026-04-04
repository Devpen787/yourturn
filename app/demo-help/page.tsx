import Link from "next/link";
import { cn } from "@/lib/cn";
import { getButtonClassName } from "@/components/ui/button-classes";

export default function DemoHelpPage() {
  return (
    <div className="max-w-3xl text-sm">
      <Link
        href="/"
        className={cn(
          getButtonClassName("textLink"),
          "inline-flex min-h-[44px] items-center"
        )}
      >
        ← Back to home
      </Link>
      <h1 className="mt-3 text-2xl font-semibold text-slate-950">
        How this demo works
      </h1>
      <p className="mt-2 text-slate-600">
        This app uses two demo customer identities so you can show a full handoff:
        one person books, the other person buys the resale, and the provider checks
        the pass in.
      </p>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-medium text-slate-900">Demo identities</h2>
        <ul className="mt-3 space-y-2 text-slate-700">
          <li>
            <strong>Person A</strong> is the first customer. They book a session
            and can list the pass later if plans change.
          </li>
          <li>
            <strong>Person B</strong> is the second customer. They can buy an
            active listing and become the new holder.
          </li>
          <li>
            <strong>Provider</strong> sets up the sessions, can pause movement,
            and closes the pass at check-in.
          </li>
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-medium text-slate-900">What happens in one step</h2>
        <ul className="mt-3 space-y-2 text-slate-700">
          <li>Set up business</li>
          <li>Create demo sessions</li>
          <li>Reopen a paused pass</li>
          <li>Refresh customer or provider views</li>
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-medium text-slate-900">What asks for confirmation</h2>
        <ul className="mt-3 space-y-2 text-slate-700">
          <li>Book a session</li>
          <li>List a pass for resale</li>
          <li>Buy a listed pass</li>
          <li>Pause a pass</li>
          <li>Start over</li>
          <li>Check in / mark used</li>
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-medium text-slate-900">Current demo limits</h2>
        <ul className="mt-3 space-y-2 text-slate-700">
          <li>Person A and Person B are demo identities, not real user accounts.</li>
          <li>Bookings are final in this demo. There is no cancel or refund flow yet.</li>
          <li>
            The resale ask and provider fee preview help explain the economics,
            but the final transaction should still be checked on HashScan.
          </li>
        </ul>
      </section>
    </div>
  );
}
