"use client";

import { useEffect, useState } from "react";

export const ACTOR_STORAGE_KEY = "bookedrights:selectedActor";

export const ACTOR_CHANGE_EVENT = "bookedrights:actorChange";

export type ActorValue = "issuer" | "guestA" | "guestB";

/** Persists Hedera demo actor and notifies all ActorSelector instances on the page. */
export function setSelectedActor(actor: ActorValue): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTOR_STORAGE_KEY, actor);
  window.dispatchEvent(
    new CustomEvent<ActorValue>(ACTOR_CHANGE_EVENT, { detail: actor })
  );
}

type Props = {
  pageDefault: ActorValue;
  onChange?: (actor: ActorValue) => void;
  /** Demo User A/B: only this Hedera guest; no switching to the other wallet. */
  lockTo?: "guestA" | "guestB";
};

export function ActorSelector({ pageDefault, onChange, lockTo }: Props) {
  const [actor, setActor] = useState<ActorValue>(pageDefault);

  useEffect(() => {
    if (lockTo) {
      setActor(lockTo);
      localStorage.setItem(ACTOR_STORAGE_KEY, lockTo);
      onChange?.(lockTo);
    } else {
      const saved = localStorage.getItem(ACTOR_STORAGE_KEY) as ActorValue | null;
      if (saved === "issuer" || saved === "guestA" || saved === "guestB") {
        setActor(saved);
        onChange?.(saved);
      } else {
        setActor(pageDefault);
        localStorage.setItem(ACTOR_STORAGE_KEY, pageDefault);
        onChange?.(pageDefault);
      }
    }

    const handler = (e: Event) => {
      const ce = e as CustomEvent<ActorValue>;
      const v = ce.detail;
      if (v !== "issuer" && v !== "guestA" && v !== "guestB") return;
      if (lockTo && (v === "guestA" || v === "guestB") && v !== lockTo) {
        return;
      }
      setActor(v);
      onChange?.(v);
    };
    window.addEventListener(ACTOR_CHANGE_EVENT, handler);
    return () => window.removeEventListener(ACTOR_CHANGE_EVENT, handler);
  }, [pageDefault, onChange, lockTo]);

  function update(next: ActorValue) {
    if (lockTo && next !== lockTo && (next === "guestA" || next === "guestB")) {
      return;
    }
    setSelectedActor(next);
  }

  if (lockTo) {
    const label = lockTo === "guestA" ? "Guest A" : "Guest B";
    return (
      <div className="mb-4 rounded border border-sky-200 bg-sky-50/80 p-3 text-sm">
        <span className="font-medium text-sky-950">Hedera wallet: </span>
        <strong className="text-sky-950">{label}</strong>
        <span className="ml-2 text-xs text-sky-800/80">
          (locked for this demo sign-in — log out to use the other user)
        </span>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded border border-slate-200 bg-white p-3 text-sm">
      <span className="mr-2 font-medium text-slate-700">Actor:</span>
      {(["issuer", "guestA", "guestB"] as const).map((a) => (
        <label key={a} className="mr-3 inline-flex cursor-pointer items-center gap-1">
          <input
            type="radio"
            name="actor"
            checked={actor === a}
            onChange={() => update(a)}
          />
          {a}
        </label>
      ))}
    </div>
  );
}
