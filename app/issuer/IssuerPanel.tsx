"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LiveFeedback } from "@/components/ui/LiveFeedback";
import { getButtonClassName } from "@/components/ui/button-classes";
import type { DemoSlotSeed } from "@/lib/types/demo-slot";

type Props = {
  tokenId: string | null;
  topicId: string | null;
  tokenExists: boolean;
  slotsCount: number;
  demoPlan: DemoSlotSeed[];
  rows: {
    serial: number;
    title: string;
    status: string;
    holderAccountId: string | null;
    holderActor: "guestA" | "guestB" | null;
    listingActive: boolean;
    automationProof: {
      status: "scheduled" | "executed" | "deleted" | "unknown";
      scheduleId: string;
      amountHbar: number;
      scheduleHashscanUrl: string;
      executionHashscanUrl?: string;
    } | null;
    recoveryProof: {
      title: string;
      statusLabel: string;
      actionLabel: string;
      refundHbar?: number;
      hashscanUrl?: string;
      releaseHashscanUrl?: string;
      burnHashscanUrl?: string;
    } | null;
  }[];
};

type DemoPlanDraft = {
  slotId: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  primaryPriceHbar: string;
  resaleAllowed: boolean;
  ownerRoyaltyPercent: string;
  releaseAllowed: boolean;
  waitlistEnabled: boolean;
  scheduleAutomationEnabled: boolean;
  policyVersion: string;
  policyLabel: string;
};

type ConfirmAction = "reset" | "pause" | "markUsed" | null;

function statusTone(status: string): string {
  if (status === "AVAILABLE") return "bg-slate-100 text-slate-800";
  if (status === "HELD") return "bg-blue-50 text-blue-900";
  if (status === "FROZEN") return "bg-amber-50 text-amber-900";
  if (status === "USED") return "bg-emerald-50 text-emerald-900";
  return "bg-slate-100 text-slate-800";
}

function automationTone(status: string): string {
  if (status === "executed") return "bg-emerald-50 text-emerald-900";
  if (status === "scheduled") return "bg-blue-50 text-blue-900";
  if (status === "deleted") return "bg-rose-50 text-rose-900";
  return "bg-slate-100 text-slate-800";
}

function recoveryTone(status: string): string {
  if (status.toLowerCase().includes("refund")) {
    return "bg-emerald-50 text-emerald-900";
  }
  if (status.toLowerCase().includes("listed")) {
    return "bg-blue-50 text-blue-900";
  }
  if (status.toLowerCase().includes("transfer")) {
    return "bg-purple-50 text-purple-900";
  }
  return "bg-slate-100 text-slate-800";
}

function holderLabel(
  status: string,
  holderActor: "guestA" | "guestB" | null,
  holderAccountId: string | null
): string {
  if (holderActor === "guestA") return "Person A";
  if (holderActor === "guestB") return "Person B";
  if (status === "USED") return "Checked in / closed";
  if (!holderAccountId) return "Still available";
  return holderAccountId;
}

function formatDateTimeLocalInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseLocalInputToIso(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatScheduleWindow(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Choose a valid date and time";
  }
  const day = new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(start);
  const startLabel = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(end);
  return `${day} · ${startLabel}–${endLabel}`;
}

function formatDraftRows(plan: DemoSlotSeed[]): DemoPlanDraft[] {
  return plan.map((slot) => ({
    slotId: slot.slotId,
    title: slot.title,
    startTime: formatDateTimeLocalInput(slot.startTime),
    endTime: formatDateTimeLocalInput(slot.endTime),
    location: slot.location,
    primaryPriceHbar: String(slot.primaryPriceHbar),
    resaleAllowed: slot.policy?.resaleAllowed ?? slot.resaleAllowed,
    ownerRoyaltyPercent: String(slot.policy?.ownerRoyaltyPercent ?? 10),
    releaseAllowed: slot.policy?.releaseAllowed ?? true,
    waitlistEnabled: slot.policy?.waitlistEnabled ?? true,
    scheduleAutomationEnabled: slot.policy?.scheduleAutomationEnabled ?? true,
    policyVersion: String(slot.policy?.version ?? 1),
    policyLabel: slot.policy?.label ?? "Provider recovery policy v1",
  }));
}

export function IssuerPanel({
  tokenId,
  topicId,
  tokenExists,
  slotsCount,
  demoPlan,
  rows,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [success, setSuccess] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [issuerName, setIssuerName] = useState(
    demoPlan[0]?.issuerName ?? "Demo Issuer"
  );
  const [planRows, setPlanRows] = useState<DemoPlanDraft[]>(
    formatDraftRows(demoPlan)
  );
  const defaultSerial = rows[0] ? String(rows[0].serial) : "1";
  const [freezeSerial, setFreezeSerial] = useState(defaultSerial);
  const [freezeHolder, setFreezeHolder] = useState<"guestA" | "guestB">(
    rows[0]?.holderActor ?? "guestB"
  );
  const [burnSerial, setBurnSerial] = useState(defaultSerial);
  const selectedFreezeRow =
    rows.find((row) => row.serial === Number(freezeSerial)) ?? null;
  const selectedBurnRow =
    rows.find((row) => row.serial === Number(burnSerial)) ?? null;
  const canFreezeHolder = selectedFreezeRow?.holderActor != null;
  const freezePersonMatchesHolder =
    !selectedFreezeRow?.holderActor ||
    freezeHolder === selectedFreezeRow.holderActor;
  const inventoryCounts = rows.reduce(
    (acc, row) => {
      acc.total += 1;
      if (row.status === "AVAILABLE") acc.available += 1;
      if (row.status === "HELD") acc.held += 1;
      if (row.status === "FROZEN") acc.frozen += 1;
      if (row.status === "USED") acc.used += 1;
      return acc;
    },
    { total: 0, available: 0, held: 0, frozen: 0, used: 0 }
  );

  const holderActorForFreezeSerial =
    rows.find((r) => r.serial === Number(freezeSerial))?.holderActor ?? null;

  useEffect(() => {
    if (holderActorForFreezeSerial) {
      setFreezeHolder(holderActorForFreezeSerial);
    }
  }, [freezeSerial, holderActorForFreezeSerial]);

  useEffect(() => {
    setIssuerName(demoPlan[0]?.issuerName ?? "Demo Issuer");
    setPlanRows(formatDraftRows(demoPlan));
  }, [demoPlan]);

  async function run(
    label: string,
    url: string,
    body?: object
  ): Promise<boolean> {
    setLoading(label);
    setSuccess(null);
    setErr(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : "{}",
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.error || res.statusText);
        return false;
      }
      if (label === "Set up business") {
        setSuccess(
          "Business setup is ready. You can now create live demo sessions from the saved session plan."
        );
      } else if (label === "Create demo sessions") {
        setSuccess(
          "Live demo sessions created from the saved plan. Customers can now browse and book them."
        );
      } else if (label === "Start over") {
        setSuccess(
          "Fresh live demo sessions were created from the saved plan. Listings were cleared and the previous demo passes were retired from the active inventory."
        );
      } else if (label === "Pause pass") {
        setSuccess(
          `Ref #${freezeSerial} is now paused. It cannot move until you reopen it.`
        );
      } else if (label === "Reopen pass") {
        setSuccess(
          `Ref #${freezeSerial} is live again and can move under the saved provider rules.`
        );
      } else if (label === "Check in") {
        setSuccess(
          `Ref #${burnSerial} was checked in and closed. It can no longer be used again.`
        );
      } else {
        setSuccess(`${label} completed.`);
      }
      toast({ variant: "success", message: `${label} OK` });
      router.refresh();
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setLoading(null);
    }
  }

  function updatePlanRow(
    index: number,
    patch: Partial<DemoPlanDraft>
  ): void {
    setPlanRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      )
    );
  }

  async function savePlan() {
    const trimmedIssuerName = issuerName.trim();
    if (!trimmedIssuerName) {
      setErr("Enter a business name before saving the session plan.");
      return;
    }
    if (planRows.length !== 3) {
      setErr("The demo currently expects exactly three planned sessions.");
      return;
    }

    const normalizedSlots = [];
    for (const row of planRows) {
      const title = row.title.trim();
      const location = row.location.trim();
      const startTime = parseLocalInputToIso(row.startTime);
      const endTime = parseLocalInputToIso(row.endTime);
      const price = Number(row.primaryPriceHbar);
      const ownerRoyaltyPercent = Number(row.ownerRoyaltyPercent);
      const policyVersion = Number(row.policyVersion);
      if (!title || !location || !startTime || !endTime) {
        setErr("Complete every title, date, time, and location before saving.");
        return;
      }
      if (!Number.isFinite(price) || price <= 0) {
        setErr("Each planned session needs a positive price.");
        return;
      }
      if (
        !Number.isFinite(ownerRoyaltyPercent) ||
        ownerRoyaltyPercent < 0 ||
        ownerRoyaltyPercent > 50
      ) {
        setErr("Owner royalty must be between 0 and 50 percent.");
        return;
      }
      if (!Number.isFinite(policyVersion) || policyVersion < 1) {
        setErr("Policy version must be a positive number.");
        return;
      }
      if (new Date(endTime).getTime() <= new Date(startTime).getTime()) {
        setErr("Each session must end after it starts.");
        return;
      }
      normalizedSlots.push({
        slotId: row.slotId,
        title,
        startTime,
        endTime,
        location,
        issuerName: trimmedIssuerName,
        primaryPriceHbar: price,
        resaleAllowed: row.resaleAllowed,
        policy: {
          resaleAllowed: row.resaleAllowed,
          ownerRoyaltyPercent,
          releaseAllowed: row.releaseAllowed,
          waitlistEnabled: row.waitlistEnabled,
          scheduleAutomationEnabled: row.scheduleAutomationEnabled,
          version: Math.trunc(policyVersion),
          label: row.policyLabel.trim() || "Provider recovery policy v1",
        },
      });
    }

    setLoading("Save session plan");
    setSuccess(null);
    setErr(null);
    try {
      const res = await fetch("/api/session-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issuerName: trimmedIssuerName,
          slots: normalizedSlots,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.error || res.statusText);
        return;
      }
      toast({
        variant: "success",
        message:
          "Session plan saved. Create demo sessions or start over to apply it to the live demo.",
      });
      setSuccess(
        "Session plan saved. Create demo sessions or start over to apply these changes to the live demo inventory."
      );
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  function setSerialAndRecommendedHolder(serial: number): void {
    const s = String(serial);
    setFreezeSerial(s);
    setBurnSerial(s);
    const row = rows.find((item) => item.serial === serial);
    if (row?.holderActor) setFreezeHolder(row.holderActor);
  }

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold">Provider dashboard</h1>
      <div className="mb-4 rounded border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium text-slate-900">Business view</p>
            <p className="mt-1 max-w-2xl text-slate-600">
              This is the back-office side of the demo. Use it to create sessions,
              confirm who currently holds each pass, pause movement when needed,
              and check people in when the session happens.
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
            Current: Provider
          </span>
        </div>
      </div>
      <p className="mb-4 text-sm text-slate-600">
        Use this space to set up sessions, keep track of who holds each pass,
        pause movement when needed, and check people in.
      </p>
      <section className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
        <div className="rounded border border-slate-200 bg-white p-4 text-sm">
          <h2 className="font-medium text-slate-900">Upcoming sessions</h2>
          <p className="mt-1 max-w-2xl text-slate-600">
            This is the customer-facing schedule the demo will mint from. Save the
            session plan before creating or restarting the live demo passes.
          </p>
          <div className="mt-4 grid gap-3">
            {planRows.map((row, index) => {
              const startIso = parseLocalInputToIso(row.startTime);
              const endIso = parseLocalInputToIso(row.endTime);
              return (
                <div
                  key={`preview-${row.slotId}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">
                        {row.title.trim() || `Session ${index + 1}`}
                      </p>
                      <p className="mt-1 text-slate-600">
                        {startIso && endIso
                          ? formatScheduleWindow(startIso, endIso)
                          : "Choose a valid date and time"}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                      {row.primaryPriceHbar || "—"}ℏ
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span>{row.location.trim() || "Add a location"}</span>
                    <span aria-hidden>·</span>
                    <span>
                      {row.resaleAllowed
                        ? "Resale allowed"
                        : "No resale on this pass"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded border border-slate-200 bg-white p-4 text-sm">
          <h2 className="font-medium text-slate-900">Live inventory snapshot</h2>
          <p className="mt-1 text-slate-600">
            Quick read on what customers can still book, what is already held,
            and what is finished.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total live
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {inventoryCounts.total}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Bookable now
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {inventoryCounts.available}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Held
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {inventoryCounts.held}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Paused
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {inventoryCounts.frozen}
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Checked in / finished
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {inventoryCounts.used}
            </p>
          </div>
        </div>
      </section>
      <section className="mb-6 rounded border border-slate-200 bg-white p-4 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-medium text-slate-900">
              Business setup and session plan
            </h2>
            <p className="mt-1 max-w-2xl text-slate-600">
              Shape the three demo sessions here: service name, time, location,
              price, and whether the pass can be resold. These settings are what
              <strong> Create demo sessions </strong>
              mints, and what
              <strong> Start over </strong>
              creates a fresh set of live demo serials from the saved plan.
              Booked passes keep the policy snapshot active at booking time.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label className="grid gap-1">
            <span className="font-medium text-slate-800">Business name</span>
            <input
              className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              value={issuerName}
              onChange={(e) => setIssuerName(e.target.value)}
              placeholder="Demo Issuer"
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            loading={loading === "Save session plan"}
            loadingLabel="Saving…"
            disabled={!!loading}
            className="w-fit"
            onClick={savePlan}
          >
            Save session plan
          </Button>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {planRows.map((row, index) => (
            <div
              key={row.slotId}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-medium text-slate-900">
                  Session {index + 1}
                </p>
                <span className="text-xs text-slate-500">{row.slotId}</span>
              </div>
              <div className="grid gap-3">
                <label className="grid gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Service
                  </span>
                  <input
                    className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                    value={row.title}
                    onChange={(e) =>
                      updatePlanRow(index, { title: e.target.value })
                    }
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Starts
                  </span>
                  <input
                    type="datetime-local"
                    className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                    value={row.startTime}
                    onChange={(e) =>
                      updatePlanRow(index, { startTime: e.target.value })
                    }
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Ends
                  </span>
                  <input
                    type="datetime-local"
                    className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                    value={row.endTime}
                    onChange={(e) =>
                      updatePlanRow(index, { endTime: e.target.value })
                    }
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Location
                  </span>
                  <input
                    className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                    value={row.location}
                    onChange={(e) =>
                      updatePlanRow(index, { location: e.target.value })
                    }
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Price (ℏ)
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                    value={row.primaryPriceHbar}
                    onChange={(e) =>
                      updatePlanRow(index, {
                        primaryPriceHbar: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <span>
                    <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Resale
                    </span>
                    <span className="block text-sm text-slate-700">
                      Allow this pass to move under provider rules
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={row.resaleAllowed}
                    onChange={(e) =>
                      updatePlanRow(index, {
                        resaleAllowed: e.target.checked,
                      })
                    }
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Owner royalty (%)
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="1"
                    className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                    value={row.ownerRoyaltyPercent}
                    onChange={(e) =>
                      updatePlanRow(index, {
                        ownerRoyaltyPercent: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Policy label
                  </span>
                  <input
                    className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                    value={row.policyLabel}
                    onChange={(e) =>
                      updatePlanRow(index, { policyLabel: e.target.value })
                    }
                  />
                </label>
                <div className="grid gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Recovery rules
                  </p>
                  <label className="flex min-h-[36px] items-center justify-between gap-3 text-sm text-slate-700">
                    <span>Allow release back to provider</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={row.releaseAllowed}
                      onChange={(e) =>
                        updatePlanRow(index, {
                          releaseAllowed: e.target.checked,
                        })
                      }
                    />
                  </label>
                  <label className="flex min-h-[36px] items-center justify-between gap-3 text-sm text-slate-700">
                    <span>Enable waitlist offers</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={row.waitlistEnabled}
                      onChange={(e) =>
                        updatePlanRow(index, {
                          waitlistEnabled: e.target.checked,
                        })
                      }
                    />
                  </label>
                  <label className="flex min-h-[36px] items-center justify-between gap-3 text-sm text-slate-700">
                    <span>Allow scheduled automation</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={row.scheduleAutomationEnabled}
                      onChange={(e) =>
                        updatePlanRow(index, {
                          scheduleAutomationEnabled: e.target.checked,
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="mb-4 rounded border border-slate-200 bg-white p-4 text-sm">
        <p>
          <span className="font-medium">Sessions created:</span> {slotsCount}
        </p>
        <details className="mt-3 group">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md py-1 text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
            <span
              className="inline-block text-slate-500 transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none"
              aria-hidden
            >
              ▸
            </span>
            System details
          </summary>
          <div className="mt-3 space-y-1 text-slate-600">
            <p>
              <span className="font-medium text-slate-900">Pass token:</span>{" "}
              {tokenId || "—"}{" "}
              {tokenExists ? "(mirror: exists)" : tokenId ? "(mirror: missing)" : ""}
            </p>
            <p>
              <span className="font-medium text-slate-900">Audit topic:</span> {topicId || "—"}
            </p>
          </div>
        </details>
      </div>
      <div className="mb-4 rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-medium text-slate-900">How this dashboard works</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Pause or reopen only works when the selected person matches the current holder.</li>
          <li>Check in / mark used is the live redemption step. If a customer still holds the pass, it is returned first and then closed.</li>
          <li>Use the session table below to confirm the current holder and status before taking action.</li>
        </ul>
      </div>
      <LiveFeedback className="mb-2 space-y-2" success={success} error={err} />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="primary"
          loading={loading === "Set up business"}
          loadingLabel="Setting up…"
          disabled={!!loading}
          onClick={() => run("Set up business", "/api/init")}
        >
          Set up business
        </Button>
        <Button
          type="button"
          variant="primary"
          loading={loading === "Create demo sessions"}
          loadingLabel="Creating…"
          disabled={!!loading}
          onClick={() =>
            run("Create demo sessions", "/api/mint-slots", { reseed: false })
          }
        >
          Create demo sessions
        </Button>
        <Button
          type="button"
          variant="secondary"
          loading={loading === "Start over"}
          loadingLabel="Resetting…"
          disabled={!!loading}
          onClick={() => setConfirmAction("reset")}
        >
          Start over
        </Button>
      </div>
      <section className="mt-8 border-t border-slate-200 pt-6">
        <h2 className="mb-2 font-medium">Live sessions</h2>
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-medium">Ref</th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Current holder</th>
                <th className="px-3 py-2 font-medium">Resale</th>
                <th className="px-3 py-2 font-medium">Proof</th>
                <th className="px-3 py-2 font-medium">Choose</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.serial}
                  className="border-t border-slate-100 align-top transition-colors hover:bg-slate-50/80"
                >
                  <td className="px-3 py-2 font-medium">Ref #{row.serial}</td>
                  <td className="px-3 py-2">{row.title}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${statusTone(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {holderLabel(row.status, row.holderActor, row.holderAccountId)}
                  </td>
                  <td className="px-3 py-2">{row.listingActive ? "Active resale" : "None"}</td>
                  <td className="px-3 py-2">
                    <div className="space-y-3">
                      {row.automationProof ? (
                        <div className="space-y-1">
                          <span
                            className={`inline-flex rounded px-2 py-1 text-xs font-medium ${automationTone(
                              row.automationProof.status
                            )}`}
                          >
                            {row.automationProof.status}
                          </span>
                          <div className="text-xs text-slate-600">
                            <a
                              className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900"
                              href={row.automationProof.scheduleHashscanUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {row.automationProof.scheduleId}
                            </a>
                            {" · "}
                            {row.automationProof.amountHbar.toFixed(2)} h
                          </div>
                          {row.automationProof.executionHashscanUrl && (
                            <a
                              className="block text-xs font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900"
                              href={row.automationProof.executionHashscanUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Execution tx
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="block text-xs text-slate-500">
                          No schedule proof
                        </span>
                      )}
                      {row.recoveryProof ? (
                        <div className="space-y-1 border-t border-slate-100 pt-2">
                          <span
                            className={`inline-flex rounded px-2 py-1 text-xs font-medium ${recoveryTone(
                              row.recoveryProof.statusLabel
                            )}`}
                          >
                            {row.recoveryProof.statusLabel}
                          </span>
                          <p className="text-xs font-medium text-slate-800">
                            {row.recoveryProof.actionLabel}
                          </p>
                          {typeof row.recoveryProof.refundHbar === "number" && (
                            <p className="text-xs text-slate-600">
                              {row.recoveryProof.refundHbar.toFixed(2)} h refunded
                            </p>
                          )}
                          {(row.recoveryProof.releaseHashscanUrl ||
                            row.recoveryProof.hashscanUrl) && (
                            <a
                              className="block text-xs font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900"
                              href={
                                row.recoveryProof.releaseHashscanUrl ??
                                row.recoveryProof.hashscanUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                            >
                              Recovery tx
                            </a>
                          )}
                          {row.recoveryProof.burnHashscanUrl && (
                            <a
                              className="block text-xs font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900"
                              href={row.recoveryProof.burnHashscanUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Close tx
                            </a>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className={getButtonClassName("table")}
                      onClick={() => setSerialAndRecommendedHolder(row.serial)}
                    >
                      Use this pass
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={7}>
                    No sessions are live yet. Set up the business and create demo sessions first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="mt-8 border-t border-slate-200 pt-6">
        <h2 className="mb-2 font-medium">Pause or reopen a pass</h2>
        <p className="mb-2 text-sm text-slate-600">
          Selected pass: <strong>{freezeSerial}</strong>
          {selectedFreezeRow ? (
            <>
              {" "}· current status: <strong>{selectedFreezeRow.status}</strong>
              {" "}· current holder: <strong>{holderLabel(selectedFreezeRow.status, selectedFreezeRow.holderActor, selectedFreezeRow.holderAccountId)}</strong>
            </>
          ) : (
            <> · this pass is not in the current session list</>
          )}
        </p>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
          <label>
            Ref #{" "}
            <input
              className="ml-1 w-16 rounded border border-slate-300 px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
              value={freezeSerial}
              onChange={(e) => setFreezeSerial(e.target.value)}
            />
          </label>
          <label className="ml-2">
            Person
            <select
              className="ml-1 min-h-[40px] rounded border border-slate-300 px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
              value={freezeHolder}
              onChange={(e) =>
                setFreezeHolder(e.target.value as "guestA" | "guestB")
              }
            >
              <option value="guestA">Person A</option>
              <option value="guestB">Person B</option>
            </select>
          </label>
        </div>
        {selectedFreezeRow?.holderActor && (
          <p className="mb-2 text-sm text-slate-600">
            Suggested from the live holder on record:{" "}
            <strong>{holderLabel(selectedFreezeRow.status, selectedFreezeRow.holderActor, selectedFreezeRow.holderAccountId)}</strong>
          </p>
        )}
        {!canFreezeHolder && selectedFreezeRow && (
          <p className="mb-2 rounded bg-amber-50 p-2 text-sm text-amber-900">
            This pass is not currently held by a customer. Pause or reopen only applies when a customer is the live holder.
          </p>
        )}
        {canFreezeHolder && !freezePersonMatchesHolder && (
          <p className="mb-2 rounded bg-amber-50 p-2 text-sm text-amber-900">
            The <strong>Person</strong> dropdown must match the current holder (
            <strong>
              {holderLabel(
                selectedFreezeRow!.status,
                selectedFreezeRow!.holderActor,
                selectedFreezeRow!.holderAccountId
              )}
            </strong>
            ) before pause or reopen will succeed.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="amber"
            loading={loading === "Pause pass"}
            loadingLabel="Pausing…"
            disabled={
              !!loading || !canFreezeHolder || !freezePersonMatchesHolder
            }
            onClick={() => setConfirmAction("pause")}
          >
            Pause pass
          </Button>
          <Button
            type="button"
            variant="muted"
            loading={loading === "Reopen pass"}
            loadingLabel="Reopening…"
            disabled={
              !!loading || !canFreezeHolder || !freezePersonMatchesHolder
            }
            onClick={() =>
              run("Reopen pass", "/api/unfreeze", {
                serial: Number(freezeSerial),
                holderActor: freezeHolder,
              })
            }
          >
            Reopen pass
          </Button>
        </div>
      </section>
      <section className="mt-8 border-t border-slate-200 pt-6">
        <h2 className="mb-2 font-medium">Check in and close the pass</h2>
        <p className="mb-2 text-sm text-slate-600">
          Selected pass: <strong>{burnSerial}</strong>
          {selectedBurnRow ? (
            <>
              {" "}· current status: <strong>{selectedBurnRow.status}</strong>
              {" "}· current holder: <strong>{holderLabel(selectedBurnRow.status, selectedBurnRow.holderActor, selectedBurnRow.holderAccountId)}</strong>
            </>
          ) : (
            <> · this pass is not in the current session list</>
          )}
        </p>
        <p className="mb-2 text-sm text-slate-600">
          Use this when the session actually happens. If a customer still holds
          the pass, the app will first return it and then close it so it cannot be used again.
        </p>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
          <label>
            Ref #{" "}
            <input
              className="ml-1 w-16 rounded border border-slate-300 px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
              value={burnSerial}
              onChange={(e) => setBurnSerial(e.target.value)}
            />
          </label>
        </div>
        <Button
          type="button"
          variant="danger"
          loading={loading === "Check in"}
          loadingLabel="Checking in…"
          disabled={!!loading || !selectedBurnRow}
          onClick={() => setConfirmAction("markUsed")}
        >
          Check in / mark used
        </Button>
      </section>
      <ConfirmDialog
        open={confirmAction === "reset"}
        title="Start over?"
        description="This refreshes the live demo sessions from the saved session plan and clears any active listings."
        details={[
          { label: "Business", value: issuerName || "Demo Issuer" },
          { label: "Live sessions", value: inventoryCounts.total },
          { label: "What resets", value: "Listings and current demo schedule" },
        ]}
        warning="This affects the shared demo state right away. Type START OVER to continue."
        requireText="START OVER"
        requireTextLabel="Type START OVER to confirm"
        confirmLabel="Start over"
        loading={loading === "Start over"}
        loadingLabel="Resetting…"
        onClose={() => {
          if (loading == null) setConfirmAction(null);
        }}
        onConfirm={() => {
          void run("Start over", "/api/reset-demo").then((ok) => {
            if (ok) setConfirmAction(null);
          });
        }}
      />
      <ConfirmDialog
        open={confirmAction === "pause"}
        title="Pause this pass?"
        description="Pausing prevents this pass from moving until you reopen it."
        details={[
          { label: "Reference", value: `#${freezeSerial}` },
          {
            label: "Current holder",
            value: selectedFreezeRow
              ? holderLabel(
                  selectedFreezeRow.status,
                  selectedFreezeRow.holderActor,
                  selectedFreezeRow.holderAccountId
                )
              : "Unknown",
          },
          {
            label: "Current status",
            value: selectedFreezeRow?.status ?? "Unknown",
          },
        ]}
        warning="Use pause only when you need to stop a transfer or check-in temporarily."
        confirmLabel="Pause pass"
        loading={loading === "Pause pass"}
        loadingLabel="Pausing…"
        onClose={() => {
          if (loading == null) setConfirmAction(null);
        }}
        onConfirm={() => {
          void run("Pause pass", "/api/freeze", {
            serial: Number(freezeSerial),
            holderActor: freezeHolder,
          }).then((ok) => {
            if (ok) setConfirmAction(null);
          });
        }}
      />
      <ConfirmDialog
        open={confirmAction === "markUsed"}
        title="Check in and close this pass?"
        description="This is the final redemption step. The pass will be checked in and cannot be used again."
        details={[
          { label: "Reference", value: `#${burnSerial}` },
          {
            label: "Current holder",
            value: selectedBurnRow
              ? holderLabel(
                  selectedBurnRow.status,
                  selectedBurnRow.holderActor,
                  selectedBurnRow.holderAccountId
                )
              : "Unknown",
          },
          {
            label: "Current status",
            value: selectedBurnRow?.status ?? "Unknown",
          },
        ]}
        warning="Type the pass reference number to confirm this irreversible check-in."
        requireText={burnSerial}
        requireTextLabel={`Type ${burnSerial} to confirm`}
        confirmLabel="Check in / mark used"
        loading={loading === "Check in"}
        loadingLabel="Checking in…"
        onClose={() => {
          if (loading == null) setConfirmAction(null);
        }}
        onConfirm={() => {
          void run("Check in", "/api/mark-used", {
            serial: Number(burnSerial),
          }).then((ok) => {
            if (ok) setConfirmAction(null);
          });
        }}
      />
    </div>
  );
}
