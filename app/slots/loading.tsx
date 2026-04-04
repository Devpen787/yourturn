import { Skeleton } from "@/components/ui/Skeleton";

export default function SlotsLoading() {
  return (
    <div>
      <Skeleton className="mb-4 h-8 w-64 max-w-full" />
      <Skeleton className="mb-6 h-36 w-full max-w-3xl" />
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <ul className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="rounded border border-slate-200 bg-white p-4">
            <Skeleton className="h-5 w-3/5 max-w-md" />
            <Skeleton className="mt-3 h-4 w-full max-w-lg" />
            <Skeleton className="mt-4 h-4 w-full" />
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-24" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
