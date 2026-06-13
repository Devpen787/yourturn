import type { Metadata } from "next";
import Link from "next/link";
import { SessionCard } from "@/components/marketplace/SessionCard";
import { PassTile } from "@/components/passes/PassTile";
import { getButtonClassName } from "@/components/ui/button-classes";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "ETHGlobal Wave 1 sandbox",
  description: "Static premium UX mocks for the ETHGlobal continuity build.",
  robots: { index: false, follow: false },
};

const proofItems = [
  ["Token", "0.0.8505698 / serial 164"],
  ["Lifecycle", "Booked -> listed -> verified receipt"],
  ["Audit", "HCS event and HashScan links stay inside proof details"],
] as const;

export default function EthGlobalSandboxPage() {
  return (
    <div className="space-y-8">
      <header className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-white via-sky-50/80 to-violet-50/70 p-6 shadow-sm ring-1 ring-slate-900/[0.025] md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Internal sandbox
            </p>
            <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-slate-950">
              ETHGlobal Wave 1 target states
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Static mock surfaces for the premium shell: marketplace browse,
              pass hub, proof receipt, Concierge preview, and owner policy. This
              page does not call live APIs and is not linked from product nav.
            </p>
          </div>
          <Link
            href="/brand-lab"
            className={cn(getButtonClassName("secondary"), "bg-white/80")}
          >
            Brand lab
          </Link>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Booker browse
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              Marketplace card anatomy
            </h2>
          </div>
          <SessionCard
            title="Handstand Flow"
            provider="YourTurn Movement"
            category="Movement"
            time="Sun, Jun 14, 8:00 AM - 8:55 AM"
            location="SoHo"
            price="22 ℏ"
            serial={164}
            status="AVAILABLE"
            statusTone="available"
            rating="4.9 rating"
            policyBadges={["Resale eligible", "Release allowed", "Verified pass"]}
            summary={
              <>
                <span className="font-semibold text-slate-900">
                  Ready to book.
                </span>{" "}
                Review the session and book the pass under provider rules.
              </>
            }
            primaryAction={
              <span className={cn(getButtonClassName("primary"), "px-3")}>
                Book
              </span>
            }
          />
          <SessionCard
            title="Recovery Mobility"
            provider="Brooklyn Recovery Lab"
            category="Service slot"
            time="Sun, Jun 14, 10:30 AM - 11:15 AM"
            location="Dumbo"
            price="18 ℏ"
            serial={165}
            status="FOR_SALE"
            statusTone="listed"
            rating="4.8 rating"
            policyBadges={["Resale active", "Provider fee", "Verified pass"]}
            summary={
              <>
                <span className="font-semibold text-slate-900">
                  Listed by holder.
                </span>{" "}
                A new booker can take over under the owner&apos;s resale rules.
              </>
            }
            primaryAction={
              <span className={cn(getButtonClassName("primarySuccess"), "px-3")}>
                Buy on resale
              </span>
            }
          />
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Booker pass
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              Pass hub target
            </h2>
          </div>
          <PassTile
            serial={164}
            title="Handstand Flow"
            status="HELD"
            tone="active"
            summary="Person A currently holds this pass and can keep it or use an allowed recovery action when the next wave is wired."
            nextStep="Open details for the verified receipt, or prepare a resale/release preview once Concierge is connected."
            action={
              <span className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-500">
                Recovery preview
              </span>
            }
          />

          <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm ring-1 ring-slate-900/[0.025]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Verified receipt drawer
            </p>
            <h3 className="mt-2 text-base font-semibold text-slate-950">
              Proof details stay available on demand
            </h3>
            <dl className="mt-4 space-y-3">
              {proofItems.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 p-3"
                >
                  <dt className="text-xs font-semibold text-slate-500">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm ring-1 ring-slate-900/[0.025]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Concierge preview
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            Bounded recovery recommendation
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Mock state only: the assistant reads the holder, policy, listing
            state, and alternatives, then asks for approval before execution.
          </p>
          <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/80 p-4 text-sm text-sky-950">
            Recommended action: list the pass for resale at 20 ℏ. Release is
            allowed, but resale keeps value recovery available to Person A.
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm ring-1 ring-slate-900/[0.025]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Owner policy preview
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            Rules are set before booking
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li className="rounded-xl bg-slate-50 p-3">Resale allowed with 10% provider fee preview.</li>
            <li className="rounded-xl bg-slate-50 p-3">Release allowed before the cutoff window.</li>
            <li className="rounded-xl bg-slate-50 p-3">Policy snapshot shown on each booked pass.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
