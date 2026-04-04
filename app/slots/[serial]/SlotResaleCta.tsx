"use client";

import Link from "next/link";

export function SlotResaleCta({ serial }: { serial: number }) {
  return (
    <Link
      href={`/resale/${serial}`}
      className="inline-block rounded bg-slate-800 px-3 py-2 text-white"
    >
      List for resale
    </Link>
  );
}
