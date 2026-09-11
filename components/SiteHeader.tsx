"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

type ProductPreviewHeaderMode =
  | "maya"
  | "bob"
  | "bob-bookings"
  | "provider"
  | "bob-activity"
  | "provider-today"
  | "provider-reconcile"
  | "provider-activity"
  | "maya-activity"
  | "provider-setup"
  | "provider-inventory"
  | "provider-bookings";

const NAV = [
  {
    href: "/slots",
    label: "Browse",
    match: (pathname: string) =>
      pathname.startsWith("/slots") || pathname.startsWith("/resale"),
  },
  {
    href: "/my-bookings",
    label: "My bookings",
    match: (pathname: string) => pathname.startsWith("/my-bookings"),
  },
  {
    href: "/issuer",
    label: "Provider dashboard",
    match: (pathname: string) => pathname.startsWith("/issuer"),
  },
] as const;

function NavLink({ href, label, active, className }: { href: string; label: string; active: boolean; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-2.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2",
        active ? "font-semibold text-slate-950" : "font-medium text-slate-800 hover:text-slate-950",
        className
      )}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

function showProviderInNav(pathname: string, sessionUser: SessionUser): boolean {
  if (process.env.NEXT_PUBLIC_SHOW_PROVIDER_NAV_ON_CUSTOMER_PAGES === "true") return true;
  if (sessionUser?.appRole === "issuer") return true;
  if (sessionUser?.appRole === "user") return pathname.startsWith("/issuer");
  if (pathname === "/" || pathname.startsWith("/issuer")) return true;
  return false;
}

function ProductPreviewHeader({ mode }: { mode: ProductPreviewHeaderMode }) {
  const config: Record<ProductPreviewHeaderMode, { href: string; label: string; ariaLabel: string; identity: string }> = {
    maya: { href: "/product-preview?view=bookings", label: "My bookings", ariaLabel: "Customer", identity: "Maya Keller" },
    bob: { href: "/product-preview?view=xc-find", label: "Find a spot", ariaLabel: "Customer", identity: "Bob" },
    "bob-bookings": { href: "/product-preview?view=xc-bob-success", label: "My bookings", ariaLabel: "Customer", identity: "Bob" },
    provider: { href: "/product-preview?view=xc-provider-policy", label: "Friday Yoga", ariaLabel: "Provider", identity: "Studio A" },
    "bob-activity": { href: "/product-preview?view=xc2-bob-history", label: "Activity", ariaLabel: "Customer", identity: "Bob" },
    "provider-today": { href: "/product-preview?view=xc2-provider-pending", label: "Today", ariaLabel: "Provider", identity: "Studio A" },
    "provider-reconcile": { href: "/product-preview?view=xc2-provider-reconciled", label: "Reconciliation", ariaLabel: "Provider", identity: "Studio A" },
    "provider-activity": { href: "/product-preview?view=xc2-provider-history", label: "Activity", ariaLabel: "Provider", identity: "Studio A" },
    "maya-activity": { href: "/product-preview?view=xc2-maya-history", label: "Activity", ariaLabel: "Customer", identity: "Maya Keller" },
    "provider-setup": { href: "/product-preview?view=xc3-provider-join", label: "Setup", ariaLabel: "Provider", identity: "Studio A" },
    "provider-inventory": { href: "/product-preview?view=xc3-provider-inventory", label: "Inventory", ariaLabel: "Provider", identity: "Studio A" },
    "provider-bookings": { href: "/product-preview?view=xc3-provider-sale-success", label: "Bookings", ariaLabel: "Provider", identity: "Studio A" },
  };
  const nav = config[mode];

  return (
    <header className="border-b border-slate-200/90 bg-white/90 shadow-sm shadow-slate-900/[0.03] backdrop-blur-md">
      <div className="mx-auto flex min-h-[3.25rem] max-w-5xl items-center justify-between gap-4 px-4 py-2.5 sm:py-3">
        <Link
          href="/"
          className="shrink-0 rounded-xl px-1 py-0.5 text-slate-800 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2"
          aria-label="YourTurn home"
        >
          <BrandLockup variant="calendarTurn" markClassName="h-8 w-8" />
        </Link>
        <nav className="flex min-w-0 items-center gap-2" aria-label={nav.ariaLabel}>
          <a
            href={nav.href}
            className="rounded-md px-2.5 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-focus focus-visible:ring-offset-2"
          >
            {nav.label}
          </a>
          <span className="hidden max-w-[14rem] truncate rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 sm:inline-block">
            {nav.identity}
          </span>
        </nav>
      </div>
    </header>
  );
}

export function SiteHeader({ sessionUser = null }: { sessionUser?: SessionUser }) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const [logoutBusy, setLogoutBusy] = useState(false);
  const homeActive = pathname === "/";

  if (pathname.startsWith("/product-preview")) {
    const view = searchParams.get("view") ?? "";
    let mode: ProductPreviewHeaderMode = "maya";

    if (view.startsWith("xc3-provider-join") || view.startsWith("xc3-provider-profile")) mode = "provider-setup";
    else if (view.startsWith("xc3-provider-inventory") || view.startsWith("xc3-provider-session")) mode = "provider-inventory";
    else if (view.startsWith("xc3-provider-sale")) mode = "provider-bookings";
    else if (view.startsWith("xc3-provider-today") || view === "xc3-provider-stale-holder") mode = "provider-today";
    else if (view.startsWith("xc2-provider-reconcile")) mode = "provider-reconcile";
    else if (view === "xc2-provider-history") mode = "provider-activity";
    else if (view.startsWith("xc2-provider-")) mode = "provider-today";
    else if (view === "xc2-bob-history") mode = "bob-activity";
    else if (view.startsWith("xc2-bob-")) mode = "bob-bookings";
    else if (view.startsWith("xc2-maya-") || view.startsWith("xc2-history-")) mode = "maya-activity";
    else if (view.startsWith("xc-provider")) mode = "provider";
    else if (view === "xc-bob-success") mode = "bob-bookings";
    else if (view.startsWith("xc-")) mode = "bob";

    return <ProductPreviewHeader mode={mode} />;
  }

  const navItems = showProviderInNav(pathname, sessionUser) ? NAV : NAV.filter((item) => item.href !== "/issuer");
  const compactCustomerLanding = pathname === "/" && !sessionUser;

  return (
    <header className="border-b border-slate-200/90 bg-white/90 shadow-sm shadow-slate-900/[0.03] backdrop-blur-md">
      <div className="mx-auto flex min-h-[3.25rem] max-w-5xl flex-nowrap items-center justify-between gap-x-3 px-4 py-2.5 sm:min-h-0 sm:flex-wrap sm:gap-x-4 sm:gap-y-2 sm:py-3">
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
        <nav className="ml-auto flex min-w-0 flex-nowrap items-center justify-end gap-x-1 sm:flex-wrap sm:gap-x-2 sm:gap-y-1.5" aria-label="Main">
          {sessionUser ? (
            <span
              className="hidden max-w-[14rem] min-w-0 items-center gap-x-1.5 rounded-full border border-slate-300/80 bg-slate-100/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-900/[0.04] sm:inline-flex md:max-w-[18rem]"
              title={sessionUser.email}
            >
              <span className="shrink-0 font-normal text-slate-500">Signed in</span>
              <span className="shrink-0 text-slate-300" aria-hidden>·</span>
              <span className="min-w-0 truncate text-slate-800">{sessionUser.email}</span>
            </span>
          ) : null}
          <div className={cn("flex flex-nowrap items-center gap-x-1 sm:flex-wrap sm:gap-x-2", sessionUser && "border-l border-slate-200/90 pl-2 sm:ml-0.5 sm:pl-3")}>
            {navItems.map((item) => {
              const href = pathname === "/" && item.href === "/my-bookings" ? "/product-preview" : item.href;
              const landingVisibility = compactCustomerLanding
                ? item.href === "/slots"
                  ? "hidden sm:inline-flex"
                  : item.href === "/issuer"
                    ? "hidden md:inline-flex"
                    : undefined
                : undefined;

              return <NavLink key={item.href} href={href} label={item.label} active={item.match(pathname)} className={landingVisibility} />;
            })}
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
              <NavLink href="/login" label="Sign in" active={pathname.startsWith("/login")} />
              <NavLink href="/register" label="Register" active={pathname.startsWith("/register")} className={compactCustomerLanding ? "hidden sm:inline-flex" : undefined} />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
