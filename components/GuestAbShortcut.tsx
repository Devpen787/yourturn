"use client";

import { useEffect, useState } from "react";
import {
  ACTOR_CHANGE_EVENT,
  ACTOR_STORAGE_KEY,
  type ActorValue,
  setSelectedActor,
} from "@/components/ActorSelector";

/**
 * Header shortcuts for Hedera demo wallets (Guest A / B). Same storage as ActorSelector.
 */
export function GuestAbShortcut() {
  const [active, setActive] = useState<"guestA" | "guestB" | "other">("other");

  useEffect(() => {
    function read() {
      const raw = localStorage.getItem(ACTOR_STORAGE_KEY) as ActorValue | null;
      if (raw === "guestA" || raw === "guestB") setActive(raw);
      else setActive("other");
    }
    read();
    const handler = (e: Event) => {
      const d = (e as CustomEvent<ActorValue>).detail;
      if (d === "guestA" || d === "guestB") setActive(d);
      else setActive("other");
    };
    window.addEventListener(ACTOR_CHANGE_EVENT, handler);
    return () => window.removeEventListener(ACTOR_CHANGE_EVENT, handler);
  }, []);

  function pick(which: "guestA" | "guestB") {
    setSelectedActor(which);
  }

  const base =
    "rounded-md px-2.5 py-1 text-xs font-medium transition disabled:opacity-50";
  const on = "bg-sky-800 text-white shadow-sm";
  const off = "border border-sky-200 bg-white text-sky-900 hover:bg-sky-50";

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        Hedera wallet
      </span>
      <button
        type="button"
        onClick={() => pick("guestA")}
        className={`${base} ${active === "guestA" ? on : off}`}
        title="Use Guest A keys for book / resale / holdings (same as Actor selector)"
      >
        Guest A
      </button>
      <button
        type="button"
        onClick={() => pick("guestB")}
        className={`${base} ${active === "guestB" ? on : off}`}
        title="Use Guest B keys for book / resale / holdings"
      >
        Guest B
      </button>
      {active === "other" && (
        <span className="text-[11px] text-slate-400">
          (Issuer selected on page — pick A or B here)
        </span>
      )}
    </div>
  );
}
