import { Skeleton } from "@/components/ui/Skeleton";

export default function SlotDetailLoading() {
  return (
    <div className="text-sm">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="mt-4 h-7 w-72 max-w-full" />
      <Skeleton className="mt-2 h-4 w-full max-w-xl" />
      <div className="mt-4 space-y-3 rounded border border-slate-200 bg-white p-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="mt-6 h-11 w-32" />
      <div className="mt-6 rounded border border-slate-200 bg-white p-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-3 h-4 w-full max-w-md" />
        <div className="mt-4 flex gap-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    </div>
  );
}
