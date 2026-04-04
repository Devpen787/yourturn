import Link from "next/link";
import { getButtonClassName } from "@/components/ui/button-classes";
import { cn } from "@/lib/cn";

export function SlotResaleCta({ serial }: { serial: number }) {
  return (
    <Link
      href={`/resale/${serial}`}
      className={cn(getButtonClassName("primary"), "inline-flex no-underline")}
    >
      Sell pass
    </Link>
  );
}
