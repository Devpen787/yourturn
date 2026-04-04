import { Skeleton } from "@/components/ui/Skeleton";

export default function ResaleLoading() {
  return (
    <div className="mt-4 space-y-4">
      <Skeleton className="h-36 w-full max-w-3xl" />
      <div className="rounded border border-slate-200 bg-white p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-6 h-4 w-full max-w-md" />
        <Skeleton className="mt-4 h-10 w-32" />
        <Skeleton className="mt-8 h-4 w-56" />
        <Skeleton className="mt-4 h-10 w-36" />
      </div>
    </div>
  );
}
