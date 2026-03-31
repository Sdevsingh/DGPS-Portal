import { DashboardStatSkeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="h-full overflow-auto bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="animate-pulse h-7 w-44 bg-gray-200 rounded" />
        <div className="animate-pulse h-4 w-64 bg-gray-100 rounded" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <DashboardStatSkeleton key={i} />
        ))}
      </div>

      {/* Recent jobs skeleton */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="animate-pulse h-5 w-28 bg-gray-200 rounded" />
        </div>
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-6 py-4 flex items-center gap-4">
              <div className="animate-pulse w-2 h-2 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="animate-pulse h-4 w-1/3 bg-gray-200 rounded" />
                <div className="animate-pulse h-3 w-1/2 bg-gray-100 rounded" />
              </div>
              <div className="animate-pulse h-6 w-20 bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
