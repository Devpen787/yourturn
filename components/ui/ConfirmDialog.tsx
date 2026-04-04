"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/Button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  details?: Array<{ label: string; value: ReactNode }>;
  warning?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  loadingLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  requireText?: string;
  requireTextLabel?: string;
};

export function ConfirmDialog({
  open,
  title,
  description,
  details = [],
  warning,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  loadingLabel,
  onConfirm,
  onClose,
  requireText,
  requireTextLabel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [typedValue, setTypedValue] = useState("");

  const requiresText = Boolean(requireText);
  const typedMatches = useMemo(
    () => !requiresText || typedValue.trim() === requireText,
    [requireText, requiresText, typedValue]
  );

  useEffect(() => {
    if (!open) {
      setTypedValue("");
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => {
      if (requiresText) {
        const input = dialogRef.current?.querySelector<HTMLInputElement>("input");
        input?.focus();
      } else {
        cancelButtonRef.current?.focus();
      }
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute("hidden"));

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose, open, requiresText]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/40 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <h2 id={titleId} className="text-lg font-semibold text-slate-950">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm text-slate-600">
          {description}
        </p>
        {details.length > 0 ? (
          <dl className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            {details.map((detail) => (
              <div
                key={detail.label}
                className="flex flex-wrap items-start justify-between gap-2"
              >
                <dt className="font-medium text-slate-700">{detail.label}</dt>
                <dd className="text-right text-slate-900">{detail.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {warning ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            {warning}
          </p>
        ) : null}
        {requiresText ? (
          <div className="mt-4">
            <label className="grid gap-1" htmlFor={inputId}>
              <span className="text-sm font-medium text-slate-800">
                {requireTextLabel ?? `Type ${requireText} to continue`}
              </span>
              <input
                id={inputId}
                value={typedValue}
                onChange={(event) => setTypedValue(event.target.value)}
                className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              />
            </label>
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            ref={cancelButtonRef}
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={onClose}
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmButtonRef}
            type="button"
            variant="primary"
            loading={loading}
            loadingLabel={loadingLabel}
            disabled={!typedMatches}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
