"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "bookedrights:selectedActor";
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

type Props = {
  pageDefault: ActorValue;
  allowedActors?: readonly ActorValue[];
  title?: string;
  description?: string;
  onChange?: (actor: ActorValue) => void;
};

export function ActorSelector({
  pageDefault,
  allowedActors = ["issuer", "guestA", "guestB"],
  title = "Viewing as",
  description = "Choose whose side of the story you want to see in this demo. This switch is only for the demo, not a real sign-in flow.",
  onChange,
}: Props) {
  const [actor, setActor] = useState<ActorValue>(pageDefault);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ActorValue | null;
    const next = saved && allowedActors.includes(saved) ? saved : pageDefault;
    setActor(next);
    localStorage.setItem(STORAGE_KEY, next);
    onChange?.(next);
  }, [allowedActors, pageDefault, onChange]);

  function update(next: ActorValue) {
    setActor(next);
    localStorage.setItem(STORAGE_KEY, next);
    onChange?.(next);
  }

  const isCompact = allowedActors.length === 2;

  return (
    <div
      className={`mb-4 rounded border border-slate-200 bg-white text-sm ${
        isCompact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">{title}</p>
          <p className="mt-1 max-w-2xl text-slate-600">{description}</p>
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
