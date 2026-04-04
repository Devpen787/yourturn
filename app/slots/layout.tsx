import { GuestPortalShell } from "@/components/GuestPortalShell";

export default function SlotsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GuestPortalShell>{children}</GuestPortalShell>;
}
