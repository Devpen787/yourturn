import type { Metadata } from "next";
import Link from "next/link";
import { BrandLabAgentPrototype } from "@/components/brand-lab/BrandLabAgentPrototype";
import { getButtonClassName } from "@/components/ui/button-classes";
import { cn } from "@/lib/cn";
import { glassMutedCallout, glassSection } from "@/lib/ui/glass-classes";

export const metadata: Metadata = {
  title: "Assistant-style UI (prototype)",
  description:
    "Conversation-shaped prototype with scripted routing — not an LLM or voice. Same demo logic as brand lab, without internal tooling.",
  robots: { index: false, follow: false },
};

export default function BrandLabAssistantPage() {
  return (
    <div className="pb-16">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        Brand lab
      </p>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">
        Assistant-style prototype
      </h1>
      <div className={cn(glassSection, "p-5 md:p-6")}>
        <nav
          className={cn(
            glassMutedCallout,
            "mb-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-3 text-center text-xs text-slate-600"
          )}
        >
          <Link href="/brand-lab" className={getButtonClassName("textLink")}>
            Full brand lab
          </Link>
          <span className="text-slate-300" aria-hidden>
            ·
          </span>
          <span>Not a live AI — pattern-matched demo only</span>
        </nav>
        <BrandLabAgentPrototype mode="customerOnly" />
      </div>
    </div>
  );
}
