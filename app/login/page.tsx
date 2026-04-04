import Link from "next/link";
import { getSessionUser } from "@/lib/auth/get-session";
import { DemoLoginButtons } from "./DemoLoginButtons";
import { LoginForm } from "./LoginForm";
import { LogoutToSwitchAccount } from "./LogoutToSwitchAccount";
import { SignInTitle } from "./SignInTitle";

export const metadata = {
  title: "Sign in · Booked Rights v1",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { need?: string };
}) {
  const session = await getSessionUser();
  const need = searchParams?.need;

  const mustLogoutForIssuer =
    session?.appRole === "user" && need === "issuer";
  const mustLogoutForUser =
    session?.appRole === "issuer" && need === "user";

  const roleHint =
    need === "issuer"
      ? "Issuer console needs an issuer app account. If you use a guest account today, log out first, then sign in as issuer."
      : need === "user"
        ? "Browse slots and bookings need a guest account. If you use an issuer account today, log out first, then sign in as guest."
        : null;

  return (
    <div className="mx-auto max-w-md">
      <SignInTitle />

      {mustLogoutForIssuer && (
        <LogoutToSwitchAccount
          afterLogoutHref="/login?need=issuer"
          currentLabel="guest (user)"
          targetLabel="issuer"
        />
      )}

      {mustLogoutForUser && (
        <LogoutToSwitchAccount
          afterLogoutHref="/login?need=user"
          currentLabel="issuer"
          targetLabel="guest (user)"
        />
      )}

      {!mustLogoutForIssuer && !mustLogoutForUser && (
        <>
          {roleHint && (
            <p
              className="mb-3 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950"
              role="status"
            >
              {roleHint}
            </p>
          )}
          {session && (
            <p className="mb-3 text-sm text-slate-600">
              Signed in as{" "}
              <span className="font-medium text-slate-800">
                {session.email}
              </span>{" "}
              (
              {session.appRole === "issuer" ? "issuer" : "guest"}). To use a
              different account type,{" "}
              <span className="font-medium text-slate-800">log out first</span>
              , then sign in again.
            </p>
          )}
          <p className="mb-4 text-sm text-slate-600">
            App account (email + password). Booking and resale still use the{" "}
            <strong>Guest A / B</strong> actor selector on each page (demo keys
            in{" "}
            <code className="rounded bg-slate-100 px-1">.env</code>).
          </p>
          <DemoLoginButtons
            sessionAppRole={session?.appRole ?? null}
            sessionHederaPersona={session?.hederaPersona ?? null}
          />
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Email sign in
          </p>
          <LoginForm />
          <p className="mt-4 text-center text-sm text-slate-600">
            No account?{" "}
            <Link href="/register" className="font-medium text-sky-800 underline">
              Register
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
