"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ActorSelector, type ActorValue } from "@/components/ActorSelector";
import { Button } from "@/components/ui/Button";
import { getButtonClassName } from "@/components/ui/button-classes";
import { cn } from "@/lib/cn";

type Row = {
  serial: number;
  title: string;
  status: string;
  holderAccountId: string | null;
  canResell: boolean;
};

function statusTone(status: string): string {
  if (status === "HELD") return "bg-blue-50 text-blue-900";
  if (status === "FROZEN") return "bg-amber-50 text-amber-900";
  if (status === "USED") return "bg-emerald-50 text-emerald-900";
  return "bg-slate-100 text-slate-800";
}

function statusCopy(status: string): string {
  if (status === "HELD") return "You currently hold this pass.";
  if (status === "FROZEN") return "The provider has temporarily paused movement of this pass.";
  if (status === "USED") return "This pass has already been checked in and closed.";
  return "This pass is not currently active for you.";
}

function nextAction(status: string, canResell: boolean): string {
  if (status === "HELD" && canResell) {
    return "You can keep this pass for the session or list it for sale if you cannot attend.";
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
}: {
  guestAId: string;
  guestBId: string;
  tokenId: string | null;
  initialRows: Row[];
}) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [actor, setActor] = useState<ActorValue>("guestA");

  function refresh() {
    startRefresh(() => {
      router.refresh();
    });
  }

  const accountId = useMemo(() => {
    if (actor === "guestA") return guestAId;
    if (actor === "guestB") return guestBId;
    return "";
  }, [actor, guestAId, guestBId]);

  const held = initialRows.filter((r) => {
    if (!accountId || !tokenId) return false;
    if (r.holderAccountId !== accountId) return false;
    return r.status === "HELD" || r.status === "FROZEN";
  });
  const usedRows = initialRows.filter((r) => r.status === "USED");

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold">My passes</h1>
      <ActorSelector
        pageDefault="guestA"
        allowedActors={["guestA", "guestB"]}
        title="Customer view"
        description="Switch between Person A and Person B to see each customer’s active passes and resale options."
        onChange={setActor}
      />
      <p className="mb-3 text-sm text-slate-600">
        Person A and Person B are demo customer identities, not real sign-ins.{" "}
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
        <p className="mb-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          Showing passes for{" "}
          <strong>{actor === "guestA" ? "Person A" : "Person B"}</strong> in this
          demo.{" "}
          <span className="text-slate-500">
            (Technical id:{" "}
            <span className="font-mono text-xs">{accountId || "—"}</span>)
          </span>
        </p>
      )}
      {tokenId && (
        <p className="mb-4 rounded border border-slate-200 bg-white p-3 text-sm text-slate-700">
          Need the full lifecycle for a pass? Open{" "}
          <strong>Session details</strong> on any row below to see the activity
          history, current status, and proof links in one place.
        </p>
      )}
      {tokenId && held.length > 0 && (
        <p className="mb-4 text-sm text-slate-600">
          {held.length} active pass{held.length === 1 ? "" : "es"} currently held by {actor === "guestA" ? "Person A" : "Person B"}.
        </p>
      )}
      <ul className="mt-4 space-y-3">
        {held.map((r) => (
          <li
            key={r.serial}
            className="rounded border border-slate-200 bg-white p-4 text-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="font-medium">
                Ref #{r.serial} — {r.title}
              </div>
              <span
                className={`inline-flex rounded px-2 py-1 text-xs font-medium ${statusTone(
                  r.status
                )}`}
              >
                {r.status}
              </span>
            </div>
            <div className="mt-2 text-slate-600">{statusCopy(r.status)}</div>
            <div className="mt-2 rounded bg-slate-50 p-3 text-slate-700">
              <span className="font-medium text-slate-900">What you can do next:</span>{" "}
              {nextAction(r.status, r.canResell)}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Link
                className={cn(
                  getButtonClassName("textLink"),
                  "min-h-[44px] min-w-0 px-1 py-2.5"
                )}
                href={`/slots/${r.serial}`}
              >
                Session details
              </Link>
              {r.canResell && r.status === "HELD" && (
                <Link
                  className={cn(
                    getButtonClassName("primary"),
                    "no-underline"
                  )}
                  href={`/resale/${r.serial}`}
                >
                  Sell pass
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
      {held.length === 0 && tokenId && (
        <div className="rounded border border-slate-200 bg-white p-4 text-slate-600">
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
        <section className="mt-6">
          <h2 className="text-sm font-medium text-slate-900">
            Recently finished in this demo
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            These passes have already been checked in and are no longer active for any
            customer. This section is shared demo history, not just the selected
            person&apos;s past passes.
          </p>
          <ul className="mt-3 space-y-3">
            {usedRows.map((r) => (
              <li
                key={`used-${r.serial}`}
                className="rounded border border-slate-200 bg-white p-4 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="font-medium">
                    Ref #{r.serial} — {r.title}
                  </div>
                  <span
                    className={`inline-flex rounded px-2 py-1 text-xs font-medium ${statusTone(
                      r.status
                    )}`}
                  >
                    {r.status}
                  </span>
                </div>
                <div className="mt-2 text-slate-600">{statusCopy(r.status)}</div>
                <Link
                  className={cn(
                    getButtonClassName("textLink"),
                    "mt-2 inline-flex min-h-[44px] items-center"
                  )}
                  href={`/slots/${r.serial}`}
                >
                  Session details
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="mt-4">
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
