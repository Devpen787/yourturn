"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ActorSelector, type ActorValue } from "@/components/ActorSelector";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LiveFeedback } from "@/components/ui/LiveFeedback";
import { getButtonClassName } from "@/components/ui/button-classes";
import { cn } from "@/lib/cn";
import { getHashscanTxUrl } from "@/lib/hedera/hashscan";

export type SlotRow = {
  serial: number;
  title: string;
  startTime: string;
  endTime: string;
  primaryPriceHbar: number;
  status: string;
  listingActive?: boolean;
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusTone(status: string): string {
  if (status === "AVAILABLE") return "bg-slate-100 text-slate-800";
  if (status === "FOR_SALE") return "bg-violet-100 text-violet-900";
  if (status === "HELD") return "bg-blue-50 text-blue-900";
  if (status === "FROZEN") return "bg-amber-50 text-amber-900";
  if (status === "USED") return "bg-emerald-50 text-emerald-900";
  return "bg-slate-100 text-slate-800";
}

function statusHint(status: string): string {
  if (status === "AVAILABLE") return "Ready to book";
  if (status === "FOR_SALE") return "Listed on resale";
  if (status === "HELD") return "Already booked";
  if (status === "FROZEN") return "Temporarily paused";
  if (status === "USED") return "Already checked in";
  return status;
}

function nextStepHint(status: string): string {
  if (status === "AVAILABLE") {
    return "Choose the person who is booking, review the session, and book it if it still works for them.";
  }
  if (status === "FOR_SALE") {
    return "Open resale to buy this listed pass from the current holder.";
  }
  if (status === "HELD") {
    return "Open details to see who holds the pass now and whether it can be resold.";
  }
  if (status === "FROZEN") {
    return "This pass cannot move until the provider reopens it.";
  }
  if (status === "USED") {
    return "This pass has already been used. The provider can create a fresh session for another run.";
  }
  return "Open details to see the current booking status.";
}

export function SlotsClient({
  rows,
  lockTo,
}: {
  rows: SlotRow[];
  lockTo?: "guestA" | "guestB";
}) {
  const router = useRouter();
  const toast = useToast();
  const [actor, setActor] = useState<ActorValue>("guestA");
  const [success, setSuccess] = useState<string | null>(null);
  const [successLink, setSuccessLink] = useState<{
    href: string;
    label: string;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<number | null>(null);
  const [optimisticHeldSerial, setOptimisticHeldSerial] = useState<number | null>(
    null
  );
  const [pendingBooking, setPendingBooking] = useState<SlotRow | null>(null);

  useEffect(() => {
    if (optimisticHeldSerial == null) return;
    const row = rows.find((r) => r.serial === optimisticHeldSerial);
    if (row && row.status !== "AVAILABLE") {
      setOptimisticHeldSerial(null);
    }
  }, [rows, optimisticHeldSerial]);

  function effectiveStatus(row: SlotRow): string {
    if (optimisticHeldSerial === row.serial && row.status === "AVAILABLE") {
      return "HELD";
    }
    if (row.listingActive && row.status === "HELD") {
      return "FOR_SALE";
    }
    return row.status;
  }

  const availableCount = rows.filter(
    (row) => effectiveStatus(row) === "AVAILABLE"
  ).length;
  const heldCount = rows.filter((row) => effectiveStatus(row) === "HELD").length;
  const forSaleCount = rows.filter(
    (row) => effectiveStatus(row) === "FOR_SALE"
  ).length;
  const frozenCount = rows.filter(
    (row) => effectiveStatus(row) === "FROZEN"
  ).length;
  const usedCount = rows.filter((row) => effectiveStatus(row) === "USED").length;

  async function book(serial: number): Promise<boolean> {
    if (actor !== "guestA" && actor !== "guestB") {
      setErr("Switch to Person A or Person B before booking.");
      return false;
    }
    setLoading(serial);
    setSuccess(null);
    setSuccessLink(null);
    setErr(null);
    setOptimisticHeldSerial(serial);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor, serial }),
      });
      const data = await res.json();
      if (!data.ok) {
        setOptimisticHeldSerial(null);
        setErr(data.error || res.statusText);
        return false;
      }
      const personLabel = actor === "guestA" ? "Person A" : "Person B";
      const txHref =
        typeof data.txId === "string" && data.txId.length > 0
          ? getHashscanTxUrl(data.txId)
          : null;
      setSuccess(
        `${personLabel} booked Ref #${serial}. The pass is now active and will appear in My passes and the provider dashboard.`
      );
      setSuccessLink(
        txHref
          ? {
              href: txHref,
              label: "View transaction on HashScan",
            }
          : null
      );
      toast({
        variant: "success",
        message: "Booked. Confirmation is on-chain.",
        link: txHref
          ? {
              href: txHref,
              label: "View transaction on HashScan",
            }
          : undefined,
      });
      router.refresh();
      return true;
    } catch (e) {
      setOptimisticHeldSerial(null);
      setErr(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold">Available sessions</h1>
      <ActorSelector
        pageDefault={lockTo ?? "guestA"}
        allowedActors={["guestA", "guestB"]}
        title="Customer view"
        description="Switch between Person A and Person B to see the booking experience from each customer side of the demo."
        lockTo={lockTo}
        onChange={setActor}
      />
      <p className="mb-3 text-sm text-slate-600">
        Person A and Person B are demo customer identities. When you use demo sign-in, this view locks to that person.{" "}
        <Link
          href="/demo-help"
          className={cn(getButtonClassName("textLink"), "min-h-0 px-0 py-0 text-sm")}
        >
          How this demo works
        </Link>
      </p>
      <LiveFeedback
        className="mb-2 space-y-2"
        success={success}
        successLink={successLink}
        error={err}
      />
      <p className="mb-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        A session can only be booked while it is <strong>AVAILABLE</strong>. After booking, the pass moves to the customer who bought it and may later be resold, paused, or checked in under provider rules.
      </p>
      {rows.length > 0 && (
        <div className="mb-4 grid gap-3 md:grid-cols-5">
          <div className="rounded border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Available</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{availableCount}</p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">For sale</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{forSaleCount}</p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Held</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{heldCount}</p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Paused
            </p>
            <p className="mt-1 text-[10px] font-normal normal-case tracking-normal text-slate-500">
              Movement on hold by provider
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{frozenCount}</p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Used</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{usedCount}</p>
          </div>
        </div>
      )}
      <ul className="space-y-3">
        {rows.map((r) => {
          const displayStatus = effectiveStatus(r);
          return (
            <li
              key={r.serial}
              className="rounded border border-slate-200 bg-white p-4 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-slate-600">
                    {formatDateTime(r.startTime)} → {formatDateTime(r.endTime)}
                  </div>
                </div>
                <span
                  className={`inline-flex rounded px-2 py-1 text-xs font-medium ${statusTone(
                    displayStatus
                  )}`}
                >
                  {displayStatus}
                </span>
              </div>
              <div className="mt-1">
                Ref <strong>#{r.serial}</strong> · Price:{" "}
                <strong>{r.primaryPriceHbar} ℏ</strong>
              </div>
              <div className="mt-1 text-slate-600">{statusHint(displayStatus)}</div>
              <div className="mt-2 rounded bg-slate-50 p-3 text-slate-700">
                <span className="font-medium text-slate-900">Next step:</span>{" "}
                {nextStepHint(displayStatus)}
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
                {displayStatus === "AVAILABLE" && (
                  <Button
                    type="button"
                    loading={loading === r.serial}
                    loadingLabel="Booking…"
                    disabled={loading !== null && loading !== r.serial}
                    className="min-w-[5.5rem] px-3"
                    onClick={() => {
                      setErr(null);
                      setPendingBooking(r);
                    }}
                  >
                    Book
                  </Button>
                )}
                {displayStatus === "FOR_SALE" && (
                  <Link
                    className={cn(
                      getButtonClassName("primarySuccess"),
                      "no-underline"
                    )}
                    href={`/resale/${r.serial}`}
                  >
                    Buy on resale
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {rows.length === 0 && (
        <div className="rounded border border-slate-200 bg-white p-4 text-slate-600">
          <p>No sessions are live yet. The business needs to set up the demo first.</p>
          <Link
            href="/issuer"
            className={cn(
              getButtonClassName("textLink"),
              "mt-3 inline-flex min-h-[44px] items-center"
            )}
          >
            Open provider dashboard
          </Link>
        </div>
      )}
      <ConfirmDialog
        open={pendingBooking != null}
        title="Review this booking"
        description="Make sure the session, customer, and price are right before you commit the booking."
        details={
          pendingBooking
            ? [
                { label: "Customer", value: actor === "guestA" ? "Person A" : "Person B" },
                { label: "Session", value: pendingBooking.title },
                {
                  label: "Time",
                  value: `${formatDateTime(pendingBooking.startTime)} – ${formatDateTime(
                    pendingBooking.endTime
                  )}`,
                },
                { label: "Price", value: `${pendingBooking.primaryPriceHbar} ℏ` },
                { label: "Reference", value: `#${pendingBooking.serial}` },
              ]
            : []
        }
        warning="Bookings are final in this demo. There is no cancel or refund flow yet."
        confirmLabel="Book this session"
        loading={pendingBooking != null && loading === pendingBooking.serial}
        loadingLabel="Booking…"
        onClose={() => {
          if (loading == null) setPendingBooking(null);
        }}
        onConfirm={() => {
          if (!pendingBooking) return;
          void book(pendingBooking.serial).then((ok) => {
            if (ok) setPendingBooking(null);
          });
        }}
      />
    </div>
  );
}
