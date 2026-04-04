export function GuestPortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-sky-200/90 bg-sky-50/25 p-4 sm:p-6 md:p-8">
      {children}
    </div>
  );
}
