import type { Metadata } from "next";
import { BrandLabClient } from "@/components/brand-lab/BrandLabClient";
import { BrandLabMarketingComposites } from "@/components/brand-lab/BrandLabMarketingComposites";

export const metadata: Metadata = {
  title: "Brand lab",
  description:
    "Internal UI kit (all shared components) and logo direction previews on mocked surfaces.",
  robots: { index: false, follow: false },
};

export default function BrandLabPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
          Brand lab
        </h1>
        <span
          className="mt-3 block h-[2px] w-11 rounded-full bg-gradient-to-r from-sky-500/75 via-sky-400/45 to-transparent"
          aria-hidden
        />
        <p className="mt-3 text-xs text-slate-600">
          Internal — design and UX reference (not a customer journey).
        </p>
      </header>
      <BrandLabClient
        marketingComposites={<BrandLabMarketingComposites />}
      />
    </div>
  );
}
