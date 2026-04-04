"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const NAV = [
  {
    href: "/slots",
    label: "Browse",
    match: (pathname: string) =>
      pathname.startsWith("/slots") || pathname.startsWith("/resale"),
  },
  {
    href: "/my-bookings",
    label: "My passes",
    match: (pathname: string) => pathname.startsWith("/my-bookings"),
  },
  {
    href: "/issuer",
    label: "Provider dashboard",
    match: (pathname: string) => pathname.startsWith("/issuer"),
  },
] as const;

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-2 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
        active
          ? "font-semibold text-slate-950"
          : "text-slate-700 hover:text-slate-950"
      )}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname() ?? "";
  const homeActive = pathname === "/";

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className={cn(
            "rounded-md text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
            homeActive ? "text-slate-950" : "text-slate-800 hover:text-slate-950"
          )}
          aria-current={homeActive ? "page" : undefined}
        >
          YourTurn
        </Link>
        <nav
          className="flex flex-wrap items-center gap-1 sm:gap-3"
          aria-label="Main"
        >
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={item.match(pathname)}
            />
          ))}
        </nav>
      </div>
    </header>
  );
}
