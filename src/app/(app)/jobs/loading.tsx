import { JobCardSkeleton } from "@/components/ui/Skeleton";

export default function JobsLoading() {
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header bar skeleton */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="animate-pulse h-6 w-16 bg-gray-200 rounded" />
        <div className="animate-pulse h-9 w-28 bg-gray-200 rounded-xl" />
      </div>

      {/* Filter tabs skeleton */}
      <div className="bg-white border-b border-gray-200 px-6 py-2 flex gap-2">
        {[80, 60, 100, 80, 90, 70].map((w, i) => (
          <div key={i} className={`animate-pulse h-7 bg-gray-100 rounded-full`} style={{ width: w }} />
        ))}
      </div>

      {/* Cards grid skeleton */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
