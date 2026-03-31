import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRows, findRows } from "@/lib/sheets";
import Link from "next/link";

function StatCard({ label, value, color, href }: { label: string; value: number; color: string; href?: string }) {
  const card = (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-4xl font-bold ${color}`}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const { role, tenantId } = session.user;

  const [allJobs, allThreads] = await Promise.all([
    getRows("Jobs"),
    getRows("ChatThreads"),
  ]);

  const jobs = role === "super_admin" ? allJobs : allJobs.filter((j) => j.tenantId === tenantId);
  const threads = role === "super_admin" ? allThreads : allThreads.filter((t) => t.tenantId === tenantId);

  const now = new Date();

  const totalJobs = jobs.length;
  const newJobs = jobs.filter((j) => j.jobStatus === "new").length;
  const inProgressJobs = jobs.filter((j) => j.jobStatus === "in_progress").length;
  const completedJobs = jobs.filter((j) => j.jobStatus === "completed").length;
  const pendingQuotes = jobs.filter((j) => j.quoteStatus === "pending").length;
  const approvedJobs = jobs.filter((j) => j.quoteStatus === "approved").length;
  const needsTeamResponse = threads.filter((t) => t.pendingOn === "team").length;
  const needsClientResponse = threads.filter((t) => t.pendingOn === "client").length;
  const overdueChats = threads.filter((t) => t.pendingOn !== "none" && t.responseDueTime && new Date(t.responseDueTime) < now).length;

  // Recent jobs (last 5)
  const recentJobs = [...jobs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const threadMap = new Map(allThreads.map((t) => [t.jobId, t]));

  // Per-company breakdown for super admin
  let companyStats: { name: string; count: number }[] = [];
  if (role === "super_admin") {
    const tenants = await getRows("Tenants");
    companyStats = tenants.map((t) => ({
      name: t.name,
      count: allJobs.filter((j) => j.tenantId === t.id).length,
    })).sort((a, b) => b.count - a.count);
  }

  const statusColor: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    ready: "bg-purple-100 text-purple-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    completed: "bg-green-100 text-green-700",
    invoiced: "bg-orange-100 text-orange-700",
    paid: "bg-emerald-100 text-emerald-700",
  };

  const priorityDot: Record<string, string> = {
    high: "bg-red-500",
    medium: "bg-yellow-400",
    low: "bg-green-400",
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {role === "super_admin" ? "Global Dashboard" : "Dashboard"}
        </h1>
        <p className="text-gray-500 mt-0.5 text-sm">
          {role === "super_admin" ? "All companies" : session.user.tenantName}
        </p>
      </div>

      {/* Job stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Jobs" value={totalJobs} color="text-gray-900" href="/jobs" />
        <StatCard label="New Jobs" value={newJobs} color="text-blue-600" href="/jobs?status=new" />
        <StatCard label="In Progress" value={inProgressJobs} color="text-yellow-600" href="/jobs?status=in_progress" />
        <StatCard label="Completed" value={completedJobs} color="text-green-600" href="/jobs?status=completed" />
      </div>

      {/* Chat alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <p className="text-sm font-medium text-red-800">Needs Team Reply</p>
          </div>
          <p className="text-3xl font-bold text-red-700 ml-5">{needsTeamResponse}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <p className="text-sm font-medium text-yellow-800">Awaiting Client</p>
          </div>
          <p className="text-3xl font-bold text-yellow-700 ml-5">{needsClientResponse}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <p className="text-sm font-medium text-orange-800">Overdue Chats</p>
          </div>
          <p className="text-3xl font-bold text-orange-700 ml-5">{overdueChats}</p>
        </div>
      </div>

      {/* Quote / payment stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-sm text-gray-500">Pending Quotes</p>
          <p className="text-3xl font-bold text-purple-600">{pendingQuotes}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-sm text-gray-500">Approved Jobs</p>
          <p className="text-3xl font-bold text-green-600">{approvedJobs}</p>
        </div>
      </div>

      {/* Super admin: per-company breakdown */}
      {role === "super_admin" && companyStats.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5">
          <h2 className="font-semibold text-gray-900 mb-3">Jobs by Company</h2>
          <div className="space-y-2">
            {companyStats.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-48 truncate">{c.name}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.min(100, (c.count / Math.max(1, totalJobs)) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-8 text-right">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Jobs */}
      <div className="bg-white border border-gray-200 rounded-2xl">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Jobs</h2>
          <Link href="/jobs" className="text-sm text-blue-600 hover:underline">View all</Link>
        </div>
        <div className="divide-y divide-gray-100">
          {recentJobs.map((job) => {
            const thread = threadMap.get(job.id);
            return (
              <Link key={job.id} href={`/jobs/${job.id}`}
                className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
                <span className={`w-2 h-2 rounded-full shrink-0 ${priorityDot[job.priority] ?? "bg-gray-300"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{job.jobNumber}</span>
                    {role === "super_admin" && (
                      <span className="text-xs text-gray-400">{job.companyName}</span>
                    )}
                    {thread?.pendingOn === "team" && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">🔴 Reply needed</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{job.propertyAddress}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${statusColor[job.jobStatus] ?? "bg-gray-100 text-gray-600"}`}>
                  {job.jobStatus.replace(/_/g, " ")}
                </span>
              </Link>
            );
          })}
          {recentJobs.length === 0 && (
            <div className="px-5 py-10 text-center text-gray-400">No jobs yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
