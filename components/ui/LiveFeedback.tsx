type Props = {
  success: string | null;
  error: string | null;
  className?: string;
  successLink?: {
    href: string;
    label: string;
  } | null;
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
                href={successLink.href}
                target="_blank"
                rel="noreferrer"
                className="font-medium underline decoration-emerald-700/50 underline-offset-2 hover:text-emerald-950"
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
