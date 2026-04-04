"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "bookedrights:selectedActor";

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
