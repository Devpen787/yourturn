import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Glass card shell used across flow mocks */
export const labGlassCard =
  "rounded-xl border border-white/28 bg-white/50 shadow-sm ring-1 ring-slate-900/[0.028] backdrop-blur-md";

export function LabNextStepCallout({
  label,
  children,
  tone = "sky",
}: {
  label: string;
  children: ReactNode;
  tone?: "sky" | "slate";
}) {
  const shell =
    tone === "sky"
      ? "border-sky-200/60 bg-gradient-to-br from-sky-50/90 to-white shadow-sm ring-1 ring-sky-100/80"
      : "border-slate-200/70 bg-slate-50/90 shadow-sm ring-1 ring-slate-200/50";
  const labelCls =
    tone === "sky"
      ? "text-sky-800/75"
      : "text-slate-600";
  const bodyCls =
    tone === "sky" ? "text-sky-950" : "text-slate-900";

  return (
    <div className={cn("rounded-xl border p-3", shell)}>
      <p
        className={cn(
          "text-[10px] font-semibold uppercase tracking-wider",
          labelCls
        )}
      >
        {label}
      </p>
      <p className={cn("mt-1.5 text-sm font-medium leading-snug", bodyCls)}>
        {children}
      </p>
    </div>
  );
}

export function LabProofLinksPanel({
  title = "Proof links",
  description = "Token and HCS topic on HashScan (new tab).",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className={cn("p-3", labGlassCard)}>
      <h5 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h5>
      <p className="mt-1 text-xs text-slate-600">{description}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <span className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-sky-200/80 bg-sky-50/90 px-4 text-xs font-semibold text-sky-950 shadow-sm ring-1 ring-sky-100/60">
          Token on HashScan
        </span>
        <span className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-indigo-200/80 bg-indigo-50/90 px-4 text-xs font-semibold text-indigo-950 shadow-sm ring-1 ring-indigo-100/60">
          HCS topic on HashScan
        </span>
      </div>
    </div>
  );
}

export function LabPassHistoryTimeline({
  title = "Pass history",
  items,
}: {
  title?: string;
  items: Array<{ body: string; meta: string }>;
}) {
  return (
    <div className={cn("p-3", labGlassCard)}>
      <h5 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {title}{" "}
        <span className="font-normal normal-case tracking-normal text-slate-400">
          (optional)
        </span>
      </h5>
      <ul className="mt-3 space-y-0">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <div className="flex w-4 shrink-0 flex-col items-center pt-1">
              <span
                className="h-2.5 w-2.5 rounded-full border-2 border-white bg-sky-500 shadow-sm ring-1 ring-sky-200"
                aria-hidden
              />
              {i < items.length - 1 ? (
                <span
                  className="mt-1 w-px flex-1 min-h-[12px] bg-slate-200"
                  aria-hidden
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 pb-4">
              <div className="rounded-lg border border-slate-100/90 bg-slate-50/80 px-3 py-2 shadow-sm">
                <p className="text-xs font-medium leading-snug text-slate-900">
                  {item.body}
                </p>
                <p className="mt-1 text-[11px] tabular-nums text-slate-500">
                  {item.meta}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Browse / list row: hairline strip + title + status + ref/price + next step */
export function LabSessionBrowseRow({
  title,
  scheduleLine,
  refSerial,
  priceHbar,
  status,
  statusClassName,
  stateHint,
  nextStep,
  footer,
}: {
  title: string;
  scheduleLine: string;
  refSerial: number;
  priceHbar: number;
  status: string;
  statusClassName: string;
  stateHint: string;
  nextStep: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className={cn("overflow-hidden rounded-2xl", labGlassCard)}>
      <div
        className="h-0.5 bg-gradient-to-r from-emerald-500/70 via-sky-500/60 to-indigo-500/50"
        aria-hidden
      />
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Session
            </p>
            <p className="mt-0.5 font-semibold text-slate-950">{title}</p>
            <p className="mt-0.5 text-xs text-slate-600">{scheduleLine}</p>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
              statusClassName
            )}
          >
            {status}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100/80 pt-3 text-xs">
          <span className="tabular-nums text-slate-700">
            <span className="font-medium text-slate-500">Ref</span>{" "}
            <span className="font-mono font-semibold text-slate-900">
              #{refSerial}
            </span>
          </span>
          <span className="tabular-nums text-slate-700">
            <span className="font-medium text-slate-500">Price</span>{" "}
            <span className="font-semibold text-slate-900">{priceHbar} ℏ</span>
          </span>
          <span className="text-slate-600">{stateHint}</span>
        </div>
        <div className="mt-3">
          <LabNextStepCallout label="Next step">{nextStep}</LabNextStepCallout>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100/80 pt-3">
          {footer}
        </div>
      </div>
    </div>
  );
}

/** My passes — compact pass tile aligned with browse row */
export function LabMyPassTile({
  refSerial,
  title,
  status,
  statusClassName,
  summary,
  nextHint,
  footer,
}: {
  refSerial: number;
  title: string;
  status: string;
  statusClassName: string;
  summary: string;
  nextHint: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className={cn("overflow-hidden rounded-2xl", labGlassCard)}>
      <div
        className="h-0.5 bg-gradient-to-r from-blue-500/65 via-sky-500/55 to-violet-500/45"
        aria-hidden
      />
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Your pass
            </p>
            <p className="mt-0.5 font-semibold text-slate-950">
              <span className="font-mono text-slate-800">#{refSerial}</span>
              <span className="text-slate-400"> · </span>
              {title}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-slate-900/[0.04]",
              statusClassName
            )}
          >
            {status}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600">{summary}</p>
        <div className="mt-3">
          <LabNextStepCallout label="What you can do next" tone="slate">
            {nextHint}
          </LabNextStepCallout>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100/80 pt-3">
          {footer}
        </div>
      </div>
    </div>
  );
}

export function LabResalePricingStrip({
  askHbar,
  feePreviewHbar,
}: {
  askHbar: string;
  feePreviewHbar: string;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <div className="rounded-xl border border-white/40 bg-white/55 px-3 py-2.5 shadow-sm ring-1 ring-slate-900/[0.02] backdrop-blur-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Ask
        </p>
        <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-slate-950">
          {askHbar}{" "}
          <span className="text-sm font-medium text-slate-500">ℏ</span>
        </p>
      </div>
      <div className="rounded-xl border border-white/40 bg-white/55 px-3 py-2.5 shadow-sm ring-1 ring-slate-900/[0.02] backdrop-blur-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Provider fee (10% preview)
        </p>
        <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-slate-950">
          {feePreviewHbar}{" "}
          <span className="text-sm font-medium text-slate-500">ℏ</span>
        </p>
      </div>
    </div>
  );
}

export function LabAlertCallout({
  tone,
  title,
  children,
  className,
}: {
  tone: "info" | "warn" | "success";
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const shell = {
    info: "border-slate-200/80 bg-slate-50/85 text-slate-800",
    warn: "border-amber-200/70 bg-amber-50/90 text-amber-950",
    success: "border-emerald-200/70 bg-emerald-50/90 text-emerald-950",
  }[tone];

  return (
    <div
      className={cn(
        "rounded-xl border p-3 text-xs leading-relaxed shadow-sm backdrop-blur-sm",
        shell,
        className
      )}
    >
      {title ? (
        <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
          {title}
        </p>
      ) : null}
      <div className={title ? "mt-1.5" : ""}>{children}</div>
    </div>
  );
}

export function LabEmptyStatePatterns({
  rows,
}: {
  rows: Array<{ label: string; body: ReactNode }>;
}) {
  return (
    <div className={cn("p-3", labGlassCard)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Copy patterns
      </p>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex gap-3 rounded-lg border border-slate-100/90 bg-slate-50/70 px-3 py-2.5"
          >
            <span className="w-28 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {row.label}
            </span>
            <span className="min-w-0 flex-1 text-xs leading-relaxed text-slate-700">
              {row.body}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
