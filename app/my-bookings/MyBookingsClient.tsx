"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ActorSelector, type ActorValue } from "@/components/ActorSelector";

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
  const [actor, setActor] = useState<ActorValue>("guestA");

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
      <ActorSelector pageDefault="guestA" onChange={setActor} />
      {!tokenId && (
        <p className="text-slate-600">The provider needs to set up the demo before passes can appear here.</p>
      )}
      {actor === "issuer" && (
        <p className="text-amber-800">Switch to Person A or Person B to see customer passes.</p>
      )}
      {actor !== "issuer" && tokenId && (
        <p className="mb-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          This page shows the passes currently held by the selected person.
          {" "}Selected account: <span className="font-mono text-xs">{accountId || "—"}</span>
        </p>
      )}
      {actor !== "issuer" && tokenId && held.length > 0 && (
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
                #{r.serial} — {r.title}
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
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                className="text-blue-700 underline"
                href={`/slots/${r.serial}`}
              >
                Details
              </Link>
              {r.canResell && r.status === "HELD" && (
                <Link
                  className="rounded bg-slate-800 px-2 py-1 text-white no-underline"
                  href={`/resale/${r.serial}`}
                >
                  Resell
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
      {held.length === 0 && tokenId && actor !== "issuer" && (
        <div className="rounded border border-slate-200 bg-white p-4 text-slate-600">
          <p>
            No active passes are showing for this person right now. If you just booked or bought one,
            refresh in a moment and check again.
          </p>
          <Link href="/slots" className="mt-3 inline-flex text-blue-700 underline">
            Browse sessions
          </Link>
        </div>
      )}
      {actor !== "issuer" && tokenId && usedRows.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-medium text-slate-900">Recently finished</h2>
          <p className="mt-1 text-sm text-slate-600">
            These passes have already been checked in and are no longer active for any customer.
          </p>
          <ul className="mt-3 space-y-3">
            {usedRows.map((r) => (
              <li
                key={`used-${r.serial}`}
                className="rounded border border-slate-200 bg-white p-4 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="font-medium">
                    #{r.serial} — {r.title}
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
                  className="mt-2 inline-flex text-blue-700 underline"
                  href={`/slots/${r.serial}`}
                >
                  View details
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="mt-4 text-xs text-slate-500">
        <button
          type="button"
          className="underline"
          onClick={() => router.refresh()}
        >
          Refresh
        </button>
      </p>
    </div>
  );
}
