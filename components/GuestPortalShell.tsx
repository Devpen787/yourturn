import Link from "next/link";
import { getButtonClassName } from "@/components/ui/button-classes";
import { cn } from "@/lib/cn";

export function GuestPortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <nav
        className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4"
        aria-label="Customer workspace"
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Customer workspace
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Browse sessions, manage passes, and inspect verified handoffs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/slots"
            className={cn(
              getButtonClassName("secondary"),
              "bg-white/80 px-3 text-sm"
            )}
          >
            Browse
          </Link>
          <Link
            href="/my-bookings"
            className={cn(
              getButtonClassName("secondary"),
              "bg-white/80 px-3 text-sm"
            )}
          >
            My bookings
          </Link>
          <Link
            href="/demo-help"
            className={cn(
              getButtonClassName("textLink"),
              "inline-flex min-h-[44px] items-center px-2 text-sm"
            )}
          >
            Demo help
          </Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
