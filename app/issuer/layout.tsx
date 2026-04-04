export default function IssuerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-amber-200/90 bg-amber-50/25 p-4 sm:p-6 md:p-8">
      {children}
    </div>
  );
}
