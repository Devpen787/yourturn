import { cn } from "@/lib/cn";
import { glassSection } from "@/lib/ui/glass-classes";

const pillars = [
  {
    label: "Pick a time",
    body: "Browse available sessions with the same confidence you expect from a modern booking flow.",
  },
  {
    label: "Keep your place",
    body: "What you hold stays visible as a live booking with clear status, rules, and next steps.",
  },
  {
    label: "Let someone else take it",
    body: "If plans change, offer your booking to another eligible customer under the provider’s rules — the same familiar resale pattern, built for classes and sessions.",
  },
];

export function ExperiencePillars() {
  return (
    <section className={cn(glassSection, "px-6 py-7 md:px-8")}>
      <div className="grid gap-6 md:grid-cols-3 md:gap-8">
        {pillars.map((pillar, index) => (
          <div
            key={pillar.label}
            className={
              index < pillars.length - 1 ? "md:border-r md:border-slate-200 md:pr-8" : ""
            }
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-word-accent">
              {pillar.label}
            </p>
            <p className="mt-3 text-base leading-7 text-slate-800">
              {pillar.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
