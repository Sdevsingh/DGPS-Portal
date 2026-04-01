import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRows } from "@/lib/sheets";
import Link from "next/link";
import { Suspense } from "react";
import JobFilters from "@/components/jobs/JobFilters";

const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  ready: "bg-purple-100 text-purple-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  invoiced: "bg-orange-100 text-orange-700",
  paid: "bg-emerald-100 text-emerald-700",
};

const QUOTE_STYLE: Record<string, string> = {
  pending: "bg-gray-100 text-gray-500",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-400",
  low: "bg-green-400",
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    quoteStatus?: string;
    priority?: string;
    paymentStatus?: string;
    inspectionRequired?: string;
    company?: string;
    pendingOn?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const { role, tenantId } = session.user;

  const [allJobs, allThreads] = await Promise.all([
    getRows("Jobs"),
    getRows("ChatThreads"),
  ]);

  const threadMap = new Map(allThreads.map((t) => [t.jobId, t]));

  let jobs = role === "super_admin" ? allJobs : allJobs.filter((j) => j.tenantId === tenantId);

  // Apply filters
  if (params.status) jobs = jobs.filter((j) => j.jobStatus === params.status);
  if (params.quoteStatus) jobs = jobs.filter((j) => j.quoteStatus === params.quoteStatus);
  if (params.priority) jobs = jobs.filter((j) => j.priority === params.priority);
  if (params.paymentStatus) jobs = jobs.filter((j) => j.paymentStatus === params.paymentStatus);
  if (params.inspectionRequired) jobs = jobs.filter((j) => j.inspectionRequired === params.inspectionRequired);
  if (params.company) jobs = jobs.filter((j) => j.tenantId === params.company);
  if (params.pendingOn === "overdue") {
    const now = new Date();
    const overdueJobIds = new Set(
      allThreads
        .filter((t) => t.pendingOn !== "none" && t.responseDueTime && new Date(t.responseDueTime) < now)
        .map((t) => t.jobId)
    );
    jobs = jobs.filter((j) => overdueJobIds.has(j.id));
  } else if (params.pendingOn) {
    const matchingJobIds = new Set(
      allThreads.filter((t) => t.pendingOn === params.pendingOn).map((t) => t.jobId)
    );
    jobs = jobs.filter((j) => matchingJobIds.has(j.id));
  }

  // Sort: high priority first, then newest
  jobs.sort((a, b) => {
    const pOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const pDiff = (pOrder[a.priority] ?? 1) - (pOrder[b.priority] ?? 1);
    return pDiff !== 0 ? pDiff : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {jobs.length} job{jobs.length !== 1 ? "s" : ""}
          </p>
        </div>
        {role === "operations_manager" && (
          <Link
            href="/jobs/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Job
          </Link>
        )}
      </div>

      {/* Filter bar — client component inside Suspense */}
      <Suspense fallback={null}>
        <JobFilters />
      </Suspense>

      {/* Job list */}
      <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 shadow-sm">
        {jobs.map((job) => {
          const thread = threadMap.get(job.id);
          const needsReply = thread?.pendingOn === "team";
          return (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
            >
              {/* Priority dot */}
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${PRIORITY_DOT[job.priority] ?? "bg-gray-300"}`} />

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="font-semibold text-gray-900 text-sm">{job.jobNumber}</span>
                  {role === "super_admin" && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {job.companyName}
                    </span>
                  )}
                  {needsReply && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium animate-pulse">
                      Reply needed
                    </span>
                  )}
                  {job.inspectionRequired === "true" && job.jobStatus !== "completed" && (
                    <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                      Inspection
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 font-medium truncate">{job.propertyAddress}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5 hidden sm:block">{job.description}</p>
              </div>

              {/* Right side badges */}
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    STATUS_STYLE[job.jobStatus] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {job.jobStatus.replace(/_/g, " ")}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    QUOTE_STYLE[job.quoteStatus] ?? "bg-gray-100 text-gray-500"
                  }`}
                >
                  {job.quoteStatus}
                </span>
                {job.assignedToName && (
                  <span className="text-xs text-gray-400 hidden sm:block">{job.assignedToName}</span>
                )}
              </div>

              <svg
                className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          );
        })}

        {jobs.length === 0 && (
          <div className="px-6 py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-gray-400 font-medium">No jobs found</p>
            <p className="text-gray-300 text-sm mt-1">Try changing your filters</p>
            {role === "operations_manager" && (
              <Link
                href="/jobs/new"
                className="mt-4 inline-block px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 text-sm"
              >
                Create first job
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
