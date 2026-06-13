"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  glassFakeWindowBody,
  glassFakeWindowChrome,
  glassFakeWindowShell,
  glassSection,
  glassStickyBar,
} from "@/lib/ui/glass-classes";
import { BrandLabAgentPrototype } from "@/components/brand-lab/BrandLabAgentPrototype";
import { BrandLabConcepts } from "@/components/brand-lab/BrandLabConcepts";
import { BrandLabFlowMocks } from "@/components/brand-lab/BrandLabFlowMocks";
import { BrandLabUiKit } from "@/components/brand-lab/BrandLabUiKit";
import {
  BRAND_VARIANT_OPTIONS,
  BrandFaviconMark,
  BrandLockup,
  BrandMark,
  type BrandLogoVariantId,
} from "@/components/brand-lab/brandLogoVariants";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn(glassSection, "p-5")}>
      <h2 className="text-sm font-semibold tracking-tight text-slate-950">{title}</h2>
      {description ? (
        <p className="mt-1 text-xs text-slate-600">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FakeWindow({ children }: { children: React.ReactNode }) {
  return (
    <div className={glassFakeWindowShell}>
      <div className={glassFakeWindowChrome}>
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
      </div>
      <div className={glassFakeWindowBody}>{children}</div>
    </div>
  );
}

export function BrandLabClient({
  marketingComposites,
}: {
  /** Server-rendered home blocks (HomeHero, pillars, dual CTA). */
  marketingComposites?: ReactNode;
}) {
  const [variant, setVariant] = useState<BrandLogoVariantId>("text");

  const selected = BRAND_VARIANT_OPTIONS.find((o) => o.id === variant);

  return (
    <div className="space-y-8 pb-16">
      <div className="rounded-2xl border border-amber-300/55 bg-amber-50/95 px-4 py-3 text-sm text-amber-950 shadow-[0_1px_2px_rgba(146,64,14,0.06)] backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-amber-800/20 bg-amber-200/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-950">
            Internal
          </span>
          <strong className="font-semibold">Brand lab</strong>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-amber-950/90">
          Design and UX reference only — not a customer-facing journey. Open at{" "}
          <code className="rounded bg-amber-100/80 px-1.5 py-0.5 font-mono text-[11px]">
            /brand-lab
          </code>{" "}
          (hyphen). This page is{" "}
          <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-[11px]">
            noindex
          </code>{" "}
          for search engines. Nothing here changes live product routes.
        </p>
        <nav className="mt-4 space-y-2 text-xs font-medium" aria-label="Brand lab sections">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-900/65">
              Story &amp; UX
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <a
                href="#signature"
                className="text-amber-900 underline decoration-amber-400/70 underline-offset-2 hover:decoration-amber-700"
              >
                Signature surfaces
              </a>
              <a
                href="#flow-mocks"
                className="text-amber-900 underline decoration-amber-400/70 underline-offset-2 hover:decoration-amber-700"
              >
                Flow mocks
              </a>
              <a
                href="#agent-ux"
                className="text-amber-900 underline decoration-amber-400/70 underline-offset-2 hover:decoration-amber-700"
              >
            Assistant-style UI
          </a>
          <a
            href="/brand-lab/assistant"
            className="text-amber-900 underline decoration-amber-400/70 underline-offset-2 hover:decoration-amber-700"
          >
            Same UI, no side panel (prototype)
          </a>
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-900/65">
              Systems &amp; marketing
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <a
                href="#logo-lab"
                className="text-amber-900 underline decoration-amber-400/70 underline-offset-2 hover:decoration-amber-700"
              >
                Logo directions
              </a>
              <a
                href="#ui-kit"
                className="text-amber-900 underline decoration-amber-400/70 underline-offset-2 hover:decoration-amber-700"
              >
                UI kit
              </a>
              {marketingComposites ? (
                <a
                  href="#marketing"
                  className="text-amber-900 underline decoration-amber-400/70 underline-offset-2 hover:decoration-amber-700"
                >
                  Marketing
                </a>
              ) : null}
            </div>
          </div>
        </nav>
      </div>

      <BrandLabConcepts />

      <div className="border-t border-slate-200 pt-10">
        <BrandLabFlowMocks />
      </div>

      <div
        id="agent-ux"
        className="scroll-mt-24 space-y-4 border-t border-slate-200 pt-10"
      >
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">
          Assistant-style prototype (not an LLM)
        </h2>
        <BrandLabAgentPrototype />
      </div>

      <div id="logo-lab" className="scroll-mt-24 space-y-8">
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">
          Logo directions
        </h2>

      <div className={glassStickyBar}>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Logo direction
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {BRAND_VARIANT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setVariant(opt.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-left text-xs font-medium transition-colors",
                variant === opt.id
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {selected ? (
          <p className="mt-2 text-xs text-slate-600">{selected.hint}</p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Browser tab"
          description="Favicon + document title (metadata)."
        >
          <FakeWindow>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <BrandFaviconMark variant={variant} />
              <span className="truncate text-xs text-slate-600">
                YourTurn — Book the spot. Keep your options.
              </span>
            </div>
          </FakeWindow>
        </Section>

        <Section
          title="Global header"
          description="Same chrome as SiteHeader: wordmark + nav."
        >
          <header className="rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
              <span className="rounded-md focus-visible:outline-none">
                <BrandLockup variant={variant} markClassName="h-7 w-7" />
              </span>
              <nav className="flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-900">Browse</span>
                <span>My passes</span>
                <span>Provider dashboard</span>
              </nav>
            </div>
          </header>
        </Section>
      </div>

      <Section
        title="Home hero"
        description="Eyebrow line above the headline on /."
      >
        <div className="relative overflow-hidden rounded-[1.25rem] bg-slate-950 px-5 py-8 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.22),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(244,114,182,0.14),transparent_32%)]" />
          <div className="relative space-y-3">
            {variant === "text" ? (
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-300">
                YourTurn
              </p>
            ) : (
              <div className="flex items-center gap-2 text-slate-200">
                <BrandMark variant={variant} className="h-6 w-6" />
                <span className="text-xs font-medium uppercase tracking-[0.18em]">
                  <span className="text-slate-200">Your</span>
                  <span className="text-sky-300">Turn</span>
                </span>
              </div>
            )}
            <p className="text-lg font-semibold leading-snug">
              Book the spot. Keep your options.
            </p>
            <p className="max-w-md text-xs leading-relaxed text-slate-400">
              Mock copy — customers keep the reservation like a pass; providers
              manage rules separately.
            </p>
          </div>
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Browse sessions"
          description="/slots — page title and list row."
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900">
                Open sessions
              </h3>
              <BrandMark variant={variant} className="h-6 w-6 opacity-60" />
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">Handstand Flow</p>
                  <p className="text-xs text-slate-600">Apr 12 · 6:00 PM</p>
                </div>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-800">
                  AVAILABLE
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-600">
                Choose the person who is booking, review the booking, and then book the session.
              </p>
            </div>
          </div>
        </Section>

        <Section
          title="My passes"
          description="/my-bookings — hub header."
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <BrandMark variant={variant} className="h-6 w-6" />
            <h3 className="text-base font-semibold text-slate-900">My passes</h3>
          </div>
          <p className="mt-3 text-xs text-slate-600">
            Showing passes for <strong>Person A</strong> in this demo.
          </p>
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs">
            <p className="font-medium text-slate-900">Handstand Flow</p>
            <p className="mt-1 text-slate-600">You currently hold this pass.</p>
          </div>
        </Section>
      </div>

      <Section
        title="Provider dashboard"
        description="/issuer — title strip (logo rarely repeated; included for completeness)."
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <BrandLockup variant={variant} markClassName="h-6 w-6" />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Provider dashboard
              </p>
              <p className="text-xs text-slate-600">
                Mint, freeze, mark used — mock layout only
              </p>
            </div>
          </div>
          <span className="rounded-md bg-white px-2 py-1 text-xs text-slate-500 ring-1 ring-slate-200">
            Demo
          </span>
        </div>
      </Section>

      <Section
        title="Resale handoff"
        description="/resale/[serial] — compact branded strip."
      >
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <BrandLockup variant={variant} markClassName="h-5 w-5" />
            <span className="text-sm font-medium text-slate-800">
              Resell this pass
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-600">
            Mock: list at an ask price; buyer completes in one step when allowed.
          </p>
        </div>
      </Section>

      <Section
        title="Share / system sheet (optional)"
        description="If you ever show a system share row or ‘Open in …’."
      >
        <div className="rounded-xl bg-slate-100 p-3 text-center text-xs text-slate-600">
          <BrandLockup
            variant={variant}
            className="justify-center"
            markClassName="h-8 w-8"
          />
          <p className="mt-2">yourturn.app · Session pass</p>
        </div>
      </Section>
      </div>

      <div id="ui-kit" className="scroll-mt-24 space-y-4 border-t border-slate-200 pt-10">
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">UI kit</h2>
        <BrandLabUiKit />
      </div>

      {marketingComposites ? (
        <div id="marketing" className="scroll-mt-24 space-y-4 border-t border-slate-200 pt-10">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">
            Marketing (production components)
          </h2>
          <div className="space-y-6">{marketingComposites}</div>
        </div>
      ) : null}
    </div>
  );
}
