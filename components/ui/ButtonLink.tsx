import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import {
  getButtonClassName,
  type ButtonVariant,
} from "@/components/ui/button-classes";

type Props = Omit<ComponentProps<typeof Link>, "className"> & {
  variant: ButtonVariant;
  className?: string;
};

/** Next.js `Link` styled with shared button tokens (focus rings, touch targets). */
export function ButtonLink({ variant, className, ...props }: Props) {
  return (
    <Link
      {...props}
      className={cn(getButtonClassName(variant), className)}
    />
  );
}
