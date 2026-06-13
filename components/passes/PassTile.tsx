import type { ReactNode } from "react";
import Link from "next/link";
import { getButtonClassName } from "@/components/ui/button-classes";
import { cn } from "@/lib/cn";

export type PassTileTone = "active" | "listed" | "paused" | "used" | "neutral";

const toneClasses: Record<PassTileTone, string> = {
  active: "bg-blue-50 text-blue-900 ring-blue-100",
  listed: "bg-violet-50 text-violet-950 ring-violet-100",
  paused: "bg-amber-50 text-amber-950 ring-amber-100",
  used: "bg-emerald-50 text-emerald-950 ring-emerald-100",
  neutral: "bg-slate-100 text-slate-800 ring-slate-200",
};

export function PassTile({
  serial,
  title,
  status,
  tone,
  summary,
  nextStep,
  action,
}: {
  serial: number;
  title: string;
  status: string;
  tone: PassTileTone;
  summary: string;
  nextStep: ReactNode;
  action?: ReactNode;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_16px_44px_-24px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.035] backdrop-blur-md">
      <div
        className="h-1 bg-gradient-to-r from-blue-400 via-sky-400 to-violet-400"
        aria-hidden
      />
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Your pass
            </p>
            <h2 className="mt-1 text-base font-semibold leading-tight text-slate-950">
              <span className="font-mono text-slate-700">#{serial}</span>
              <span className="text-slate-300"> / </span>
              {title}
            </h2>
          </div>
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
              toneClasses[tone]
            )}
          >
            {status}
          </span>
        </div>
        <p className="mt-3 text-sm text-slate-600">{summary}</p>
        <div className="mt-3 rounded-xl border border-slate-200/70 bg-slate-50/85 p-3 text-sm text-slate-700">
          <span className="font-semibold text-slate-900">
            What you can do next:
          </span>{" "}
          {nextStep}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <Link
            className={cn(
              getButtonClassName("textLink"),
              "inline-flex min-h-[44px] items-center px-1 py-2.5"
            )}
            href={`/slots/${serial}`}
          >
            Session details
          </Link>
          {action}
        </div>
      </div>
    </article>
  );
}
