import { cn } from "@/lib/cn";

export type BrandLogoVariantId =
  | "text"
  | "calendarTurn"
  | "dualSlot"
  | "ticketQueue"
  | "monogram";

export const BRAND_VARIANT_OPTIONS: {
  id: BrandLogoVariantId;
  label: string;
  hint: string;
}[] = [
  {
    id: "text",
    label: "Text only",
    hint: "Matches the live header today",
  },
  {
    id: "calendarTurn",
    label: "Calendar + turn",
    hint: "Scheduling + motion (Grok-adjacent)",
  },
  {
    id: "dualSlot",
    label: "Double slot",
    hint: "Same spot, shifted — options",
  },
  {
    id: "ticketQueue",
    label: "Ticket + queue",
    hint: "Pass / line metaphor",
  },
  {
    id: "monogram",
    label: "YT monogram",
    hint: "Compact mark for favicon",
  },
];

function MarkCalendarTurn({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="5"
        y="9"
        width="22"
        height="20"
        rx="4"
        className="fill-brand-mark"
      />
      <rect x="9" y="5" width="3" height="6" rx="1" className="fill-brand-mark" />
      <rect x="20" y="5" width="3" height="6" rx="1" className="fill-brand-mark" />
      <path
        d="M10 18c3 0 5 1.5 7 4 2 2.5 4 3.5 7 3.5"
        className="stroke-brand-schedule"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M21 24.5l3.5-1.5-1-3.5"
        className="stroke-brand-motion"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MarkDualSlot({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="9"
        y="11"
        width="16"
        height="14"
        rx="3"
        className="fill-slate-300 stroke-slate-400"
        strokeWidth="1"
      />
      <rect
        x="6"
        y="7"
        width="16"
        height="14"
        rx="3"
        className="fill-brand-mark stroke-brand-mark"
        strokeWidth="1"
      />
      <rect
        x="8.5"
        y="9.5"
        width="11"
        height="3"
        rx="1"
        className="fill-brand-schedule/90"
      />
    </svg>
  );
}

function MarkTicketQueue({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M6 11h16a2 2 0 012 2v2.2a1.6 1.6 0 010 3.2V21a2 2 0 01-2 2H6V11z"
        className="fill-brand-mark"
      />
      <circle cx="14" cy="16" r="2.2" className="fill-white" />
      <path
        d="M18 13c2.5 2 4 4 4.5 7"
        className="stroke-brand-motion"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M21.5 19.5l2.2 1.3-.3 2.6"
        className="stroke-brand-schedule"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MarkMonogram({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="4"
        y="4"
        width="24"
        height="24"
        rx="7"
        className="fill-brand-mark"
      />
      <text
        x="16"
        y="21"
        textAnchor="middle"
        fill="white"
        fontSize="11"
        fontWeight="700"
        style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
      >
        YT
      </text>
    </svg>
  );
}

export function BrandMark({
  variant,
  className,
}: {
  variant: BrandLogoVariantId;
  className?: string;
}) {
  const c = cn("h-8 w-8 shrink-0", className);
  switch (variant) {
    case "text":
      return null;
    case "calendarTurn":
      return <MarkCalendarTurn className={c} />;
    case "dualSlot":
      return <MarkDualSlot className={c} />;
    case "ticketQueue":
      return <MarkTicketQueue className={c} />;
    case "monogram":
      return <MarkMonogram className={c} />;
  }
}

export function BrandWordmark({
  variant,
  className,
}: {
  variant: BrandLogoVariantId;
  className?: string;
}) {
  if (variant === "monogram") {
    return (
      <span className={cn("text-base font-semibold tracking-tight", className)}>
        <span className="text-brand-mark">Your</span>
        <span className="text-brand-word-accent">Turn</span>
      </span>
    );
  }
  if (variant === "calendarTurn" || variant === "ticketQueue") {
    return (
      <span className={cn("text-base font-semibold tracking-tight", className)}>
        <span className="text-brand-mark">Your</span>
        <span className="text-brand-word-accent">Turn</span>
      </span>
    );
  }
  return (
    <span className={cn("text-base font-semibold text-brand-mark", className)}>
      YourTurn
    </span>
  );
}

export function BrandLockup({
  variant,
  className,
  markClassName,
}: {
  variant: BrandLogoVariantId;
  className?: string;
  markClassName?: string;
}) {
  const mark = <BrandMark variant={variant} className={markClassName} />;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {mark}
      <BrandWordmark variant={variant} />
    </span>
  );
}

export function BrandFaviconMark({
  variant,
  className,
}: {
  variant: BrandLogoVariantId;
  className?: string;
}) {
  if (variant === "text") {
    return (
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md bg-brand-mark text-[10px] font-bold text-white",
          className
        )}
      >
        YT
      </span>
    );
  }
  return <BrandMark variant={variant} className={cn("h-8 w-8", className)} />;
}
