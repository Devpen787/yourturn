import type { ReactNode } from "react";
import { ExperiencePillars } from "@/components/home/ExperiencePillars";
import { HomeHero } from "@/components/home/HomeHero";
import { StartFlowCta } from "@/components/home/StartFlowCta";

function CompositeSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-xs text-slate-600">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Full home marketing compositions (server components — cannot live inside client UI kit). */
export function BrandLabMarketingComposites() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
        <strong className="font-semibold">Marketing compositions</strong> — exact
        components used on <code className="font-mono text-xs">/</code>. Same
        files as production; check spacing and breakpoints here before changing
        the homepage.
      </div>
      <CompositeSection
        title="HomeHero"
        description="components/home/HomeHero.tsx"
      >
        <HomeHero />
      </CompositeSection>
      <CompositeSection
        title="ExperiencePillars"
        description="components/home/ExperiencePillars.tsx"
      >
        <ExperiencePillars />
      </CompositeSection>
      <CompositeSection
        title="StartFlowCta"
        description="components/home/StartFlowCta.tsx"
      >
        <StartFlowCta />
      </CompositeSection>
    </div>
  );
}
