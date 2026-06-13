"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/providers/ToastProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
