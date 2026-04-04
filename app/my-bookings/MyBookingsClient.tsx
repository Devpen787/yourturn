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
      <ul className="mt-4 space-y-3">
        {held.map((r) => (
          <li
            key={r.serial}
            className="rounded border border-slate-200 bg-white p-4 text-sm"
          >
            <div className="font-medium">
              #{r.serial} — {r.title}
            </div>
            <div className="mt-1">Status: {r.status}</div>
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
        <p className="text-slate-600">
          No held slots for this actor (check Mirror holdings after booking).
        </p>
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
