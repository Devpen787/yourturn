"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActorSelector } from "@/components/ActorSelector";

type HolderHint = { serial: number; label: string };

type Props = {
  tokenId: string | null;
  topicId: string | null;
  tokenExists: boolean;
  slotsCount: number;
  holderHints?: HolderHint[];
};

export function IssuerPanel({
  tokenId,
  topicId,
  tokenExists,
  slotsCount,
  holderHints = [],
}: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [freezeSerial, setFreezeSerial] = useState("1");
  const [freezeHolder, setFreezeHolder] = useState<
    "auto" | "guestA" | "guestB"
  >("auto");
  const [burnSerial, setBurnSerial] = useState("1");

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
      let m = `${label} OK`;
      if (
        typeof data.holderActorUsed === "string" &&
        (label === "Freeze" || label === "Unfreeze")
      ) {
        m += ` (holder: ${data.holderActorUsed})`;
      }
      if (Array.isArray(data.serials) && data.serials.length > 0) {
        m += ` (NFT serials ${data.serials.join(", ")})`;
      }
      if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        m += ` — ${data.warnings.join(" ")}`;
      }
      setMsg(m);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
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
        <h2 className="mb-2 font-medium">Freeze / unfreeze holder</h2>
        <p className="mb-2 max-w-xl text-sm text-slate-600">
          <span className="font-medium text-slate-700">Auto</span> uses the
          account Mirror reports for this serial (Guest A or B). That matches
          slots listed for resale—the seller still holds the NFT until someone
          buys. Freeze only applies after a guest holds the NFT (not while it is
          still AVAILABLE in treasury). To pull an unbooked slot from sale, use{" "}
          <span className="font-medium text-slate-800">Burn / withdraw slot</span>{" "}
          below.
        </p>
        {holderHints.length > 0 && (
          <div className="mb-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <p className="mb-1 font-medium text-slate-800">
              On-chain holder (Mirror) for demo serials
            </p>
            <ul className="list-inside list-disc space-y-0.5">
              {holderHints.map((h) => (
                <li key={h.serial}>
                  Serial {h.serial}: {h.label}
                </li>
              ))}
            </ul>
          </div>
        )}
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
                setFreezeHolder(e.target.value as "auto" | "guestA" | "guestB")
              }
            >
              <option value="auto">Auto (Mirror holder)</option>
              <option value="guestA">guestA</option>
              <option value="guestB">guestB</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded bg-amber-700 px-3 py-2 text-sm text-white disabled:opacity-50"
            disabled={!!loading}
            onClick={() =>
              run(
                "Freeze",
                "/api/freeze",
                freezeHolder === "auto"
                  ? { serial: Number(freezeSerial) }
                  : {
                      serial: Number(freezeSerial),
                      holderActor: freezeHolder,
                    }
              )
            }
          >
            Freeze
          </button>
          <button
            type="button"
            className="rounded bg-slate-600 px-3 py-2 text-sm text-white disabled:opacity-50"
            disabled={!!loading}
            onClick={() =>
              run(
                "Unfreeze",
                "/api/unfreeze",
                freezeHolder === "auto"
                  ? { serial: Number(freezeSerial) }
                  : {
                      serial: Number(freezeSerial),
                      holderActor: freezeHolder,
                    }
              )
            }
          >
            Unfreeze
          </button>
        </div>
      </section>
      <section className="mt-8 border-t border-slate-200 pt-6">
        <h2 className="mb-2 font-medium">Withdraw slot / mark used (burn)</h2>
        <p className="mb-2 max-w-xl text-sm text-slate-600">
          Burns the NFT for this serial. Use this to{" "}
          <span className="font-medium text-slate-800">
            stop offering a slot that is still AVAILABLE
          </span>{" "}
          (NFT stays in treasury today—no booking required), or after a guest
          held it to record that the appointment is finished (the app moves the
          NFT back to treasury first, then burns).
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
          disabled={!!loading}
          onClick={() =>
            run("Burn slot", "/api/mark-used", { serial: Number(burnSerial) })
          }
        >
          Burn / withdraw slot
        </button>
      </section>
    </div>
  );
}
