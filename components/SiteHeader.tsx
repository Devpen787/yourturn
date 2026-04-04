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
        "rounded-md px-2 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2",
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
    <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className={cn(
            "rounded-xl px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2",
            homeActive ? "text-slate-950" : "text-slate-800 hover:text-slate-950"
          )}
          aria-current={homeActive ? "page" : undefined}
        >
          <BrandLockup variant="calendarTurn" markClassName="h-8 w-8" />
        </Link>
        <nav
          className="flex flex-wrap items-center gap-1 sm:gap-3"
          aria-label="Main"
        >
          {sessionUser ? (
            <span
              className="hidden max-w-[15rem] truncate rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 sm:inline"
              title={sessionUser.email}
            >
              Signed in: {sessionUser.email}
            </span>
          ) : null}
          {process.env.NODE_ENV === "development" ? (
            <Link
              href="/brand-lab"
              className="rounded-md px-2 py-2.5 text-xs text-brand-link transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2 hover:text-brand-mark"
            >
              Brand lab
            </Link>
          ) : null}
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={item.match(pathname)}
            />
          ))}
          {sessionUser ? (
            <button
              type="button"
              disabled={logoutBusy}
              className="rounded-md px-2 py-2.5 text-sm text-slate-700 transition-colors hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2 disabled:opacity-50"
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
