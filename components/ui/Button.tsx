"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/Spinner";
import { getButtonClassName, type ButtonVariant } from "@/components/ui/button-classes";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  loadingLabel?: string;
};

export function Button({
  variant = "primary",
  loading = false,
  loadingLabel,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(getButtonClassName(variant), className)}
      {...rest}
    >
      {loading && <Spinner />}
      {loading ? (loadingLabel ?? children) : children}
    </button>
  );
}
