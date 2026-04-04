"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  tokenId: string | null;
  topicId: string | null;
  tokenExists: boolean;
  slotsCount: number;
  rows: {
    serial: number;
    title: string;
    status: string;
    holderAccountId: string | null;
    holderActor: "guestA" | "guestB" | null;
    listingActive: boolean;
  }[];
};

function statusTone(status: string): string {
  if (status === "AVAILABLE") return "bg-slate-100 text-slate-800";
  if (status === "HELD") return "bg-blue-50 text-blue-900";
  if (status === "FROZEN") return "bg-amber-50 text-amber-900";
  if (status === "USED") return "bg-emerald-50 text-emerald-900";
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

export function IssuerPanel({
  tokenId,
  topicId,
  tokenExists,
  slotsCount,
  rows,
}: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [freezeSerial, setFreezeSerial] = useState("1");
  const [freezeHolder, setFreezeHolder] = useState<"guestA" | "guestB">(
    "guestB"
  );
  const [burnSerial, setBurnSerial] = useState("1");
  const selectedFreezeRow =
    rows.find((row) => row.serial === Number(freezeSerial)) ?? null;
  const selectedBurnRow =
    rows.find((row) => row.serial === Number(burnSerial)) ?? null;
  const canFreezeHolder = selectedFreezeRow?.holderActor != null;

  useEffect(() => {
    if (selectedFreezeRow?.holderActor) {
      setFreezeHolder(selectedFreezeRow.holderActor);
    }
  }, [selectedFreezeRow]);

  async function run(
    label: string,
    url: string,
    body?: object
  ): Promise<void> {
    setLoading(label);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : "{}",
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.error || res.statusText);
        return;
      }
      setMsg(`${label} OK`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  function setSerialAndRecommendedHolder(serial: number): void {
    setFreezeSerial(String(serial));
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
      <div className="mb-4 space-y-1 rounded border border-slate-200 bg-white p-4 text-sm">
        <p>
          <span className="font-medium">Pass token:</span>{" "}
          {tokenId || "—"}{" "}
          {tokenExists ? "(mirror: exists)" : tokenId ? "(mirror: missing)" : ""}
        </p>
        <p>
          <span className="font-medium">Audit topic:</span> {topicId || "—"}
        </p>
        <p>
          <span className="font-medium">Sessions created:</span> {slotsCount}
        </p>
      </div>
      <div className="mb-4 rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-medium text-slate-900">How this dashboard works</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Pause or reopen only works when the selected person matches the current holder.</li>
          <li>Check in / mark used is the live redemption step. If a customer still holds the pass, it is returned first and then closed.</li>
          <li>Use the session table below to confirm the current holder and status before taking action.</li>
        </ul>
      </div>
      {msg && (
        <p className="mb-2 rounded bg-emerald-50 p-2 text-sm text-emerald-900">
          {msg}
        </p>
      )}
      {err && (
        <p className="mb-2 rounded bg-red-50 p-2 text-sm text-red-800">{err}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          disabled={!!loading}
          onClick={() => run("Set up business", "/api/init")}
        >
          {loading === "Set up business" ? "…" : "Set up business"}
        </button>
        <button
          type="button"
          className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          disabled={!!loading}
          onClick={() =>
            run("Create demo sessions", "/api/mint-slots", { reseed: false })
          }
        >
          {loading === "Create demo sessions" ? "…" : "Create demo sessions"}
        </button>
        <button
          type="button"
          className="rounded border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50"
          disabled={!!loading}
          onClick={() => run("Start over", "/api/reset-demo")}
        >
          {loading === "Start over" ? "…" : "Start over"}
        </button>
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
                <th className="px-3 py-2 font-medium">Choose</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.serial} className="border-t border-slate-100 align-top">
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
                    <button
                      type="button"
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                      onClick={() => setSerialAndRecommendedHolder(row.serial)}
                    >
                      Use this pass
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={6}>
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
              className="ml-1 w-16 rounded border border-slate-300 px-1"
              value={freezeSerial}
              onChange={(e) => setFreezeSerial(e.target.value)}
            />
          </label>
          <label className="ml-2">
            Person
            <select
              className="ml-1 rounded border border-slate-300"
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded bg-amber-700 px-3 py-2 text-sm text-white disabled:opacity-50"
            disabled={!!loading || !canFreezeHolder}
            onClick={() =>
              run("Pause pass", "/api/freeze", {
                serial: Number(freezeSerial),
                holderActor: freezeHolder,
              })
            }
          >
            {loading === "Pause pass" ? "…" : "Pause pass"}
          </button>
          <button
            type="button"
            className="rounded bg-slate-600 px-3 py-2 text-sm text-white disabled:opacity-50"
            disabled={!!loading || !canFreezeHolder}
            onClick={() =>
              run("Reopen pass", "/api/unfreeze", {
                serial: Number(freezeSerial),
                holderActor: freezeHolder,
              })
            }
          >
            {loading === "Reopen pass" ? "…" : "Reopen pass"}
          </button>
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
              className="ml-1 w-16 rounded border border-slate-300 px-1"
              value={burnSerial}
              onChange={(e) => setBurnSerial(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          className="rounded bg-red-700 px-3 py-2 text-sm text-white disabled:opacity-50"
          disabled={!!loading || !selectedBurnRow}
          onClick={() =>
            run("Check in", "/api/mark-used", { serial: Number(burnSerial) })
          }
        >
          {loading === "Check in" ? "…" : "Check in / mark used"}
        </button>
      </section>
    </div>
  );
}
