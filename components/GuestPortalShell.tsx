import Link from "next/link";

export function GuestPortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-sky-200/90 bg-sky-50/25 p-4 sm:p-6 md:p-8">
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <Link href="/slots" className="font-medium text-sky-900 underline">
          Browse slots
        </Link>
        <span className="text-slate-300">|</span>
        <Link href="/my-bookings" className="font-medium text-sky-900 underline">
          My bookings
        </Link>
      </div>
      {children}
    </div>
  );
}
