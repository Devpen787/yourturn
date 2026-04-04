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
  if (status === "HELD") return "You currently hold this booking right.";
  if (status === "FROZEN") return "The issuer has temporarily blocked movement of this booking right.";
  if (status === "USED") return "This booking right has already been used and closed.";
  return "This booking right is not currently active in your wallet.";
}

function nextAction(status: string, canResell: boolean): string {
  if (status === "HELD" && canResell) {
    return "You can keep this booking right, use it for the scheduled session, or list it for resale if you cannot attend.";
  }
  if (status === "HELD") {
    return "This booking right is active, but resale is not currently available for this slot.";
  }
  if (status === "FROZEN") {
    return "Movement is blocked until the issuer unfreezes this booking right.";
  }
  if (status === "USED") {
    return "No further action is needed. This booking lifecycle is complete.";
  }
  return "Refresh after the latest Hedera state appears in Mirror.";
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

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold">My bookings</h1>
      <ActorSelector pageDefault="guestA" onChange={setActor} />
      {!tokenId && (
        <p className="text-slate-600">Initialize the app first from Issuer.</p>
      )}
      {actor === "issuer" && (
        <p className="text-amber-800">Switch to guestA or guestB to see NFTs.</p>
      )}
      {actor !== "issuer" && tokenId && (
        <p className="mb-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          This page shows booking rights currently held by the selected guest according to Mirror-backed state.
          {" "}Selected account: <span className="font-mono text-xs">{accountId || "—"}</span>
        </p>
      )}
      {actor !== "issuer" && tokenId && held.length > 0 && (
        <p className="mb-4 text-sm text-slate-600">
          {held.length} active booking right{held.length === 1 ? "" : "s"} currently held by {actor}.
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
            No active held slots for this actor. If you just booked or bought a slot,
            refresh after the chain state appears in Mirror.
          </p>
          <Link href="/slots" className="mt-3 inline-flex text-blue-700 underline">
            Browse available slots
          </Link>
        </div>
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
