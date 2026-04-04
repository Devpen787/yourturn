"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export type ToastLink = { href: string; label: string };

export type ToastInput = {
  variant: "success" | "error";
  message: string;
  link?: ToastLink;
};

type ToastItem = ToastInput & { id: string };

const ToastContext = createContext<(t: ToastInput) => void>(() => {});

export function useToast(): (t: ToastInput) => void {
  return useContext(ToastContext);
}

const TOAST_MS = 5200;
const MAX_VISIBLE = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((t: ToastInput) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { ...t, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, TOAST_MS);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed left-4 right-4 top-4 z-[100] flex flex-col items-stretch gap-2 sm:left-auto sm:right-4 sm:max-w-md"
        aria-live="polite"
        aria-relevant="additions removals"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} {...t} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ variant, message, link }: ToastItem) {
  return (
    <div
      className={cn(
        "pointer-events-auto rounded-lg border p-3 text-sm shadow-lg motion-reduce:transition-none",
        variant === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
          : "border-red-200 bg-red-50 text-red-900"
      )}
      role={variant === "error" ? "alert" : "status"}
    >
      <p>{message}</p>
      {link ? (
        <a
          className="mt-2 inline-block font-medium text-current underline decoration-current/50 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
          href={link.href}
          target="_blank"
          rel="noreferrer"
        >
          {link.label}
        </a>
      ) : null}
    </div>
  );
}
