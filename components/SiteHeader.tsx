"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type SessionUser =
  | {
      id: string;
      email: string;
      appRole: "issuer" | "user";
      hederaPersona: "guestA" | "guestB" | null;
    }
  | null;

type HeaderProps = {
  sessionUser: SessionUser;
};

export function SiteHeader({ sessionUser }: HeaderProps) {
  const router = useRouter();
  const [logoutBusy, setLogoutBusy] = useState(false);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link
              href="/"
              className="text-lg font-semibold text-slate-800 hover:text-slate-600"
            >
              Booked Rights v1
            </Link>
            {sessionUser && (
              <p className="mt-1 text-xs text-slate-600" title={sessionUser.email}>
                Signed in:{" "}
                <span className="font-medium text-slate-800">
                  {sessionUser.email.length > 36
                    ? `${sessionUser.email.slice(0, 34)}…`
                    : sessionUser.email}
                </span>
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={logoutBusy}
            className="shrink-0 text-xs font-medium text-sky-800 underline disabled:opacity-50"
            onClick={async () => {
              setLogoutBusy(true);
              try {
                await fetch("/api/auth/logout", { method: "POST" });
                router.refresh();
              } finally {
                setLogoutBusy(false);
              }
            }}
          >
            {logoutBusy ? "…" : "Log out"}
          </button>
        </div>
      </div>
    </header>
  );
}
