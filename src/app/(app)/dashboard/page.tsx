import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { formatJob, formatThread } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import ActivityScroll, { type ActivityItem } from "@/components/dashboard/ActivityScroll";

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconBriefcase() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
function IconSpark() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 3v1m0 16v1m8.66-10H21M3 12H2m15.364-7.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
function IconChevron() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, icon, accent, href }: { label: string; value: number; icon: React.ReactNode; accent: string; href?: string }) {
  const inner = (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden h-full flex flex-col min-h-[120px]">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />
      <div className="flex items-start justify-between flex-1">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider leading-tight h-8 flex items-start">{label}</p>
          <p className="text-3xl font-bold text-gray-900 leading-none">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 text-gray-400 group-hover:scale-110 transition-transform shrink-0">
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs text-gray-400 group-hover:text-gray-600 transition-colors">
        <span>View all</span><IconChevron />
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function AlertCard({ label, value, color, bg, border, text, href }: { label: string; value: number; color: string; bg: string; border: string; text: string; href: string }) {
  return (
    <Link href={href} className={`${bg} border ${border} rounded-2xl p-4 flex items-center justify-between group hover:shadow-md transition-all`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
          <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
        </div>
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wider ${text} opacity-70`}>{label}</p>
          <p className={`text-2xl font-bold ${text} leading-tight`}>{value}</p>
        </div>
      </div>
      <div className={`${text} opacity-30 group-hover:opacity-70 transition-opacity`}><IconChevron /></div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const { role, tenantId, id: userId, assignedTenantIds } = session.user;

  if (role === "client") redirect("/client");

  const isTechnician = role === "technician";
  const jobsBase = isTechnician ? "/technician" : "/jobs";

  // Fetch jobs — technician sees only assigned jobs
  let jobQ = supabaseAdmin
    .from("jobs")
    .select("id, job_number, job_status, quote_status, payment_status, priority, property_address, company_name, tenant_id, created_at, quote_amount, quote_total_with_gst");
  let threadQ = supabaseAdmin
    .from("chat_threads")
    .select("id, job_id, pending_on, response_due_time, tenant_id");

  if (isTechnician) {
    jobQ = jobQ.eq("tenant_id", tenantId).eq("assigned_to_id", userId);
    threadQ = threadQ.eq("tenant_id", tenantId);
  } else if (role !== "super_admin") {
    const accessible = Array.from(new Set([tenantId, ...(assignedTenantIds ?? [])]));
    jobQ = jobQ.in("tenant_id", accessible);
    threadQ = threadQ.in("tenant_id", accessible);
  }

  const [{ data: allJobsRaw }, { data: allThreadsRaw }] = await Promise.all([
    jobQ.order("created_at", { ascending: false }),
    threadQ,
  ]);

  const allJobs = (allJobsRaw ?? []).map(formatJob);
  const allThreadsRaw2 = (allThreadsRaw ?? []).map(formatThread);

  // For technicians, only include threads from their assigned jobs
  const techJobIds = isTechnician ? new Set(allJobs.map((j) => j.id)) : null;
  const allThreads = techJobIds ? allThreadsRaw2.filter((t) => techJobIds.has(t.jobId)) : allThreadsRaw2;

  const now = new Date();

  // ── Core counts ──────────────────────────────────────────────────────────────
  const totalJobs        = allJobs.length;
  const newJobs          = allJobs.filter((j) => j.jobStatus === "new").length;
  const readyJobs        = allJobs.filter((j) => j.jobStatus === "ready").length;
  const inProgressJobs   = allJobs.filter((j) => j.jobStatus === "in_progress").length;
  const completedJobs    = allJobs.filter((j) => j.jobStatus === "completed").length;
  const invoicedJobs     = allJobs.filter((j) => j.jobStatus === "invoiced").length;
  const paidJobs         = allJobs.filter((j) => j.jobStatus === "paid").length;
  const pendingQuotes    = allJobs.filter((j) => j.quoteStatus === "pending").length;
  const quoteApproved    = allJobs.filter((j) => j.quoteStatus === "approved").length;
  const quoteSent        = allJobs.filter((j) => j.quoteStatus === "sent").length;
  const quoteRejected    = allJobs.filter((j) => j.quoteStatus === "rejected").length;
  const highPriorityJobs = allJobs.filter((j) => j.priority === "high").length;

  const needsTeamResponse   = allThreads.filter((t) => t.pendingOn === "team").length;
  const needsClientResponse = allThreads.filter((t) => t.pendingOn === "client").length;
  const overdueChats        = allThreads.filter((t) => t.pendingOn !== "none" && t.responseDueTime && new Date(t.responseDueTime) < now).length;
  const totalAttention      = needsTeamResponse + needsClientResponse + overdueChats;

  // ── Revenue ──────────────────────────────────────────────────────────────────
  const totalRevenue = allJobs.reduce((sum, j) => {
    if (j.paymentStatus === "paid" && j.quoteTotalWithGst) return sum + Number(j.quoteTotalWithGst);
    return sum;
  }, 0);
  const pendingRevenue = allJobs.reduce((sum, j) => {
    if (j.jobStatus === "invoiced" && j.quoteTotalWithGst) return sum + Number(j.quoteTotalWithGst);
    return sum;
  }, 0);

  // ── AI Insights ──────────────────────────────────────────────────────────────
  const completionRate  = totalJobs > 0 ? Math.round(((completedJobs + paidJobs) / totalJobs) * 100) : 0;
  const quoteConvBase   = quoteApproved + quoteSent + quoteRejected;
  const quoteConversion = quoteConvBase > 0 ? Math.round((quoteApproved / quoteConvBase) * 100) : 0;

  const aiInsights = [
    {
      label: "Completion Rate",
      value: `${completionRate}%`,
      sub: completionRate >= 70 ? "Strong pipeline velocity ↑" : completionRate >= 40 ? "Steady progress in pipeline" : "Jobs accumulating — review backlog",
      color: (completionRate >= 70 ? "emerald" : completionRate >= 40 ? "blue" : "amber") as "emerald" | "blue" | "amber" | "red",
    },
    {
      label: "Quote Conversion",
      value: quoteConversion > 0 ? `${quoteConversion}%` : "—",
      sub: quoteConversion >= 60 ? "Quotes converting well ↑" : quoteConversion > 0 ? "Improve follow-up cadence" : "No closed quotes yet",
      color: (quoteConversion >= 60 ? "emerald" : quoteConversion > 0 ? "amber" : "blue") as "emerald" | "blue" | "amber" | "red",
    },
    {
      label: "High Priority",
      value: String(highPriorityJobs),
      sub: highPriorityJobs === 0 ? "No critical backlog ✓" : `${highPriorityJobs} job${highPriorityJobs !== 1 ? "s" : ""} need immediate action`,
      color: (highPriorityJobs === 0 ? "emerald" : highPriorityJobs <= 2 ? "amber" : "red") as "emerald" | "blue" | "amber" | "red",
    },
    {
      label: "Chat Backlog",
      value: String(needsTeamResponse),
      sub: needsTeamResponse === 0 ? "All chats responded ✓" : `${needsTeamResponse} message${needsTeamResponse !== 1 ? "s" : ""} awaiting reply`,
      color: (needsTeamResponse === 0 ? "emerald" : needsTeamResponse <= 3 ? "amber" : "red") as "emerald" | "blue" | "amber" | "red",
    },
  ];

  // ── Chart slices ─────────────────────────────────────────────────────────────
  const statusSlices = [
    { name: "New",         value: newJobs,       color: "#3B82F6" },
    { name: "Ready",       value: readyJobs,      color: "#8B5CF6" },
    { name: "In Progress", value: inProgressJobs, color: "#F59E0B" },
    { name: "Completed",   value: completedJobs,  color: "#10B981" },
    { name: "Invoiced",    value: invoicedJobs,   color: "#F97316" },
    { name: "Paid",        value: paidJobs,       color: "#059669" },
  ];
  const quoteSlices = [
    { name: "Pending",  value: pendingQuotes, color: "#9CA3AF" },
    { name: "Sent",     value: quoteSent,     color: "#3B82F6" },
    { name: "Approved", value: quoteApproved, color: "#10B981" },
    { name: "Rejected", value: quoteRejected, color: "#EF4444" },
  ];

  // ── Activity feed ─────────────────────────────────────────────────────────────
  const threadMap = new Map(allThreads.map((t) => [t.jobId, t]));
  const activityItems: ActivityItem[] = allJobs.slice(0, 12).map((job) => ({
    id: job.id,
    jobNumber: job.jobNumber,
    address: job.propertyAddress,
    status: job.jobStatus,
    company: job.companyName,
    priority: job.priority,
    href: isTechnician ? `/technician/jobs/${job.id}` : `/jobs/${job.id}`,
    time: formatRelativeTime(job.createdAt),
    needsReply: threadMap.get(job.id)?.pendingOn === "team",
  }));

  // ── Company stats (super_admin only) ─────────────────────────────────────────
  let companyStats: { id: string; name: string; count: number }[] = [];
  if (role === "super_admin") {
    const { data: tenants } = await supabaseAdmin.from("tenants").select("id, name");
    companyStats = (tenants ?? [])
      .map((t) => ({ id: t.id, name: t.name, count: allJobs.filter((j) => j.tenantId === t.id).length }))
      .sort((a, b) => b.count - a.count);
  }

  const statusConfig: Record<string, { label: string; bg: string; text: string; bar: string }> = {
    new:         { label: "New",         bg: "bg-blue-50",    text: "text-blue-700",    bar: "bg-blue-400"    },
    ready:       { label: "Ready",       bg: "bg-purple-50",  text: "text-purple-700",  bar: "bg-purple-400"  },
    in_progress: { label: "In Progress", bg: "bg-yellow-50",  text: "text-yellow-700",  bar: "bg-yellow-400"  },
    completed:   { label: "Completed",   bg: "bg-green-50",   text: "text-green-700",   bar: "bg-green-500"   },
    invoiced:    { label: "Invoiced",    bg: "bg-orange-50",  text: "text-orange-700",  bar: "bg-orange-400"  },
    paid:        { label: "Paid",        bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500" },
  };

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUPER ADMIN — Intelligence dashboard layout
  // ═══════════════════════════════════════════════════════════════════════════

  if (role === "super_admin") {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-6 md:px-8 py-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">{dateStr}</p>
              <h1 className="text-2xl font-bold text-gray-900">{greeting}, {session.user.name?.split(" ")[0]}</h1>
              <p className="text-sm text-gray-500 mt-0.5">Global overview — all companies</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Super Admin · Full Access
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-8 py-6 space-y-6">

          {/* ── Attention alerts ─────────────────────────────────────────────── */}
          {totalAttention > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <p className="text-sm font-semibold text-gray-700">Requires attention</p>
                <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">{totalAttention}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <AlertCard label="Needs Team Reply"  value={needsTeamResponse}   color="bg-red-500"    bg="bg-red-50"    border="border-red-200"    text="text-red-800"    href="/jobs?pendingOn=team"    />
                <AlertCard label="Awaiting Client"   value={needsClientResponse}  color="bg-amber-500"  bg="bg-amber-50"  border="border-amber-200"  text="text-amber-800"  href="/jobs?pendingOn=client"  />
                <AlertCard label="Overdue Chats"     value={overdueChats}         color="bg-orange-500" bg="bg-orange-50" border="border-orange-200" text="text-orange-800" href="/jobs?pendingOn=overdue" />
              </div>
            </div>
          )}

          {/* ── 2-column intelligence layout ─────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

            {/* LEFT — pipeline + activity ───────────────────────────────────── */}
            <div className="xl:col-span-7 space-y-5">

              {/* Metric cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-stretch">
                <MetricCard label="Total Jobs"  value={totalJobs}      icon={<IconBriefcase />} accent="bg-gray-200"   href="/jobs" />
                <MetricCard label="New"         value={newJobs}        icon={<IconSpark />}     accent="bg-blue-400"   href="/jobs?status=new" />
                <MetricCard label="In Progress" value={inProgressJobs} icon={<IconClock />}     accent="bg-yellow-400" href="/jobs?status=in_progress" />
                <MetricCard label="Completed"   value={completedJobs}  icon={<IconCheck />}     accent="bg-green-500"  href="/jobs?status=completed" />
              </div>

              {/* Job Pipeline */}
              {totalJobs > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900">Job Pipeline</h2>
                    <span className="text-xs text-gray-400">{totalJobs} total</span>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(statusConfig).map(([status, cfg]) => {
                      const count = allJobs.filter((j) => j.jobStatus === status).length;
                      if (count === 0) return null;
                      const pct = Math.round((count / totalJobs) * 100);
                      return (
                        <Link key={status} href={`/jobs?status=${status}`} className="flex items-center gap-3 group">
                          <span className={`text-xs font-medium ${cfg.text} w-24 shrink-0`}>{cfg.label}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className={`${cfg.bar} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 w-6 text-right">{count}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pending quotes banner */}
              {pendingQuotes > 0 && (
                <Link href="/jobs?quoteStatus=pending" className="flex items-center gap-4 bg-purple-50 border border-purple-200 rounded-2xl px-5 py-4 hover:shadow-md transition-all group">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0"><IconChat /></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-purple-900">{pendingQuotes} quote{pendingQuotes !== 1 ? "s" : ""} awaiting preparation</p>
                    <p className="text-xs text-purple-600 mt-0.5">Jobs received but no quote sent yet</p>
                  </div>
                  <div className="text-purple-400 group-hover:text-purple-600 transition-colors shrink-0"><IconChevron /></div>
                </Link>
              )}

              {/* Activity scroll */}
              <ActivityScroll items={activityItems} />
            </div>

            {/* RIGHT — analytics + AI insights ─────────────────────────────── */}
            <div className="xl:col-span-5">
              <DashboardCharts
                statusSlices={statusSlices}
                quoteSlices={quoteSlices}
                totalRevenue={totalRevenue}
                pendingRevenue={pendingRevenue}
                insights={aiInsights}
              />
            </div>
          </div>

          {/* ── Company breakdown (full width) ───────────────────────────────── */}
          {companyStats.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Jobs by Company</h2>
                <Link href="/companies" className="text-xs text-blue-600 hover:underline">Manage →</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {companyStats.map((c, i) => {
                  const colors = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500", "bg-pink-500", "bg-indigo-500"];
                  const pct = Math.round((c.count / Math.max(1, totalJobs)) * 100);
                  return (
                    <Link key={c.id} href={`/jobs?company=${c.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group border border-gray-100">
                      <div className={`w-8 h-8 ${colors[i % colors.length]} rounded-xl flex items-center justify-center shrink-0`}>
                        <span className="text-white text-xs font-bold">{c.name[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{c.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className={`${colors[i % colors.length]} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 shrink-0">{c.count}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OTHER ROLES (ops manager, technician) — standard layout
  // ═══════════════════════════════════════════════════════════════════════════

  const recentJobs = allJobs.slice(0, 6);
  const priorityDot: Record<string, string> = { high: "bg-red-500", medium: "bg-yellow-400", low: "bg-green-400" };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">{dateStr}</p>
            <h1 className="text-2xl font-bold text-gray-900">{greeting}, {session.user.name?.split(" ")[0]}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{session.user.tenantName}</p>
          </div>
          {role === "operations_manager" && (
            <Link href="/jobs/new" className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm shadow-sm shrink-0">
              <IconPlus />New Job
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-8 py-6 space-y-6">
        {/* Technicians don't see the attention/quotes sections */}
        {totalAttention > 0 && !isTechnician && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <p className="text-sm font-semibold text-gray-700">Requires attention</p>
              <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">{totalAttention}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <AlertCard label="Needs Team Reply" value={needsTeamResponse}   color="bg-red-500"    bg="bg-red-50"    border="border-red-200"    text="text-red-800"    href="/jobs?pendingOn=team"    />
              <AlertCard label="Awaiting Client"  value={needsClientResponse} color="bg-amber-500"  bg="bg-amber-50"  border="border-amber-200"  text="text-amber-800"  href="/jobs?pendingOn=client"  />
              <AlertCard label="Overdue Chats"    value={overdueChats}        color="bg-orange-500" bg="bg-orange-50" border="border-orange-200" text="text-orange-800" href="/jobs?pendingOn=overdue" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
          <MetricCard label="Total Jobs"  value={totalJobs}      icon={<IconBriefcase />} accent="bg-gray-200"   href={jobsBase} />
          <MetricCard label="New"         value={newJobs}        icon={<IconSpark />}     accent="bg-blue-400"   href={`${jobsBase}?status=new`} />
          <MetricCard label="In Progress" value={inProgressJobs} icon={<IconClock />}     accent="bg-yellow-400" href={`${jobsBase}?status=in_progress`} />
          <MetricCard label="Completed"   value={completedJobs}  icon={<IconCheck />}     accent="bg-green-500"  href={`${jobsBase}?status=completed`} />
        </div>

        {totalJobs > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Job Pipeline</h2>
              <span className="text-xs text-gray-400">{totalJobs} total</span>
            </div>
            <div className="space-y-3">
              {Object.entries(statusConfig).map(([status, cfg]) => {
                const count = allJobs.filter((j) => j.jobStatus === status).length;
                if (count === 0) return null;
                const pct = Math.round((count / totalJobs) * 100);
                return (
                  <Link key={status} href={isTechnician ? jobsBase : `/jobs?status=${status}`} className="flex items-center gap-3 group">
                    <span className={`text-xs font-medium ${cfg.text} w-24 shrink-0`}>{cfg.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className={`${cfg.bar} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-6 text-right">{count}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {pendingQuotes > 0 && !isTechnician && (
          <Link href="/jobs?quoteStatus=pending" className="flex items-center gap-4 bg-purple-50 border border-purple-200 rounded-2xl px-5 py-4 hover:shadow-md transition-all group">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0"><IconChat /></div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-purple-900">{pendingQuotes} quote{pendingQuotes !== 1 ? "s" : ""} awaiting preparation</p>
              <p className="text-xs text-purple-600 mt-0.5">Jobs received but no quote sent yet</p>
            </div>
            <div className="text-purple-400 group-hover:text-purple-600 transition-colors shrink-0"><IconChevron /></div>
          </Link>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
            <Link href={jobsBase} className="text-xs text-blue-600 hover:underline font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentJobs.map((job) => {
              const thread = threadMap.get(job.id);
              const cfg = statusConfig[job.jobStatus];
              const needsReply = thread?.pendingOn === "team";
              return (
                <Link key={job.id} href={isTechnician ? `/technician/jobs/${job.id}` : `/jobs/${job.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${priorityDot[job.priority] ?? "bg-gray-300"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{job.jobNumber}</span>
                      {needsReply && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium animate-pulse">Reply needed</span>}
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{job.propertyAddress}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${cfg?.bg ?? "bg-gray-100"} ${cfg?.text ?? "text-gray-600"}`}>
                    {job.jobStatus.replace(/_/g, " ")}
                  </span>
                  <span className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0"><IconChevron /></span>
                </Link>
              );
            })}
            {recentJobs.length === 0 && (
              <div className="px-5 py-14 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3"><IconBriefcase /></div>
                <p className="text-sm font-medium text-gray-500">No jobs yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
