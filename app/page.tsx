import Link from "next/link";
import { getSessionUser } from "@/lib/auth/get-session";

export default async function HomePage() {
  const session = await getSessionUser();
  const isIssuer = session?.appRole === "issuer";
  const isUser = session?.appRole === "user";
  const showIssuerPortal = !session || isIssuer;
  const showGuestPortal = !session || isUser;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-900">
          Who are you in this demo?
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
          Issuer tools and guest flows are split — your app sign-in controls which
          area you can open.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {showIssuerPortal ? (
          <Link
            href="/issuer"
            className="group rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm transition hover:border-amber-300 hover:shadow-md"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800/70">
              Issuer
            </p>
            <h2 className="mt-2 text-xl font-semibold text-amber-950 group-hover:underline">
              Issuer console
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-amber-950/80">
              Initialize token, mint demo slots, reset demo, freeze / unfreeze
              holders, and burn / withdraw slots.
            </p>
            <span className="mt-4 inline-block text-sm font-medium text-amber-900">
              Open issuer →
            </span>
          </Link>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 p-6 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Issuer
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-600">
              Issuer console
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Not available while signed in as a guest user. Log out, then use
              Demo issuer or an issuer account.
            </p>
            <Link
              href="/login?need=issuer"
              className="mt-4 inline-block text-sm font-medium text-amber-900 underline"
            >
              Switch to issuer sign-in →
            </Link>
          </div>
        )}

        {showGuestPortal ? (
          <Link
            href="/slots"
            className="group rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-white p-6 shadow-sm transition hover:border-sky-300 hover:shadow-md"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-800/70">
              Guests / users
            </p>
            <h2 className="mt-2 text-xl font-semibold text-sky-950 group-hover:underline">
              Browse slots
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-sky-950/80">
              Associate, book primary slots, list or buy resale from slot
              detail pages, and manage holdings under My bookings.
            </p>
            <span className="mt-4 inline-block text-sm font-medium text-sky-900">
              Open slots →
            </span>
          </Link>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 p-6 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Guests / users
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-600">
              Browse slots &amp; bookings
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Not available while signed in as an issuer. Log out, then use Demo
              user or register a guest account.
            </p>
            <Link
              href="/login?need=user"
              className="mt-4 inline-block text-sm font-medium text-sky-900 underline"
            >
              Switch to guest sign-in →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
