import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findRow, findRows } from "@/lib/sheets";
import Link from "next/link";
import { redirect } from "next/navigation";

const STEPS = ["new", "in_progress", "completed", "invoiced", "paid"];
const STEP_LABELS = ["Submitted", "In Progress", "Completed", "Invoiced", "Paid"];

function normalizeClientStatus(status: string): string {
  if (status === "ready") return "in_progress";
  return status;
}

export default async function ClientPortalPage() {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-8">
        <p className="text-blue-200 text-sm mb-1">Welcome back</p>
        <h1 className="text-2xl font-bold">{session.user.name}</h1>
        <p className="text-blue-200 text-sm mt-1">
          {jobs.length} service request{jobs.length !== 1 ? "s" : ""}
        </p>
        {tenant?.slug && (
          <Link
            href={`/request/${tenant.slug}`}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Submit New Request
          </Link>
        )}
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-2xl p-3">
            <p className="text-xs text-gray-500">Active</p>
            <p className="text-xl font-bold text-gray-900">{activeJobs}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-3">
            <p className="text-xs text-gray-500">Awaiting You</p>
            <p className="text-xl font-bold text-blue-700">{quoteWaiting}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-3">
            <p className="text-xs text-gray-500">Completed</p>
            <p className="text-xl font-bold text-emerald-700">{completedJobs}</p>
          </div>
        </div>

        {sortedJobs.map((job) => {
          const stepIndex = STEPS.indexOf(normalizeClientStatus(job.jobStatus));
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
                  <p className="text-sm text-gray-500 mt-0.5">
                    {job.category} · {job.jobNumber}
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
              </div>

              {/* Status timeline */}
              <div className="flex items-center gap-1 mb-3">
                {STEPS.map((step, i) => (
                  <div key={step} className="flex items-center flex-1">
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        i <= stepIndex ? "bg-blue-600" : "bg-gray-200"
                      }`}
                    />
                    {i < STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-0.5 ${
                          i < stepIndex ? "bg-blue-600" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between">
                <p className="text-xs text-blue-600 font-medium">
                  {STEP_LABELS[Math.max(0, stepIndex)]}
                </p>
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

        {sortedJobs.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-400 text-lg font-medium">No service requests yet</p>
            <p className="text-gray-400 text-sm mt-1">Your submitted jobs will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
