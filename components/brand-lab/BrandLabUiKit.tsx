"use client";

import type { ReactNode } from "react";
import { ActorSelector } from "@/components/ActorSelector";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { LiveFeedback } from "@/components/ui/LiveFeedback";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { getButtonClassName } from "@/components/ui/button-classes";
import { cn } from "@/lib/cn";
import { glassMutedCallout, glassSection } from "@/lib/ui/glass-classes";

function LabSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
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

function statusTone(status: string): string {
  if (status === "AVAILABLE") return "bg-slate-100 text-slate-800";
  if (status === "HELD") return "bg-blue-50 text-blue-900";
  if (status === "FROZEN") return "bg-amber-50 text-amber-900";
  if (status === "USED") return "bg-emerald-50 text-emerald-900";
  return "bg-slate-100 text-slate-800";
}

const BUTTON_VARIANTS = [
  "primary",
  "primarySuccess",
  "secondary",
  "danger",
  "amber",
  "muted",
] as const;

export function BrandLabUiKit() {
  const toast = useToast();

  return (
    <div className="space-y-6">
      <div
        className={cn(
          glassMutedCallout,
          "px-4 py-3 text-sm text-slate-800"
        )}
      >
        <strong className="font-semibold">UI kit</strong> — every shared
        primitive used in the app (buttons, links, feedback, loading, persona
        switcher, status chips, surfaces, form field, disclosure). Match new
        work to these patterns before shipping.
      </div>

      <LabSection
        title="Typography"
        description="Common page rhythms (same utilities as product routes)."
      >
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <h1 className="text-2xl font-semibold text-slate-900">
            Page title (h1 · text-2xl)
          </h1>
          <h2 className="text-xl font-semibold text-slate-900">
            Section title (h2 · text-xl)
          </h2>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Eyebrow · uppercase tracking
          </p>
          <p className="text-sm leading-relaxed text-slate-700">
            Body copy — text-sm text-slate-700 leading-relaxed. Used for
            explanations and helper text under controls.
          </p>
          <p className="font-mono text-xs text-slate-600">
            Monospace · technical ids (use sparingly on customer paths)
          </p>
        </div>
      </LabSection>

      <LabSection
        title="Button"
        description="components/ui/Button.tsx — all variants from button-classes."
      >
        <div className="flex flex-wrap gap-2">
          {BUTTON_VARIANTS.map((v) => (
            <Button key={v} type="button" variant={v}>
              {v}
            </Button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="primary" loading loadingLabel="Saving…">
            Save
          </Button>
          <Button type="button" variant="secondary" disabled>
            Disabled
          </Button>
        </div>
      </LabSection>

      <LabSection
        title="ButtonLink"
        description="components/ui/ButtonLink.tsx — Next.js Link + same tokens."
      >
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/slots" variant="primary" className="no-underline">
            Primary link
          </ButtonLink>
          <ButtonLink href="/my-bookings" variant="secondary" className="no-underline">
            Secondary link
          </ButtonLink>
          <ButtonLink href="/issuer" variant="textLink">
            Text link
          </ButtonLink>
        </div>
      </LabSection>

      <LabSection
        title="Table & compact actions"
        description="getButtonClassName(&quot;table&quot;) — issuer table rows."
      >
        <button type="button" className={getButtonClassName("table")}>
          Use this pass
        </button>
      </LabSection>

      <LabSection
        title="LiveFeedback"
        description="components/ui/LiveFeedback.tsx — inline success / error regions."
      >
        <div className="space-y-3">
          <LiveFeedback
            success="Action completed successfully."
            error={null}
          />
          <LiveFeedback
            success={null}
            error="Something went wrong. Try again or check your connection."
          />
          <LiveFeedback
            success="Booked. Confirmation is on-chain."
            successLink={{
              href: "https://hashscan.io/testnet",
              label: "View transaction on HashScan",
            }}
            error={null}
          />
        </div>
      </LabSection>

      <LabSection
        title="Toast stack"
        description="useToast() from ToastProvider — global auto-dismiss notices (app root)."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              toast({ variant: "success", message: "Saved. You’re all set." })
            }
          >
            Fire success toast
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              toast({
                variant: "success",
                message: "Listed on-chain.",
                link: {
                  href: "https://hashscan.io/testnet",
                  label: "View audit on HashScan",
                },
              })
            }
          >
            Success + link
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              toast({
                variant: "error",
                message: "Could not complete the request.",
              })
            }
          >
            Fire error toast
          </Button>
        </div>
      </LabSection>

      <LabSection
        title="Spinner & Skeleton"
        description="components/ui/Spinner.tsx · Skeleton.tsx"
      >
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Spinner className="text-slate-600" />
            <span>Inline spinner</span>
          </div>
          <div className="min-w-[200px] space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </LabSection>

      <LabSection
        title="Status chips"
        description="Pass status pills — same tones as SlotsClient / slot detail."
      >
        <div className="flex flex-wrap gap-2">
          {(["AVAILABLE", "HELD", "FROZEN", "USED"] as const).map((s) => (
            <span
              key={s}
              className={cn(
                "inline-flex rounded px-2 py-1 text-xs font-medium",
                statusTone(s)
              )}
            >
              {s}
            </span>
          ))}
        </div>
      </LabSection>

      <LabSection
        title="Surfaces & callouts"
        description="Bordered panels used across browse, resale, issuer."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <p className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            Neutral info — border-slate-200 bg-slate-50
          </p>
          <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            Warning — border-amber-200 bg-amber-50
          </p>
          <p className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
            Positive context — border-emerald-200 bg-emerald-50
          </p>
          <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            Error callout — border-red-200 bg-red-50
          </p>
        </div>
      </LabSection>

      <LabSection
        title="Form control"
        description="Text input pattern — resale ask, issuer ref fields."
      >
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-800">Ask (ℏ)</span>
          <input
            className="min-h-[44px] w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            type="text"
            inputMode="decimal"
            defaultValue="20"
            readOnly
            aria-label="Preview field"
          />
        </label>
      </LabSection>

      <LabSection
        title="Disclosure (details)"
        description="Issuer-style expandable technical block."
      >
        <details className="group rounded border border-slate-200 bg-white p-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
            <span
              className="inline-block text-slate-500 transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none"
              aria-hidden
            >
              ▸
            </span>
            System details
          </summary>
          <p className="mt-2 text-xs text-slate-600">
            Placeholder content inside <code className="font-mono">details</code>
            .
          </p>
        </details>
      </LabSection>

      <LabSection
        title="ActorSelector"
        description="Compact (customer) vs full grid (three roles). Isolated storage keys so both work on this page."
      >
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">
              Compact — Person A / Person B only
            </p>
            <ActorSelector
              pageDefault="guestA"
              allowedActors={["guestA", "guestB"]}
              title="Customer view (preview)"
              description="Same component as /slots and /my-bookings."
              actorStorageKey="brandlab:actor:compact"
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">
              Full — Provider + Person A + Person B
            </p>
            <ActorSelector
              pageDefault="issuer"
              allowedActors={["issuer", "guestA", "guestB"]}
              title="Viewing as (preview)"
              description="Same component as issuer dashboard persona strip when all three are shown."
              actorStorageKey="brandlab:actor:full"
            />
          </div>
        </div>
      </LabSection>

      <LabSection
        title="Sticky mobile action bar"
        description="Pattern used on /resale and session detail — fixed bottom, safe area."
      >
        <div className="relative h-24 overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-100">
          <div className="absolute inset-x-2 bottom-2 flex gap-2 rounded-lg border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
            <Button type="button" variant="primary" className="min-w-0 flex-1">
              List
            </Button>
            <Button
              type="button"
              variant="primarySuccess"
              className="min-w-0 flex-1"
            >
              Buy
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Shown at md:hidden in product; scaled mock here.
        </p>
      </LabSection>

      <LabSection
        title="Site header (reference)"
        description="Real component: components/SiteHeader.tsx — not duplicated here; use live header above."
      >
        <p className="text-sm text-slate-600">
          The global nav is the production <code className="font-mono text-xs">SiteHeader</code>. Check active states by navigating the app; logo lockups live in the sections below.
        </p>
      </LabSection>
    </div>
  );
}
