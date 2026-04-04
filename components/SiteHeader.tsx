"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function navClass(active: boolean, palette: "amber" | "sky") {
  const base =
    palette === "amber"
      ? active
        ? "font-semibold text-amber-950"
        : "text-amber-900/80 hover:text-amber-950"
      : active
        ? "font-semibold text-sky-950"
        : "text-sky-900/80 hover:text-sky-950";
  return `text-sm ${base}`;
}

export function SiteHeader() {
  const pathname = usePathname() ?? "";
  const issuerActive = pathname.startsWith("/issuer");
  const guestActive =
    pathname.startsWith("/slots") ||
    pathname.startsWith("/my-bookings") ||
    pathname.startsWith("/resale");

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-4">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="shrink-0">
            <Link
              href="/"
              className="text-lg font-semibold text-slate-800 hover:text-slate-600"
            >
              Booked Rights v1
            </Link>
            <p className="mt-1 max-w-xs text-xs text-slate-500">
              Hedera HTS + HCS demo — pick a portal below.
            </p>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:gap-4 lg:justify-end">
            <div
              className={`min-w-[10rem] rounded-xl border px-4 py-3 transition-shadow ${
                issuerActive
                  ? "border-amber-300 bg-amber-50 shadow-sm ring-1 ring-amber-200/60"
                  : "border-amber-100 bg-amber-50/50"
              }`}
            >
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-900/65">
                Issuer
              </p>
              <nav className="flex flex-wrap gap-x-4 gap-y-1">
                <Link
                  href="/issuer"
                  className={navClass(pathname === "/issuer", "amber")}
                >
                  Issuer console
                </Link>
              </nav>
            </div>

            <div
              className={`min-w-[12rem] flex-1 rounded-xl border px-4 py-3 transition-shadow sm:max-w-md ${
                guestActive
                  ? "border-sky-300 bg-sky-50 shadow-sm ring-1 ring-sky-200/60"
                  : "border-sky-100 bg-sky-50/50"
              }`}
            >
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-sky-900/65">
                Guests / users
              </p>
              <nav className="flex flex-wrap gap-x-4 gap-y-1">
                <Link
                  href="/slots"
                  className={navClass(
                    pathname === "/slots" ||
                      pathname.startsWith("/slots/") ||
                      pathname.startsWith("/resale"),
                    "sky"
                  )}
                >
                  Browse slots
                </Link>
                <Link
                  href="/my-bookings"
                  className={navClass(pathname.startsWith("/my-bookings"), "sky")}
                >
                  My bookings
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
