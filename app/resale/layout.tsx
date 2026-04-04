import { GuestPortalShell } from "@/components/GuestPortalShell";

export default function ResaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GuestPortalShell>{children}</GuestPortalShell>;
}
