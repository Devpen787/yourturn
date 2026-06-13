"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ActorSelector, type ActorValue } from "@/components/ActorSelector";
import { PassTile, type PassTileTone } from "@/components/passes/PassTile";
import { Button } from "@/components/ui/Button";
import { getButtonClassName } from "@/components/ui/button-classes";
import { cn } from "@/lib/cn";
import { accountsEqual } from "@/lib/domain/account";

type Row = {
  serial: number;
  title: string;
  status: string;
  holderAccountId: string | null;
  canResell: boolean;
  listingActive: boolean;
};

function passTone(status: string): PassTileTone {
  if (status === "FOR_SALE") return "listed";
  if (status === "HELD") return "active";
  if (status === "FROZEN") return "paused";
  if (status === "USED") return "used";
  return "neutral";
}

function statusCopy(status: string): string {
  if (status === "FOR_SALE")
    return "You listed this pass for resale. It is now visible to buyers.";
  if (status === "HELD") return "You currently hold this pass.";
  if (status === "FROZEN") return "The provider has temporarily paused movement of this pass.";
  if (status === "USED") return "This pass has already been checked in and closed.";
  return "This pass is not currently active for you.";
}

function nextAction(status: string, canResell: boolean): string {
  if (status === "FOR_SALE") {
    return "Keep it listed, or open resale to review and complete the handoff with the buyer.";
  }
  if (status === "HELD" && canResell) {
    return "You can keep this pass for the session or use Concierge to list it if you cannot attend.";
  }
  if (status === "HELD") {
    return "This pass is active, but resale is not currently available for this session.";
  }
  if (status === "FROZEN") {
    return "Nothing can move until the provider reopens this pass.";
  }
  if (status === "USED") {
    return "Nothing else is needed. This pass has already been used.";
  }
  return "Refresh in a moment if the latest update has not appeared yet.";
}

export function MyBookingsClient({
  guestAId,
  guestBId,
  tokenId,
  initialRows,
  lockTo,
}: {
  guestAId: string;
  guestBId: string;
  tokenId: string | null;
  initialRows: Row[];
  lockTo?: "guestA" | "guestB";
}) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [actor, setActor] = useState<ActorValue>(lockTo ?? "guestA");

  function refresh() {
    startRefresh(() => {
      router.refresh();
    });
  }

  const accountId = useMemo(() => {
    if (actor === "guestA") return guestAId.trim();
    if (actor === "guestB") return guestBId.trim();
    return "";
  }, [actor, guestAId, guestBId]);

  const held = initialRows.filter((r) => {
    if (!accountId || !tokenId) return false;
    if (!r.holderAccountId || !accountsEqual(r.holderAccountId, accountId))
      return false;
    return r.status === "HELD" || r.status === "FROZEN";
  });
  const usedRows = initialRows.filter((r) => r.status === "USED");

  return (
    <div className="space-y-5">
      <section className="rounded-[1.5rem] border border-slate-200/80 bg-gradient-to-br from-white via-blue-50/70 to-violet-50/70 p-5 shadow-sm ring-1 ring-slate-900/[0.025] sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Pass hub
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              Your upcoming bookings
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Keep, inspect, or hand off a scarce session under provider rules.
              If plans change, Concierge can preview a resale recovery path before
              anything moves.
            </p>
          </div>
          <Link
            href="/slots"
            className={cn(getButtonClassName("primary"), "no-underline")}
          >
            Browse sessions
          </Link>
        </div>
      </section>
      <ActorSelector
        pageDefault={lockTo ?? "guestA"}
        allowedActors={["guestA", "guestB"]}
        title="Customer view"
        description="Switch between Person A and Person B to see each customer’s active passes and resale options."
        lockTo={lockTo}
        onChange={setActor}
      />
      <p className="text-sm text-slate-600">
        Person A and Person B are demo customer identities. When you use demo sign-in, this page locks to that customer.{" "}
        <Link
          href="/demo-help"
          className={cn(getButtonClassName("textLink"), "min-h-0 px-0 py-0 text-sm")}
        >
          How this demo works
        </Link>
      </p>
      {!tokenId && (
        <p className="text-slate-600">The business needs to set up the demo before passes can appear here.</p>
      )}
      {tokenId && (
        <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 text-sm text-slate-700 shadow-sm ring-1 ring-slate-900/[0.02]">
          <p>
            Showing passes for{" "}
            <strong>{actor === "guestA" ? "Person A" : "Person B"}</strong>. Open
            <strong> Session details</strong> on any pass to see lifecycle status
            and verification links.
          </p>
          <details className="mt-2 text-xs text-slate-500">
            <summary className="cursor-pointer rounded-md font-medium text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2">
              Technical account id
            </summary>
            <p className="mt-1 font-mono">{accountId || "—"}</p>
          </details>
        </div>
      )}
      {tokenId && held.length > 0 && (
        <p className="text-sm text-slate-600">
          {held.length} active pass{held.length === 1 ? "" : "es"} currently held by {actor === "guestA" ? "Person A" : "Person B"}.
        </p>
      )}
      <ul className="space-y-4">
        {held.map((r) => {
          const displayStatus =
            r.status === "HELD" && r.listingActive ? "FOR_SALE" : r.status;
          return (
          <li key={r.serial}>
            <PassTile
              serial={r.serial}
              title={r.title}
              status={displayStatus}
              tone={passTone(displayStatus)}
              summary={statusCopy(displayStatus)}
              nextStep={nextAction(displayStatus, r.canResell)}
              action={
                <>
                  {displayStatus === "FOR_SALE" && (
                <Link
                  className={cn(
                    getButtonClassName("primarySuccess"),
                    "no-underline"
                  )}
                  href={`/resale/${r.serial}`}
                >
                  View listing
                </Link>
                  )}
                  {r.canResell && displayStatus === "HELD" && (
                <Link
                  className={cn(
                    getButtonClassName("primary"),
                    "no-underline"
                  )}
                  href={`/resale/${r.serial}?mode=recovery`}
                >
                  Recover booking
                </Link>
                  )}
                </>
              }
            />
          </li>
        )})}
      </ul>
      {held.length === 0 && tokenId && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-600 shadow-sm">
          <p>
            No active passes are showing for this person right now. If you just booked or bought one,
            refresh in a moment and check again.
          </p>
          <Link
            href="/slots"
            className={cn(
              getButtonClassName("textLink"),
              "mt-3 inline-flex min-h-[44px] items-center"
            )}
          >
            Browse sessions
          </Link>
        </div>
      )}
      {tokenId && usedRows.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-slate-900">
            Recently finished in this demo
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            These passes have already been checked in and are no longer active for any
            customer. This section is shared demo history, not just the selected
            person&apos;s past passes.
          </p>
          <ul className="mt-3 space-y-4">
            {usedRows.map((r) => (
              <li key={`used-${r.serial}`}>
                <PassTile
                  serial={r.serial}
                  title={r.title}
                  status={r.status}
                  tone={passTone(r.status)}
                  summary={statusCopy(r.status)}
                  nextStep={nextAction(r.status, r.canResell)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
      <div>
        <Button
          type="button"
          variant="secondary"
          loading={isRefreshing}
          loadingLabel="Updating…"
          className="px-3 text-xs font-normal"
          onClick={refresh}
        >
          Refresh list
        </Button>
      </div>
    </div>
  );
}
