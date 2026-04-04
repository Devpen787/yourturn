"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatSlotDateTime } from "@/lib/format/slotDateTime";

function statusTone(status: string): string {
  if (status === "AVAILABLE") return "bg-slate-100 text-slate-800";
  if (status === "HELD") return "bg-blue-50 text-blue-900 ring-1 ring-blue-100";
  if (status === "FROZEN") return "bg-amber-50 text-amber-900 ring-1 ring-amber-100";
  if (status === "USED") return "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100";
  return "bg-slate-100 text-slate-800";
}

type SlotFields = {
  primaryPriceHbar: number;
  startTime: string;
  endTime: string;
  resaleAllowed: boolean;
};

type Props = {
  serial: number;
  chainStatus: string;
  statusSummary: string;
  nextStep: string;
  holderLabel: string;
  slot: SlotFields;
  /** e.g. mt-4 on live page, mt-3 in brand lab */
  className?: string;
};

function Fact({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-100/90 bg-slate-50/70 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
        className
      )}
    >
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium tabular-nums tracking-tight text-slate-900">
        {children}
      </dd>
    </div>
  );
}

/**
 * Dense session/pass summary: wallet-style header strip, status hero, next-step callout, fact grid.
 */
export function SlotPassHeroCard({
  serial,
  chainStatus,
  statusSummary,
  nextStep,
  holderLabel,
  slot,
  className,
}: Props) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.03]",
        className
      )}
      aria-labelledby="pass-heading"
    >
      <div
        className="h-1 bg-gradient-to-r from-sky-500/85 via-indigo-500/55 to-sky-400/70"
        aria-hidden
      />
      <div className="p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p
              id="pass-heading"
              className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500"
            >
              Session pass
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-slate-800">
              Ref #{serial}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
              statusTone(chainStatus)
            )}
          >
            {chainStatus}
          </span>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-600">{statusSummary}</p>

        <div className="mt-4 rounded-xl border border-sky-200/60 bg-gradient-to-br from-sky-50/90 to-white p-3.5 shadow-sm ring-1 ring-sky-100/80">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-800/75">
            Next step
          </p>
          <p className="mt-1.5 text-sm font-medium leading-snug text-sky-950">
            {nextStep}
          </p>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Fact label="Current holder">
            <span className="tabular-nums">{holderLabel}</span>
          </Fact>
          <Fact label="Primary price">
            {slot.primaryPriceHbar}{" "}
            <span className="font-normal text-slate-600">ℏ</span>
          </Fact>
          <Fact label="Starts">{formatSlotDateTime(slot.startTime)}</Fact>
          <Fact label="Ends">{formatSlotDateTime(slot.endTime)}</Fact>
          <Fact label="Resale" className="sm:col-span-2">
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                slot.resaleAllowed
                  ? "bg-emerald-100/90 text-emerald-900 ring-1 ring-emerald-200/80"
                  : "bg-slate-200/80 text-slate-700"
              )}
            >
              {slot.resaleAllowed ? "Allowed by provider" : "Not allowed"}
            </span>
          </Fact>
        </dl>
      </div>
    </section>
  );
}
