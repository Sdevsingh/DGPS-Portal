import { JobCardSkeleton } from "@/components/ui/Skeleton";

export default function ClientLoading() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="animate-pulse h-6 w-40 bg-gray-200 rounded mb-6" />
        {Array.from({ length: 4 }).map((_, i) => (
          <JobCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
