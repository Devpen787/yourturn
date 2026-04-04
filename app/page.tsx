import Link from "next/link";

const demoSteps = [
  {
    title: "1. Issuer seeds the demo",
    body: "Create the token, mint the slot rights, and confirm treasury-backed inventory in the issuer console.",
    href: "/issuer",
    cta: "Open issuer console",
  },
  {
    title: "2. Guest books a slot",
    body: "Pick an available service slot and complete the primary booking flow under issuer rules.",
    href: "/slots",
    cta: "Browse slots",
  },
  {
    title: "3. Holder manages the right",
    body: "Review the current booking right, including holder status, resale eligibility, and proof links.",
    href: "/my-bookings",
    cta: "View held bookings",
  },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
          Hedera No Solidity Allowed
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Booked Rights turns a service booking into a transferable right under issuer rules.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">
          The demo targets SMB services and classes such as yoga studios, physical
          therapy, and movement coaching. A guest books a scarce slot, can transfer
          or resell it when policy allows, and the issuer still keeps control of
          movement, usage, and royalty economics.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/slots"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Start demo in slots
          </Link>
          <Link
            href="/issuer"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800"
          >
            Issuer setup
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Must ship</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>`F1` primary booking</li>
            <li>`F2` transfer or resale with royalty</li>
            <li>`F4` mark used</li>
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Current fit</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>`HTS` for rights, fees, freeze, and burn</li>
            <li>`Mirror Node` for holder and lifecycle reads</li>
            <li>`HCS` only as audit trail support</li>
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Guardrails</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>No autonomous signing</li>
            <li>No DB as booking-right truth</li>
            <li>Plain language before blockchain jargon</li>
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Suggested demo order</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              Keep the happy path short and proof-bearing.
            </h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            Under 60 seconds
          </span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {demoSteps.map((step) => (
            <div key={step.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">{step.body}</p>
              <Link
                href={step.href}
                className="mt-4 inline-flex text-sm font-medium text-blue-700 underline"
              >
                {step.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
