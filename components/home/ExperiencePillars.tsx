const pillars = [
  {
    label: "Pick a time",
    body: "Browse available sessions with the same confidence you expect from a modern booking flow.",
  },
  {
    label: "Keep your place",
    body: "What you hold stays visible as a live pass with clear status, rules, and next steps.",
  },
  {
    label: "Sell to someone else when allowed",
    body: "If plans change, list your pass for resale under the provider’s rules — the same pattern fans know from ticket resale, built for classes and sessions.",
  },
];

export function ExperiencePillars() {
  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white px-6 py-7 md:px-8">
      <div className="grid gap-6 md:grid-cols-3 md:gap-8">
        {pillars.map((pillar, index) => (
          <div
            key={pillar.label}
            className={
              index < pillars.length - 1 ? "md:border-r md:border-slate-200 md:pr-8" : ""
            }
          >
            <p className="text-sm font-medium text-slate-500">{pillar.label}</p>
            <p className="mt-3 text-base leading-7 text-slate-800">
              {pillar.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
