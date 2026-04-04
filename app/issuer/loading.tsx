import { Skeleton } from "@/components/ui/Skeleton";

export default function IssuerLoading() {
  return (
    <div>
      <Skeleton className="mb-4 h-8 w-64 max-w-full" />
      <Skeleton className="mb-4 h-28 w-full max-w-3xl" />
      <Skeleton className="mb-4 h-24 w-full max-w-xl" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Skeleton className="h-11 w-36" />
        <Skeleton className="h-11 w-44" />
        <Skeleton className="h-11 w-28" />
      </div>
      <Skeleton className="mb-2 h-6 w-40" />
      <div className="overflow-hidden rounded border border-slate-200 bg-white">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full border-t border-slate-100" />
        ))}
      </div>
      <Skeleton className="mt-8 mb-2 h-6 w-56" />
      <Skeleton className="mb-4 h-20 w-full max-w-2xl" />
      <div className="flex gap-2">
        <Skeleton className="h-11 w-28" />
        <Skeleton className="h-11 w-28" />
      </div>
    </div>
  );
}
