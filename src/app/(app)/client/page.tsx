import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findRow, findRows } from "@/lib/sheets";
import Link from "next/link";
import { redirect } from "next/navigation";

const PRIORITY_STYLE: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-emerald-100 text-emerald-700",
};
const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  invoiced: "bg-orange-100 text-orange-700",
  paid: "bg-emerald-100 text-emerald-700",
};

type ClientView = "all" | "active" | "awaiting" | "completed";

function normalizeClientStatus(status: string): string {
  if (status === "ready") return "in_progress";
  return status;
}

function parseView(view?: string): ClientView {
  if (view === "active" || view === "awaiting" || view === "completed") return view;
  return "all";
}

function getViewHref(view: ClientView): string {
  return view === "all" ? "/client" : `/client?view=${view}`;
}

export default async function ClientPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const currentView = parseView(params.view);

  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "client") redirect("/dashboard");

  const [jobs, tenant] = await Promise.all([
    findRows(
      "Jobs",
      (r) =>
        r.tenantId === session.user.tenantId &&
        (
          r.agentEmail?.toLowerCase() === session.user.email?.toLowerCase() ||
          r.createdByUserId === session.user.id
        )
    ),
    findRow("Tenants", (r) => r.id === session.user.tenantId),
  ]);
  const sortedJobs = [...jobs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const activeJobs = jobs.filter((j) => !["paid", "completed"].includes(normalizeClientStatus(j.jobStatus))).length;
  const quoteWaiting = jobs.filter((j) => j.quoteStatus === "sent").length;
  const completedJobs = jobs.filter((j) => ["completed", "paid"].includes(normalizeClientStatus(j.jobStatus))).length;
  const filteredJobs = sortedJobs.filter((job) => {
    const normalizedStatus = normalizeClientStatus(job.jobStatus);
    if (currentView === "active") return !["completed", "paid"].includes(normalizedStatus);
    if (currentView === "awaiting") return job.quoteStatus === "sent";
    if (currentView === "completed") return ["completed", "paid"].includes(normalizedStatus);
    return true;
  });

  const summaryCards: Array<{
    view: ClientView;
    title: string;
    value: number;
    accent: string;
    border: string;
  }> = [
    { view: "all", title: "All Jobs", value: jobs.length, accent: "text-gray-900", border: "border-gray-300" },
    { view: "active", title: "Active", value: activeJobs, accent: "text-gray-900", border: "border-blue-300" },
    { view: "awaiting", title: "Awaiting You", value: quoteWaiting, accent: "text-blue-700", border: "border-blue-300" },
    { view: "completed", title: "Completed", value: completedJobs, accent: "text-emerald-700", border: "border-emerald-300" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700">
        <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
          <div className="bg-white/10 border border-white/20 backdrop-blur rounded-3xl p-5 md:p-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase">
                  {tenant?.name ?? session.user.tenantName}
                </p>
                <p className="text-blue-100 text-sm mt-3">Welcome back</p>
                <h1 className="text-2xl md:text-3xl font-bold">{session.user.name}</h1>
                <p className="text-blue-100 text-sm mt-1">
                  {jobs.length} service request{jobs.length !== 1 ? "s" : ""} across your portfolio
                </p>
              </div>

              {tenant?.slug && (
                <Link
                  href={`/request/${tenant.slug}`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-sm font-semibold transition-colors shadow-sm shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Submit New Request
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-3xl mx-auto space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {summaryCards.map((card) => {
            const isActiveFilter = currentView === card.view;
            return (
              <Link
                key={card.view}
                href={getViewHref(card.view)}
                className={`rounded-2xl border p-3 transition-all ${
                  isActiveFilter
                    ? `bg-white ${card.border} shadow-sm ring-1 ring-blue-200`
                    : "bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm"
                }`}
              >
                <p className="text-xs text-gray-500">{card.title}</p>
                <p className={`text-2xl font-bold mt-0.5 ${card.accent}`}>{card.value}</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {isActiveFilter ? "Filtering now" : "Click to filter"}
                </p>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing{" "}
            <span className="font-semibold text-gray-800">
              {currentView === "all" ? "All Jobs" : summaryCards.find((c) => c.view === currentView)?.title}
            </span>
          </p>
          {currentView !== "all" && (
            <Link href="/client" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Clear Filter
            </Link>
          )}
        </div>

        {filteredJobs.map((job) => {
          const normalizedStatus = normalizeClientStatus(job.jobStatus);
          const hasQuote = job.quoteAmount && Number(job.quoteAmount) > 0;
          return (
            <Link
              key={job.id}
              href={`/client/jobs/${job.id}`}
              className="block bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-900">{job.propertyAddress}</p>
                  <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
                    {job.category} · {job.jobNumber}
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLE[job.priority] ?? "bg-gray-100 text-gray-600"}`}>
                      {job.priority || "medium"} priority
                    </span>
                  </p>
                </div>
                {hasQuote && job.quoteStatus === "sent" && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
                    Quote Ready
                  </span>
                )}
                {job.quoteStatus === "approved" && (
                  <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                    Approved
                  </span>
                )}
                {job.quoteStatus === "rejected" && (
                  <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium">
                    Declined
                  </span>
                )}
                {!hasQuote && (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLE[normalizedStatus] ?? "bg-gray-100 text-gray-600"}`}>
                    {(normalizedStatus || "new").replace(/_/g, " ")}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Status:{" "}
                  <span className="font-semibold text-gray-800 capitalize">
                    {(normalizedStatus || "new").replace(/_/g, " ")}
                  </span>
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(job.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                </p>
              </div>
              <div className="flex justify-between mt-2">
                <p className="text-xs text-gray-400">Job updates available in chat</p>
                {hasQuote && (
                  <p className="text-sm font-bold text-gray-900">
                    ${Number(job.quoteTotalWithGst).toFixed(2)}{" "}
                    <span className="text-xs font-normal text-gray-400">incl. GST</span>
                  </p>
                )}
              </div>

              {job.quoteStatus === "sent" && (
                <div className="mt-3 p-3 bg-blue-50 rounded-xl text-sm text-blue-700 font-medium">
                  Your quote is ready — tap to review and approve
                </div>
              )}

              {job.inspectionRequired === "true" && job.jobStatus === "new" && (
                <div className="mt-3 flex items-center gap-2 text-xs text-purple-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Inspection required before quote
                </div>
              )}
            </Link>
          );
        })}

        {filteredJobs.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-400 text-lg font-medium">
              {currentView === "all" ? "No service requests yet" : "No jobs in this view"}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {currentView === "all"
                ? "Your submitted jobs will appear here"
                : "Try switching filters to see other jobs"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
