"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "bookedrights:selectedActor";
const ACTOR_META = {
  issuer: {
    label: "Issuer",
    description: "Use for setup, freeze or unfreeze, and mark-used actions.",
  },
  guestA: {
    label: "Guest A",
    description: "Demo holder account for booking and first resale actions.",
  },
  guestB: {
    label: "Guest B",
    description: "Second demo guest for transfer, resale buy, and holder checks.",
  },
} as const;

export type ActorValue = "issuer" | "guestA" | "guestB";

type Props = {
  pageDefault: ActorValue;
  onChange?: (actor: ActorValue) => void;
};

export function ActorSelector({ pageDefault, onChange }: Props) {
  const [actor, setActor] = useState<ActorValue>(pageDefault);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ActorValue | null;
    if (saved === "issuer" || saved === "guestA" || saved === "guestB") {
      setActor(saved);
      onChange?.(saved);
    } else {
      setActor(pageDefault);
      localStorage.setItem(STORAGE_KEY, pageDefault);
      onChange?.(pageDefault);
    }
  }, [pageDefault, onChange]);

  function update(next: ActorValue) {
    setActor(next);
    localStorage.setItem(STORAGE_KEY, next);
    onChange?.(next);
  }

  return (
    <div className="mb-4 rounded border border-slate-200 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">Demo actor</p>
          <p className="mt-1 max-w-2xl text-slate-600">
            Switch which demo account the UI is acting as. This is a demo control,
            not wallet authentication or a security boundary.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          Current: {ACTOR_META[actor].label}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {(["issuer", "guestA", "guestB"] as const).map((a) => {
          const selected = actor === a;
          return (
            <label
              key={a}
              className={`cursor-pointer rounded-xl border p-3 transition ${
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
    </div>
  );
}
