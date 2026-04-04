import { requireSessionRole } from "@/lib/auth/require-session-role";

export default async function IssuerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSessionRole("issuer");
  return (
    <div className="rounded-2xl border border-amber-200/90 bg-amber-50/25 p-4 sm:p-6 md:p-8">
      {children}
    </div>
  );
}
