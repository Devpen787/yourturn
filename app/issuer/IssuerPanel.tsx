"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActorSelector } from "@/components/ActorSelector";

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
  holderActor: "guestA" | "guestB" | null,
  holderAccountId: string | null
): string {
  if (holderActor) return holderActor;
  if (!holderAccountId) return "treasury / none";
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
      <h1 className="mb-2 text-xl font-semibold">Issuer</h1>
      <ActorSelector pageDefault="issuer" />
      <div className="mb-4 space-y-1 rounded border border-slate-200 bg-white p-4 text-sm">
        <p>
          <span className="font-medium">Token ID:</span>{" "}
          {tokenId || "—"}{" "}
          {tokenExists ? "(mirror: exists)" : tokenId ? "(mirror: missing)" : ""}
        </p>
        <p>
          <span className="font-medium">Topic ID:</span> {topicId || "—"}
        </p>
        <p>
          <span className="font-medium">Seeded slots:</span> {slotsCount}
        </p>
      </div>
      <div className="mb-4 rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-medium text-slate-900">Issuer action rules</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Freeze or unfreeze only works when the selected holder matches the current Mirror holder.</li>
          <li>Mark used will return a guest-held NFT to treasury first, then burn it.</li>
          <li>Use the slot table below to confirm holder and status before taking action.</li>
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
          onClick={() => run("Initialize", "/api/init")}
        >
          {loading === "Initialize" ? "…" : "Initialize"}
        </button>
        <button
          type="button"
          className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          disabled={!!loading}
          onClick={() =>
            run("Mint Demo Slots", "/api/mint-slots", { reseed: false })
          }
        >
          {loading === "Mint Demo Slots" ? "…" : "Mint Demo Slots"}
        </button>
        <button
          type="button"
          className="rounded border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50"
          disabled={!!loading}
          onClick={() => run("Reset Demo", "/api/reset-demo")}
        >
          {loading === "Reset Demo" ? "…" : "Reset Demo"}
        </button>
      </div>
      <section className="mt-8 border-t border-slate-200 pt-6">
        <h2 className="mb-2 font-medium">Current slots</h2>
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-medium">Serial</th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Holder</th>
                <th className="px-3 py-2 font-medium">Listing</th>
                <th className="px-3 py-2 font-medium">Use for actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.serial} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2 font-medium">#{row.serial}</td>
                  <td className="px-3 py-2">{row.title}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${statusTone(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{holderLabel(row.holderActor, row.holderAccountId)}</td>
                  <td className="px-3 py-2">{row.listingActive ? "Active resale" : "None"}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                      onClick={() => setSerialAndRecommendedHolder(row.serial)}
                    >
                      Select serial
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={6}>
                    No seeded slots yet. Initialize and mint demo slots first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="mt-8 border-t border-slate-200 pt-6">
        <h2 className="mb-2 font-medium">Freeze / unfreeze holder</h2>
        <p className="mb-2 text-sm text-slate-600">
          Selected serial: <strong>{freezeSerial}</strong>
          {selectedFreezeRow ? (
            <>
              {" "}· current status: <strong>{selectedFreezeRow.status}</strong>
              {" "}· current holder: <strong>{holderLabel(selectedFreezeRow.holderActor, selectedFreezeRow.holderAccountId)}</strong>
            </>
          ) : (
            <> · serial not found in the current slot list</>
          )}
        </p>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
          <label>
            Serial{" "}
            <input
              className="ml-1 w-16 rounded border border-slate-300 px-1"
              value={freezeSerial}
              onChange={(e) => setFreezeSerial(e.target.value)}
            />
          </label>
          <label className="ml-2">
            Holder
            <select
              className="ml-1 rounded border border-slate-300"
              value={freezeHolder}
              onChange={(e) =>
                setFreezeHolder(e.target.value as "guestA" | "guestB")
              }
            >
              <option value="guestA">guestA</option>
              <option value="guestB">guestB</option>
            </select>
          </label>
        </div>
        {!canFreezeHolder && selectedFreezeRow && (
          <p className="mb-2 rounded bg-amber-50 p-2 text-sm text-amber-900">
            This serial does not currently map to a guest holder. Freeze or unfreeze only applies when a guest is the current Mirror holder.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded bg-amber-700 px-3 py-2 text-sm text-white disabled:opacity-50"
            disabled={!!loading || !canFreezeHolder}
            onClick={() =>
              run("Freeze", "/api/freeze", {
                serial: Number(freezeSerial),
                holderActor: freezeHolder,
              })
            }
          >
            Freeze
          </button>
          <button
            type="button"
            className="rounded bg-slate-600 px-3 py-2 text-sm text-white disabled:opacity-50"
            disabled={!!loading || !canFreezeHolder}
            onClick={() =>
              run("Unfreeze", "/api/unfreeze", {
                serial: Number(freezeSerial),
                holderActor: freezeHolder,
              })
            }
          >
            Unfreeze
          </button>
        </div>
      </section>
      <section className="mt-8 border-t border-slate-200 pt-6">
        <h2 className="mb-2 font-medium">Mark slot used (burn)</h2>
        <p className="mb-2 text-sm text-slate-600">
          Selected serial: <strong>{burnSerial}</strong>
          {selectedBurnRow ? (
            <>
              {" "}· current status: <strong>{selectedBurnRow.status}</strong>
              {" "}· current holder: <strong>{holderLabel(selectedBurnRow.holderActor, selectedBurnRow.holderAccountId)}</strong>
            </>
          ) : (
            <> · serial not found in the current slot list</>
          )}
        </p>
        <p className="mb-2 text-sm text-slate-600">
          If a guest currently holds the booking right, the app will first return it to treasury and then burn it.
        </p>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
          <label>
            Serial{" "}
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
            run("Mark used", "/api/mark-used", { serial: Number(burnSerial) })
          }
        >
          Mark used
        </button>
      </section>
    </div>
  );
}
