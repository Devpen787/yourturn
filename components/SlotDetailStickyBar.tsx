"use client";

import { ButtonLink } from "@/components/ui/ButtonLink";

export function SlotDetailStickyBar({
  serial,
  showResell,
}: {
  serial: number;
  showResell: boolean;
}) {
  if (!showResell) return null;
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-white/85 md:hidden"
      role="region"
      aria-label="Quick actions"
    >
      <ButtonLink
        href={`/resale/${serial}`}
        variant="primary"
        className="w-full justify-center no-underline"
      >
        Sell pass
      </ButtonLink>
    </div>
  );
}
