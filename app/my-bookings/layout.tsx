import { GuestPortalShell } from "@/components/GuestPortalShell";
import { requireSessionRole } from "@/lib/auth/require-session-role";

export default async function MyBookingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSessionRole("user");
  return <GuestPortalShell>{children}</GuestPortalShell>;
}
