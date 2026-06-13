import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Shared eyebrow + title stack for signature bands — thin gradient rule for a crisp edge without noise.
 */
export function LabSectionLead({
  eyebrow,
  title,
  description,
  descriptionClassName,
}: {
  eyebrow: string;
  title: string;
  description: ReactNode;
  /** Optional; replaces default `max-w-2xl` for wider lab copy. */
  descriptionClassName?: string;
}) {
  return (
    <div className="flex gap-3 sm:gap-4">
      <div
        className="mt-1 h-11 w-[3px] shrink-0 rounded-full bg-gradient-to-b from-sky-500/85 via-sky-400/45 to-violet-500/40 shadow-[0_0_12px_-2px_rgba(14,165,233,0.35)] sm:h-12 md:h-[3.35rem]"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">
          {title}
        </h2>
        <div
          className={cn(
            "mt-2 text-sm leading-relaxed text-slate-600",
            descriptionClassName ?? "max-w-2xl"
          )}
        >
          {description}
        </div>
      </div>
    </div>
  );
}
