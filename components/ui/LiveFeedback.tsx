type Props = {
  success: string | null;
  error: string | null;
  className?: string;
};

export function LiveFeedback({ success, error, className }: Props) {
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
