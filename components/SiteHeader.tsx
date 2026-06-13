"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BrandLockup } from "@/components/brand-lab/brandLogoVariants";
import { cn } from "@/lib/cn";

type SessionUser =
  | {
      id: string;
      email: string;
      appRole: "issuer" | "user";
      hederaPersona: "guestA" | "guestB" | null;
    }
  | null;

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
        "rounded-md px-2.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2",
        active
          ? "font-semibold text-slate-950"
          : "font-medium text-slate-800 hover:text-slate-950"
      )}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

function showProviderInNav(pathname: string): boolean {
  if (process.env.NEXT_PUBLIC_SHOW_PROVIDER_NAV_ON_CUSTOMER_PAGES === "true") {
    return true;
  }
  if (pathname === "/" || pathname.startsWith("/issuer")) {
    return true;
  }
  return false;
}

export function SiteHeader({
  sessionUser = null,
}: {
  sessionUser?: SessionUser;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [logoutBusy, setLogoutBusy] = useState(false);
  const homeActive = pathname === "/";
  const navItems = showProviderInNav(pathname)
    ? NAV
    : NAV.filter((item) => item.href !== "/issuer");

  return (
    <header className="border-b border-slate-200/90 bg-white/90 shadow-sm shadow-slate-900/[0.03] backdrop-blur-md">
      <div className="mx-auto flex min-h-[3.25rem] max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:min-h-0 sm:py-3">
        <Link
          href="/"
          className={cn(
            "shrink-0 rounded-xl px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2",
            homeActive ? "text-slate-950" : "text-slate-800 hover:text-slate-950"
          )}
          aria-current={homeActive ? "page" : undefined}
        >
          <BrandLockup variant="calendarTurn" markClassName="h-8 w-8" />
        </Link>
        <nav
          className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-x-1 gap-y-1.5 sm:gap-x-2"
          aria-label="Main"
        >
          {sessionUser ? (
            <span
              className="hidden max-w-[14rem] min-w-0 items-center gap-x-1.5 rounded-full border border-slate-300/80 bg-slate-100/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-900/[0.04] sm:inline-flex md:max-w-[18rem]"
              title={sessionUser.email}
            >
              <span className="shrink-0 font-normal text-slate-500">
                Signed in
              </span>
              <span className="shrink-0 text-slate-300" aria-hidden>
                ·
              </span>
              <span className="min-w-0 truncate text-slate-800">
                {sessionUser.email}
              </span>
            </span>
          ) : null}
          <div
            className={cn(
              "flex flex-wrap items-center gap-x-1 sm:gap-x-2",
              sessionUser &&
                "border-l border-slate-200/90 pl-2 sm:ml-0.5 sm:pl-3"
            )}
          >
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={item.match(pathname)}
              />
            ))}
          </div>
          {sessionUser ? (
            <button
              type="button"
              disabled={logoutBusy}
              className="rounded-md border-l border-slate-200/90 px-2.5 py-2 pl-3 text-sm font-medium text-slate-800 transition-colors hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2 disabled:opacity-50 sm:ml-0.5 sm:pl-3.5"
              onClick={async () => {
                setLogoutBusy(true);
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                  router.refresh();
                  router.push("/");
                } finally {
                  setLogoutBusy(false);
                }
              }}
            >
              {logoutBusy ? "Signing out…" : "Sign out"}
            </button>
          ) : (
            <>
              <NavLink
                href="/login"
                label="Sign in"
                active={pathname.startsWith("/login")}
              />
              <NavLink
                href="/register"
                label="Register"
                active={pathname.startsWith("/register")}
              />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
