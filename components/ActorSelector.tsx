"use client";

import { useEffect, useState } from "react";

export const ACTOR_STORAGE_KEY = "bookedrights:selectedActor";
export const ACTOR_CHANGE_EVENT = "bookedrights:actorChange";

const ACTOR_META = {
  issuer: {
    label: "Provider",
    description:
      "Use for setup, approvals, pause or reopen actions, and check-in.",
  },
  guestA: {
    label: "Person A",
    description:
      "First customer for booking and listing a pass when plans change.",
  },
  guestB: {
    label: "Person B",
    description:
      "Second customer who can buy a listed pass and become the new holder.",
  },
} as const;

export type ActorValue = "issuer" | "guestA" | "guestB";

export function setSelectedActor(actor: ActorValue): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTOR_STORAGE_KEY, actor);
  window.dispatchEvent(
    new CustomEvent<ActorValue>(ACTOR_CHANGE_EVENT, { detail: actor })
  );
}

type Props = {
  pageDefault: ActorValue;
  allowedActors?: readonly ActorValue[];
  title?: string;
  description?: string;
  onChange?: (actor: ActorValue) => void;
  lockTo?: "guestA" | "guestB";
  /** Isolate localStorage when multiple selectors mount (e.g. brand lab previews). */
  actorStorageKey?: string;
};

export function ActorSelector({
  pageDefault,
  allowedActors = ["issuer", "guestA", "guestB"],
  title = "Viewing as",
  description = "Choose whose side of the story you want to see in this demo. This switch is only for the demo, not a real sign-in flow.",
  onChange,
  lockTo,
  actorStorageKey,
}: Props) {
  const storageKey = actorStorageKey ?? ACTOR_STORAGE_KEY;
  const [actor, setActor] = useState<ActorValue>(pageDefault);

  useEffect(() => {
    if (lockTo) {
      setActor(lockTo);
      localStorage.setItem(storageKey, lockTo);
      onChange?.(lockTo);
    } else {
      const saved = localStorage.getItem(storageKey) as ActorValue | null;
      const next = saved && allowedActors.includes(saved) ? saved : pageDefault;
      setActor(next);
      localStorage.setItem(storageKey, next);
      onChange?.(next);
    }

    const handler = (event: Event) => {
      const next = (event as CustomEvent<ActorValue>).detail;
      if (!allowedActors.includes(next)) return;
      if (lockTo && next !== lockTo) return;
      setActor(next);
      onChange?.(next);
    };

    window.addEventListener(ACTOR_CHANGE_EVENT, handler);
    return () => window.removeEventListener(ACTOR_CHANGE_EVENT, handler);
  }, [allowedActors, lockTo, pageDefault, onChange, storageKey]);

  function update(next: ActorValue) {
    if (lockTo && next !== lockTo) return;
    setActor(next);
    if (storageKey === ACTOR_STORAGE_KEY) {
      setSelectedActor(next);
    } else {
      localStorage.setItem(storageKey, next);
      onChange?.(next);
    }
  }

  const isCompact = allowedActors.length === 2;
  const activeDescription = lockTo
    ? `${ACTOR_META[lockTo].label} is locked by the current sign-in. Log out to use the other demo customer.`
    : description;

  return (
    <div
      className={`mb-4 rounded border border-slate-200 bg-white text-sm ${
        isCompact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">{title}</p>
          <p className="mt-1 max-w-2xl text-slate-600">{activeDescription}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          Current: {ACTOR_META[actor].label}
        </span>
      </div>

      {isCompact ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {allowedActors.map((a) => {
            const selected = actor === a;
            return (
              <label
                key={a}
                className={`cursor-pointer rounded-full border px-4 py-2 transition focus-within:ring-2 focus-within:ring-slate-400 focus-within:ring-offset-2 ${
                  selected
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="actor"
                  checked={selected}
                  disabled={!!lockTo}
                  onChange={() => update(a)}
                  className="sr-only"
                />
                <span className="text-sm font-medium">{ACTOR_META[a].label}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {allowedActors.map((a) => {
            const selected = actor === a;
            return (
              <label
                key={a}
                className={`cursor-pointer rounded-xl border p-3 transition focus-within:ring-2 focus-within:ring-slate-400 focus-within:ring-offset-2 ${
                  selected
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-900"
                }`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="actor"
                    checked={selected}
                    disabled={!!lockTo}
                    onChange={() => update(a)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">{ACTOR_META[a].label}</p>
                    <p
                      className={`mt-1 text-xs leading-5 ${
                        selected ? "text-slate-200" : "text-slate-600"
                      }`}
                    >
                      {ACTOR_META[a].description}
                    </p>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
