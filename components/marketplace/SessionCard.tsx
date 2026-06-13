import type { ReactNode } from "react";
import Link from "next/link";
import { getButtonClassName } from "@/components/ui/button-classes";
import { cn } from "@/lib/cn";

export type SessionCardStatusTone =
  | "available"
  | "held"
  | "listed"
  | "paused"
  | "used";

const statusToneClasses: Record<SessionCardStatusTone, string> = {
  available: "bg-slate-100 text-slate-800 ring-slate-200",
  held: "bg-blue-50 text-blue-900 ring-blue-100",
  listed: "bg-violet-50 text-violet-950 ring-violet-100",
  paused: "bg-amber-50 text-amber-950 ring-amber-100",
  used: "bg-emerald-50 text-emerald-950 ring-emerald-100",
};

export function SessionCard({
  title,
  provider,
  category,
  time,
  location,
  price,
  serial,
  status,
  statusTone,
  rating,
  policyBadges,
  summary,
  primaryAction,
}: {
  title: string;
  provider: string;
  category: string;
  time: string;
  location: string;
  price: string;
  serial: number;
  status: string;
  statusTone: SessionCardStatusTone;
  rating: string;
  policyBadges: string[];
  summary: ReactNode;
  primaryAction: ReactNode;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/60 bg-white/78 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_18px_48px_-24px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.035] backdrop-blur-md">
      <div
        className="h-1 bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400"
        aria-hidden
      />
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {category}
            </p>
            <span className="text-xs text-slate-300" aria-hidden>
              /
            </span>
            <p className="text-xs font-medium text-slate-600">{provider}</p>
          </div>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold leading-tight text-slate-950">
                {title}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{time}</p>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                statusToneClasses[statusTone]
              )}
            >
              {status}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
            <span>{location}</span>
            <span>{rating}</span>
            <span className="tabular-nums">Ref #{serial}</span>
            <span className="font-semibold tabular-nums text-slate-900">
              {price}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {policyBadges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                {badge}
              </span>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-slate-200/70 bg-slate-50/80 p-3 text-sm text-slate-700">
            {summary}
          </div>
        </div>
        <div className="flex min-w-[9rem] flex-col gap-2 sm:items-end">
          {primaryAction}
          <Link
            href={`/slots/${serial}`}
            className={cn(
              getButtonClassName("textLink"),
              "inline-flex min-h-[44px] items-center justify-center px-2 text-sm"
            )}
          >
            Session details
          </Link>
        </div>
      </div>
    </article>
  );
}
