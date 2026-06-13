"use client";

import type { ReactNode } from "react";
import { LabSectionLead } from "@/components/brand-lab/LabSectionLead";
import {
  LabAlertCallout,
  LabEmptyStatePatterns,
  LabMyPassTile,
  LabPassHistoryTimeline,
  LabProofLinksPanel,
  LabResalePricingStrip,
  LabSessionBrowseRow,
} from "@/components/brand-lab/LabMockPrimitives";
import { SlotPassHeroCard } from "@/components/slots/SlotPassHeroCard";
import { Button } from "@/components/ui/Button";
import { getButtonClassName } from "@/components/ui/button-classes";
import { cn } from "@/lib/cn";
import { formatSlotDateTime } from "@/lib/format/slotDateTime";
import {
  glassInset,
  glassPanel,
  signatureSurfaceCanvas,
} from "@/lib/ui/glass-classes";

function statusTone(status: string): string {
  if (status === "AVAILABLE") return "bg-slate-100 text-slate-800";
  if (status === "HELD") return "bg-blue-50 text-blue-900 ring-1 ring-blue-100";
  if (status === "FROZEN") return "bg-amber-50 text-amber-900 ring-1 ring-amber-100";
  if (status === "USED") return "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100";
  return "bg-slate-100 text-slate-800";
}

function MockShell({
  title,
  route,
  description,
  children,
}: {
  title: string;
  route: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn(glassPanel, "p-5")}>
      <span className="inline-flex rounded-md border border-white/35 bg-slate-950/[0.04] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-600 backdrop-blur-sm">
        {route}
      </span>
      <h3 className="mt-2 text-sm font-semibold tracking-tight text-slate-950">
        {title}
      </h3>
      {description ? (
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{description}</p>
      ) : null}
      <div className="mt-4 text-sm">{children}</div>
    </section>
  );
}

function PersonaStripMock() {
  return (
    <div className={cn("mb-3 overflow-hidden rounded-xl p-0", glassInset)}>
      <div
        className="h-0.5 bg-gradient-to-r from-slate-400/40 via-slate-300/30 to-transparent"
        aria-hidden
      />
      <div className="p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        Persona
      </p>
      <p className="mt-0.5 font-medium text-slate-950">Customer view</p>
      <p className="mt-1 text-xs text-slate-600">
        Static preview — in product this is the live persona switcher (Person A / B).
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-xs font-medium text-white shadow-sm shadow-slate-900/25">
          Person A
        </span>
        <span className="rounded-full border border-white/40 bg-white/55 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm">
          Person B
        </span>
      </div>
      <p className="mt-2 border-t border-slate-200/60 pt-2 text-[11px] leading-relaxed text-slate-600">
        <strong className="font-medium text-slate-800">Demo identities:</strong> Person
        A and Person B are Hedera test wallets in this project&apos;s demo — not real
        customer profiles.
      </p>
      </div>
    </div>
  );
}

export function BrandLabFlowMocks() {
  return (
    <div id="flow-mocks" className="scroll-mt-24 space-y-4">
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
            eyebrow="YourTurn · flows"
            title="Product flow mocks"
            descriptionClassName="max-w-3xl"
            description={
              <>
                Same gradient and glass language as signature surfaces — layouts
                copied from live routes so nothing important is invisible in the lab:
                browse stats, session detail (proof + history), resale mirror hints
                and fees, my passes actions, issuer table and freeze guardrails.
                Static only; use real pages to exercise APIs.
              </>
            }
          />

          <div
            className="mt-6 rounded-xl bg-slate-950/[0.04] px-3 py-2.5 text-xs leading-relaxed text-slate-700 backdrop-blur-sm"
            role="note"
          >
            <strong className="font-semibold text-slate-900">Static previews.</strong>{" "}
            Buttons and fields in this band do not call your server. Use{" "}
            <strong className="font-medium text-slate-800">Browse</strong>,{" "}
            <strong className="font-medium text-slate-800">My passes</strong>, resale
            URLs, and the provider dashboard on your dev machine to run real flows.
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:gap-8">
        <MockShell
          title="Available sessions"
          route="/slots"
          description="Actor strip, explainer, status counts, list row with Next step + Book."
        >
          <PersonaStripMock />
          <p className="mb-3 rounded-xl bg-slate-50/80 p-3 text-slate-700 shadow-sm backdrop-blur-sm">
            A session can only be booked while it is <strong>AVAILABLE</strong>.
            After booking, the pass moves to the customer who bought it.
          </p>
          <div className="mb-3 grid gap-2 sm:grid-cols-4">
            {(
              [
                [
                  "Available",
                  "2",
                  "h-0.5 bg-gradient-to-r from-emerald-400/50 to-transparent",
                ],
                ["Held", "1", "h-0.5 bg-gradient-to-r from-sky-400/50 to-transparent"],
                [
                  "Paused",
                  "0",
                  "h-0.5 bg-gradient-to-r from-amber-400/45 to-transparent",
                ],
                ["Used", "0", "h-0.5 bg-gradient-to-r from-slate-400/40 to-transparent"],
              ] as const
            ).map(([label, n, barClass]) => (
              <div
                key={label}
                className="overflow-hidden rounded-xl border border-white/25 bg-white/48 shadow-sm ring-1 ring-slate-900/[0.024] backdrop-blur-md"
              >
                <div className={barClass} aria-hidden />
                <div className="p-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    {label}
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                    {n}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <LabSessionBrowseRow
            title="Handstand Flow"
            scheduleLine="Apr 12, 6:00 PM → 6:55 PM"
            refSerial={12}
            priceHbar={20}
            status="AVAILABLE"
            statusClassName={statusTone("AVAILABLE")}
            stateHint="Ready to book"
            nextStep={
              <>
                Choose Person A or B, then tap{" "}
                <strong className="font-medium">Book</strong> on the live site. Today
                that commits in one tap; an optional confirm step is proposed — see{" "}
                <a
                  href="#signature"
                  className="font-medium text-blue-700 underline decoration-blue-700/40 underline-offset-2"
                >
                  Signature surfaces
                </a>
                .
              </>
            }
            footer={
              <>
                <span
                  className={cn(
                    getButtonClassName("textLink"),
                    "inline-flex min-h-[44px] items-center px-1 py-2.5"
                  )}
                >
                  Session details
                </span>
                <Button type="button" variant="primary" disabled className="px-3">
                  Book
                </Button>
              </>
            }
          />
          <div className="mt-3 rounded-xl bg-violet-500/[0.08] p-3 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-900">
              Proposed · same as signature band
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              Inline reminder: a review sheet before <strong>Book</strong> would match
              this copy — full mock lives under Signature surfaces.
            </p>
          </div>
        </MockShell>

        <MockShell
          title="Session detail"
          route="/slots/[serial]"
          description="Status, next step, holder, active listing, proof links, pass history."
        >
          <p className="mb-3 text-blue-700 underline decoration-blue-700/40 underline-offset-2">
            ← All sessions
          </p>
          <h4 className="text-base font-semibold">Handstand Flow</h4>
          <p className="mt-1 text-xs text-slate-600">
            Everything about this session pass in one place.
          </p>
          <SlotPassHeroCard
            className="mt-3 border-white/28 bg-white/50 shadow-sm ring-1 ring-slate-900/[0.028] backdrop-blur-md"
            serial={12}
            chainStatus="HELD"
            statusSummary="Someone currently holds this pass and can use it or resell it if the provider allows it."
            nextStep="If the current holder cannot attend, they can list this pass for sale."
            holderLabel="Person A"
            slot={{
              primaryPriceHbar: 20,
              startTime: "2026-04-12T16:00:00.000Z",
              endTime: "2026-04-12T17:00:00.000Z",
              resaleAllowed: true,
            }}
          />
          <LabAlertCallout tone="warn" title="Active listing" className="mt-3">
            <p>
              <span className="font-semibold tabular-nums">24 ℏ</span> ask — a new
              buyer can take over on the{" "}
              <span className="font-semibold underline decoration-amber-900/30">
                resale page
              </span>
              .
            </p>
          </LabAlertCallout>
          <div className="mt-3">
            <LabProofLinksPanel />
          </div>
          <div className="mt-3">
            <LabPassHistoryTimeline
              items={[
                {
                  body: "Person A booked this session for 20 ℏ.",
                  meta: formatSlotDateTime("2026-04-12T21:12:00.000Z"),
                },
              ]}
            />
          </div>
          <p className="mt-3 text-[10px] text-slate-500">
            Mobile: when resale is allowed, a fixed bottom bar offers “Sell pass”
            (see <code className="font-mono">SlotDetailStickyBar</code>).
          </p>
        </MockShell>

        <MockShell
          title="Resell this pass"
          route="/resale/[serial]"
          description="Mirror holder hint, blocked states, ask + 10% preview, List / Buy."
        >
          <PersonaStripMock />
          <div className="mb-2 space-y-2">
            <LabAlertCallout tone="info" title="Mirror holder">
              <p>
                This pass is held by <strong>Person A</strong> on Mirror. Match the
                selector when listing; use the other person to buy an active listing.
              </p>
            </LabAlertCallout>
            <LabAlertCallout tone="warn" title="Before you list">
              <p>
                Switch to <strong>Person A</strong> before listing — the API only
                accepts the current on-chain holder as seller.
              </p>
            </LabAlertCallout>
            <LabAlertCallout tone="success" title="Listing live">
              <p>
                <span className="font-semibold tabular-nums">24 ℏ</span> ask — another
                buyer can take over the pass.
              </p>
            </LabAlertCallout>
          </div>
          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              List or buy
            </p>
            <p className="font-medium text-slate-900">Current holder lists the pass</p>
            <label className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium text-slate-800">Ask (ℏ)</span>
              <input
                className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm tabular-nums"
                readOnly
                value="24"
              />
            </label>
            <LabResalePricingStrip askHbar="24" feePreviewHbar="2.40" />
            <p className="text-xs text-slate-600">
              Confirm final amounts on the completed resale transaction.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="primary" disabled className="w-fit">
                List this pass
              </Button>
              <Button
                type="button"
                variant="primarySuccess"
                disabled
                className="w-fit"
              >
                Buy this pass
              </Button>
            </div>
          </div>
          <div className="mt-4 space-y-3 rounded-xl bg-violet-500/[0.07] p-3 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-900">
              Proposed · step 2 before list
            </p>
            <div className="rounded-xl border border-white/28 bg-white/52 p-3 text-xs shadow-sm ring-1 ring-slate-900/[0.028] backdrop-blur-md">
              <p className="font-semibold text-slate-950">List at 24 ℏ?</p>
              <p className="mt-1 text-slate-600">
                Provider fee (10% preview): <span className="tabular-nums">2.40 ℏ</span>.
                Listing as <strong className="font-medium text-slate-800">Person A</strong>
                .
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="primary" disabled className="text-xs">
                  Confirm list
                </Button>
                <Button type="button" variant="secondary" disabled className="text-xs">
                  Go back
                </Button>
              </div>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-900">
              Proposed · step 2 before buy
            </p>
            <div className="rounded-xl border border-white/28 bg-white/52 p-3 text-xs shadow-sm ring-1 ring-slate-900/[0.028] backdrop-blur-md">
              <p className="font-semibold text-slate-950">Buy this pass?</p>
              <p className="mt-1 text-slate-600">
                <span className="tabular-nums">24 ℏ</span> · taking over from Person A ·
                buying as{" "}
                <strong className="font-medium text-slate-800">Person B</strong>.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="primarySuccess"
                  disabled
                  className="text-xs"
                >
                  Confirm purchase
                </Button>
                <Button type="button" variant="secondary" disabled className="text-xs">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[10px] text-slate-500">
            Mobile: fixed bottom bar with List + Buy (see{" "}
            <code className="font-mono">ResaleClient</code>).
          </p>
        </MockShell>

        <MockShell
          title="My passes"
          route="/my-bookings"
          description="Held card with status, next action, Session details + Sell pass."
        >
          <PersonaStripMock />
          <p className="mb-3 rounded-xl bg-slate-50/80 p-2 text-xs text-slate-700 backdrop-blur-sm">
            Showing passes for <strong>Person A</strong>.{" "}
            <span className="text-slate-500">
              (Technical id: <span className="font-mono">0.0.xxx</span>)
            </span>
          </p>
          <LabMyPassTile
            refSerial={12}
            title="Handstand Flow"
            status="HELD"
            statusClassName={statusTone("HELD")}
            summary="You currently hold this pass."
            nextHint={
              <>
                Keep it for the session or list it for sale if you cannot attend.
              </>
            }
            footer={
              <>
                <span
                  className={cn(
                    getButtonClassName("textLink"),
                    "inline-flex min-h-[44px] items-center px-1 py-2.5"
                  )}
                >
                  Session details
                </span>
                <span
                  className={cn(
                    getButtonClassName("primary"),
                    "inline-flex min-h-[44px] items-center rounded-md px-3 no-underline"
                  )}
                >
                  Sell pass
                </span>
              </>
            }
          />
          <p className="mt-3 text-xs text-slate-600">
            Product also shows empty state, “Recently finished” USED list, and
            Refresh list.
          </p>
        </MockShell>

        <MockShell
          title="Provider dashboard"
          route="/issuer"
          description="Business banner, live sessions table, pause/reopen guardrails, check-in."
        >
          <div className="mb-3 overflow-hidden rounded-xl bg-slate-50/80 shadow-sm backdrop-blur-sm">
            <div
              className="h-0.5 bg-gradient-to-r from-violet-500/35 via-slate-400/25 to-transparent"
              aria-hidden
            />
            <div className="p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Provider
              </p>
              <p className="mt-0.5 font-medium text-slate-900">Business view</p>
              <p className="mt-1 text-xs text-slate-600">
                Back-office: create sessions, confirm holder, pause movement, check
                in.
              </p>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Button type="button" variant="primary" disabled className="text-xs">
              Set up business
            </Button>
            <Button type="button" variant="primary" disabled className="text-xs">
              Create demo sessions
            </Button>
            <Button type="button" variant="secondary" disabled className="text-xs">
              Start over
            </Button>
          </div>
          <div className="mb-3 rounded-xl bg-amber-400/12 p-3 text-xs backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-950">
              Proposed · confirm destructive reset
            </p>
            <div className="mt-2 rounded-xl border border-white/28 bg-white/52 p-3 shadow-sm ring-1 ring-slate-900/[0.028] backdrop-blur-md">
              <p className="font-semibold text-slate-950">Reset the whole demo?</p>
              <p className="mt-1 text-slate-600">
                This would clear demo sessions and listings in the current build. Not
                wired here — live{" "}
                <code className="font-mono text-[11px]">/issuer</code> runs immediately
                today.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="danger" disabled className="text-xs">
                  Yes, reset demo
                </Button>
                <Button type="button" variant="secondary" disabled className="text-xs">
                  Keep current data
                </Button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/25 bg-white/46 shadow-sm ring-1 ring-slate-900/[0.026] backdrop-blur-md">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Ref</th>
                  <th className="px-2 py-1.5 font-medium">Status</th>
                  <th className="px-2 py-1.5 font-medium">Holder</th>
                  <th className="px-2 py-1.5 font-medium">Resale</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-medium">#12</td>
                  <td className="px-2 py-1.5">
                    <span
                      className={cn(
                        "inline-flex rounded px-1.5 py-0.5 font-medium",
                        statusTone("HELD")
                      )}
                    >
                      HELD
                    </span>
                  </td>
                  <td className="px-2 py-1.5">Person A</td>
                  <td className="px-2 py-1.5">Active resale</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3 rounded-xl border border-white/28 bg-white/50 p-3 shadow-sm ring-1 ring-slate-900/[0.028] backdrop-blur-md">
            <h5 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Pause or reopen a pass
            </h5>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-100/90 bg-slate-50/80 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Ref
                </p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">
                  #12
                </p>
              </div>
              <div className="rounded-lg border border-slate-100/90 bg-slate-50/80 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Holder
                </p>
                <p className="mt-0.5 text-sm font-medium text-slate-900">Person A</p>
              </div>
              <div className="rounded-lg border border-slate-100/90 bg-slate-50/80 px-2.5 py-2 sm:col-span-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Mirror
                </p>
                <p className="mt-0.5 text-xs leading-snug text-slate-600">
                  Dropdown must match for API success
                </p>
              </div>
            </div>
            <div className="mt-2">
              <LabAlertCallout tone="warn" title="Guardrail">
                <p>
                  The <strong>Person</strong> dropdown must match the current holder
                  before pause or reopen will succeed.
                </p>
              </LabAlertCallout>
            </div>
            <div className="mt-2 flex gap-2">
              <Button type="button" variant="amber" disabled className="text-xs">
                Pause pass
              </Button>
              <Button type="button" variant="muted" disabled className="text-xs">
                Reopen pass
              </Button>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-white/28 bg-white/50 p-3 shadow-sm ring-1 ring-slate-900/[0.028] backdrop-blur-md">
            <h5 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Check in and close the pass
            </h5>
            <p className="mt-1 text-xs text-slate-600">
              Redemption step when the session actually happens.
            </p>
            <Button type="button" variant="danger" disabled className="mt-2 text-xs">
              Check in / mark used
            </Button>
            <div className="mt-3 rounded-xl bg-rose-500/[0.09] p-3 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-900">
                Proposed · confirm check-in
              </p>
              <div className="mt-2 rounded-xl border border-white/28 bg-white/52 p-3 text-xs shadow-sm ring-1 ring-slate-900/[0.028] backdrop-blur-md">
                <p className="font-semibold text-slate-950">
                  Check in ref #12 and close the pass?
                </p>
                <p className="mt-1 text-slate-600">
                  This cannot be undone in the demo customer UI after completion.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="danger" disabled className="text-xs">
                    Yes, check in
                  </Button>
                  <Button type="button" variant="secondary" disabled className="text-xs">
                    Not yet
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </MockShell>

        <MockShell
          title="Empty & blocked copy"
          route="Various"
          description="Patterns worth keeping visible for demos and reviews."
        >
          <LabEmptyStatePatterns
            rows={[
              {
                label: "No token",
                body: "The business needs to set up the demo before passes can appear here.",
              },
              {
                label: "No sessions",
                body: "No sessions are live yet — link to provider dashboard.",
              },
              {
                label: "Resale blocked",
                body: (
                  <>
                    Provider has paused this pass / resale not allowed / already used
                    — see{" "}
                    <code className="font-mono text-[11px] text-slate-800">
                      resaleBlockedMessage
                    </code>{" "}
                    in product.
                  </>
                ),
              },
              {
                label: "No customer undo",
                body: "In this demo, a completed booking is not cancelled from the customer UI — say so in product copy or add cancel later.",
              },
            ]}
          />
        </MockShell>
          </div>
        </div>
      </div>
    </div>
  );
}
