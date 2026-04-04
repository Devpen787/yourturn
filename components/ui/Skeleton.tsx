import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-200/90 motion-reduce:animate-none motion-reduce:opacity-70",
        className
      )}
      aria-hidden
    />
  );
}
