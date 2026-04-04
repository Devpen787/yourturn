import { Skeleton } from "@/components/ui/Skeleton";

export default function MyBookingsLoading() {
  return (
    <div>
      <Skeleton className="mb-4 h-8 w-48 max-w-full" />
      <Skeleton className="mb-6 h-32 w-full max-w-3xl" />
      <Skeleton className="mb-4 h-16 w-full max-w-2xl" />
      <div className="rounded border border-slate-200 bg-white p-4">
        <Skeleton className="h-5 w-2/3 max-w-sm" />
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-5/6" />
      </div>
    </div>
  );
}
