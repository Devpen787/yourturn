"use client";

import { Button } from "@/components/ui/Button";
import { LabSectionLead } from "@/components/brand-lab/LabSectionLead";
import { cn } from "@/lib/cn";
import {
  glassBrandStrip,
  glassInset,
  glassPanel,
  glassPillMuted,
  glassPillSoft,
  signatureSurfaceCanvas,
} from "@/lib/ui/glass-classes";

const weekDays = [
  { d: "M", n: "7", on: false },
  { d: "T", n: "8", on: false },
  { d: "W", n: "9", on: true },
  { d: "T", n: "10", on: false },
  { d: "F", n: "11", on: false },
  { d: "S", n: "12", on: false },
  { d: "S", n: "13", on: false },
];

const times = ["5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM"];

function QrDecor({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-5 gap-0.5 rounded-lg bg-slate-900/[0.06] p-2",
        className
      )}
      aria-hidden
    >
      {Array.from({ length: 25 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "aspect-square rounded-[2px]",
            [0, 2, 4, 10, 12, 14, 20, 22, 24].includes(i)
              ? "bg-slate-800/90"
              : "bg-transparent"
          )}
        />
      ))}
    </div>
  );
}

export function BrandLabConcepts() {
  return (
    <div id="signature" className="scroll-mt-24 space-y-4">
      <div className={signatureSurfaceCanvas}>
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-rose-200/35 blur-3xl"
          aria-hidden
        />

        <div className="relative">
          <LabSectionLead
            eyebrow="YourTurn · concept"
            title="Signature surfaces"
            description={
              <>
                <p>
                  Aspirational depth: light glass, soft gradients, and layouts that feel
                  like <em>your</em> pass — not a generic form. Use as reference when
                  elevating browse, booking, and “my passes” in product.
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  In the live demo,{" "}
                  <strong className="font-medium text-slate-700">Person A</strong> and{" "}
                  <strong className="font-medium text-slate-700">Person B</strong> are
                  test Hedera wallets — not real customer accounts.
                </p>
              </>
            }
          />

          <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-10">
            {/* Booking + calendar */}
            <div className={cn(glassPanel, "p-5 md:p-6")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-sky-900/80">
                    Pick a time
                  </p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
                    Handstand Flow
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-600">
                    55 min · Studio A · 12 spots
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-900 ring-1 ring-emerald-500/20">
                  3 left
                </span>
              </div>

              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-500">
                April 2026
              </p>
              <div className="mt-2 flex justify-between gap-1">
                {weekDays.map((day) => (
                  <button
                    key={day.n}
                    type="button"
                    className={cn(
                      "flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center rounded-xl text-xs transition-colors motion-reduce:transition-none",
                      day.on
                        ? "bg-slate-900 text-white shadow-[0_1px_2px_rgba(0,0,0,0.25),0_6px_14px_-4px_rgba(15,23,42,0.35)] ring-2 ring-sky-400/55"
                        : cn(
                            glassInset,
                            "text-slate-600 hover:bg-white/50"
                          )
                    )}
                  >
                    <span className="text-[10px] font-medium opacity-80">
                      {day.d}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{day.n}</span>
                  </button>
                ))}
              </div>

              <p className="mt-5 text-xs font-medium uppercase tracking-wide text-slate-500">
                Start time
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {times.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={cn(
                      "min-h-[40px] rounded-full px-4 text-sm font-medium transition-colors motion-reduce:transition-none",
                      t === "6:00 PM"
                        ? "bg-slate-900 text-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] ring-1 ring-white/20"
                        : cn(glassInset, "text-slate-700 hover:bg-white/55")
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-5">
                <div>
                  <p className="text-xs font-medium text-slate-500">Total</p>
                  <p className="text-lg font-semibold tabular-nums tracking-tight text-slate-950">
                    20 ℏ
                  </p>
                </div>
                <Button type="button" variant="primary" className="rounded-full">
                  Book
                </Button>
              </div>
              <p className="mt-3 text-[11px] text-slate-500">
                Concept layout — live Browse still uses the list view on{" "}
                <code className="font-mono">/slots</code>. Primary action label matches
                product: <strong className="font-medium text-slate-600">Book</strong>.
              </p>
            </div>

            {/* Pass wallet */}
            <div className="relative min-h-[320px]">
              <div
                className={cn(
                  glassPanel,
                  "absolute left-0 right-4 top-10 z-0 h-48 rotate-[-2deg] opacity-80"
                )}
                aria-hidden
              />
              <div
                className={cn(
                  glassPanel,
                  "relative z-10 overflow-hidden p-5 md:p-6"
                )}
              >
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-sky-400/25 to-rose-300/20 blur-2xl" />
                <div className="relative flex justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                      YourTurn pass
                    </p>
                    <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                      Handstand Flow
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Wed 9 Apr · 6:00 PM
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-900 ring-1 ring-blue-500/15">
                        HELD
                      </span>
                      <span className="font-mono text-xs tabular-nums tracking-tight text-slate-600">
                        Ref #12
                      </span>
                    </div>
                    <p className="mt-4 text-xs leading-relaxed text-slate-600">
                      Resale opens if your studio allows it — you keep the pass
                      until you use it or pass it on.
                    </p>
                  </div>
                  <QrDecor className="h-[88px] w-[88px] shrink-0" />
                </div>
                <div className="relative mt-5 flex items-center justify-between border-t border-slate-200/70 pt-4">
                  <span className="text-xs text-slate-500">Swipe for details</span>
                  <span className={glassPillSoft}>Ready to use</span>
                </div>
              </div>

              <div
                className={cn(
                  glassPanel,
                  "relative z-[5] mx-6 mt-[-52px] p-4 opacity-95"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Physio reset
                    </p>
                    <p className="text-xs text-slate-500">Ref #4 · USED</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    Archive
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-800/90">
              Proposed product pattern · confirm before commit
            </p>
            <p className="text-xs text-slate-600">
              Today, <code className="font-mono text-[11px]">/slots</code> books in one
              tap after <strong className="font-medium text-slate-700">Book</strong>.
              This card shows an optional second step for parity with cautious booking
              UX (sheet or modal — not shipped).
            </p>
            <div className={cn(glassPanel, "p-4 md:p-5")}>
              <p className="text-sm font-semibold text-slate-950">
                Book this session?
              </p>
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-medium text-slate-800">Handstand Flow</span>
                <span className="text-slate-500"> · </span>
                Wed 9 Apr, 6:00 PM
                <span className="text-slate-500"> · </span>
                <span className="tabular-nums">20 ℏ</span>
                <span className="text-slate-500"> · </span>
                as <span className="font-medium text-slate-800">Person A</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="primary" disabled className="px-4">
                  Book
                </Button>
                <Button type="button" variant="secondary" disabled className="px-4">
                  Go back
                </Button>
              </div>
            </div>
          </div>

          {/* Micro strip — brand chip on glass */}
          <div
            className={cn(
              "mt-10 flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5",
              glassBrandStrip
            )}
          >
            <p className="text-sm text-slate-700">
              <span className="font-semibold text-slate-950">YourTurn</span>
              <span className="text-slate-500"> — </span>
              one pass, clear rules, your studio in control.
            </p>
            <span className={glassPillMuted}>Glass + depth · lab only</span>
          </div>
        </div>
      </div>
    </div>
  );
}
