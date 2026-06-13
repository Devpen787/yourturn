"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ActorSelector, type ActorValue } from "@/components/ActorSelector";
import {
  SessionCard,
  type SessionCardStatusTone,
} from "@/components/marketplace/SessionCard";
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

function statusCardTone(status: string): SessionCardStatusTone {
  if (status === "FOR_SALE") return "listed";
  if (status === "HELD") return "held";
  if (status === "FROZEN") return "paused";
  if (status === "USED") return "used";
  return "available";
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

function displayMeta(serial: number, title: string) {
  const category = title.toLowerCase().includes("handstand")
    ? "Movement"
    : title.toLowerCase().includes("flow")
      ? "Studio class"
      : "Service slot";
  const provider =
    serial % 3 === 0
      ? "North Loop Studio"
      : serial % 3 === 1
        ? "YourTurn Movement"
        : "Brooklyn Recovery Lab";
  const location =
    serial % 3 === 0
      ? "Williamsburg"
      : serial % 3 === 1
        ? "SoHo"
        : "Dumbo";
  const rating = serial % 2 === 0 ? "4.9 rating" : "4.8 rating";
  return { category, provider, location, rating };
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
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

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
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(rows.map((row) => displayMeta(row.serial, row.title).category)))],
    [rows]
  );
  const visibleRows = rows.filter((row) => {
    const meta = displayMeta(row.serial, row.title);
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      normalizedQuery.length === 0 ||
      [row.title, meta.provider, meta.location, meta.category]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    const matchesCategory = category === "All" || meta.category === category;
    return matchesQuery && matchesCategory;
  });

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
    <div className="space-y-5">
      <section className="rounded-[1.5rem] border border-slate-200/80 bg-gradient-to-br from-white via-sky-50/60 to-slate-100/90 p-5 shadow-sm ring-1 ring-slate-900/[0.025] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Browse sessions
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Find a slot you can actually use
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Book scarce classes and service appointments under provider rules.
              Hedera proof stays available when you need to inspect the pass.
            </p>
          </div>
          <Link
            href="/my-bookings"
            className={cn(getButtonClassName("primary"), "no-underline")}
          >
            My bookings
          </Link>
        </div>
      </section>
      <ActorSelector
        pageDefault={lockTo ?? "guestA"}
        allowedActors={["guestA", "guestB"]}
        title="Customer view"
        description="Switch between Person A and Person B to see the booking experience from each customer side of the demo."
        lockTo={lockTo}
        onChange={setActor}
      />
      <p className="text-sm text-slate-600">
        Person A and Person B are demo customer identities. When you use demo sign-in, this view locks to that person.{" "}
        <Link
          href="/demo-help"
          className={cn(getButtonClassName("textLink"), "min-h-0 px-0 py-0 text-sm")}
        >
          How this demo works
        </Link>
      </p>
      <LiveFeedback
        className="space-y-2"
        success={success}
        successLink={successLink}
        error={err}
      />
      <section className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-sm ring-1 ring-slate-900/[0.02] sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">
            Search sessions
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-2 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2"
            placeholder="Class, provider, or neighborhood"
            type="search"
          />
        </label>
        <label className="block sm:w-48">
          <span className="text-xs font-semibold text-slate-700">
            Category
          </span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-2 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2"
          >
            {categories.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </section>
      {rows.length > 0 && (
        <div className="grid gap-3 md:grid-cols-5">
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
      <ul className="space-y-4">
        {visibleRows.map((r) => {
          const displayStatus = effectiveStatus(r);
          const meta = displayMeta(r.serial, r.title);
          return (
            <li key={r.serial}>
              <SessionCard
                title={r.title}
                provider={meta.provider}
                category={meta.category}
                time={`${formatDateTime(r.startTime)} - ${formatDateTime(r.endTime)}`}
                location={meta.location}
                price={`${r.primaryPriceHbar} ℏ`}
                serial={r.serial}
                status={displayStatus}
                statusTone={statusCardTone(displayStatus)}
                rating={meta.rating}
                policyBadges={[
                  "Provider rules",
                  r.listingActive ? "Resale active" : "Resale eligible",
                  "Verified pass",
                ]}
                summary={
                  <>
                    <span className="font-semibold text-slate-900">
                      {statusHint(displayStatus)}.
                    </span>{" "}
                    {nextStepHint(displayStatus)}
                  </>
                }
                primaryAction={
                  displayStatus === "AVAILABLE" ? (
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
                  ) : displayStatus === "FOR_SALE" ? (
                  <Link
                    className={cn(
                      getButtonClassName("primarySuccess"),
                      "no-underline"
                    )}
                    href={`/resale/${r.serial}`}
                  >
                    Buy on resale
                  </Link>
                  ) : (
                    <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-medium text-slate-600">
                      Inspect details
                    </span>
                  )
                }
              />
            </li>
          );
        })}
      </ul>
      {rows.length > 0 && visibleRows.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          No sessions match those filters. Clear the search or pick a different category.
        </div>
      )}
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
        warning="Bookings move a real testnet pass in this demo. Review the session and customer before confirming."
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
