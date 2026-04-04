import { GuestPortalShell } from "@/components/GuestPortalShell";

export default function MyBookingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GuestPortalShell>{children}</GuestPortalShell>;
}
