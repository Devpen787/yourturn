type Props = {
  success: string | null;
  error: string | null;
  className?: string;
  /** Optional link shown under success text (e.g. HashScan tx). */
  successLink?: { href: string; label: string } | null;
};

export function LiveFeedback({
  success,
  error,
  className,
  successLink,
}: Props) {
  return (
    <div className={className}>
      {success ? (
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"
        >
          {success}
          {successLink ? (
            <>
              {" "}
              <a
                className="font-medium text-emerald-950 underline decoration-emerald-800/50 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                href={successLink.href}
                target="_blank"
                rel="noreferrer"
              >
                {successLink.label}
              </a>
            </>
          ) : null}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
