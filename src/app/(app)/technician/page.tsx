import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { formatJob } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  ready: "bg-purple-100 text-purple-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
};

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  ready: "Ready",
  in_progress: "In Progress",
  completed: "Completed",
  invoiced: "Invoiced",
  paid: "Paid",
};

export default async function TechnicianPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { role, tenantId, id: userId, assignedTenantIds } = session.user;
  const { status: statusFilter } = await searchParams;

  if (role !== "technician" && role !== "operations_manager" && role !== "super_admin") {
    redirect("/dashboard");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabaseAdmin.from("jobs").select("*").or("is_archived.eq.false,is_archived.is.null");

  if (role === "technician") {
    q = q.eq("tenant_id", tenantId).eq("assigned_to_id", userId);
  } else if (role === "operations_manager") {
    const accessible = Array.from(new Set([tenantId, ...(assignedTenantIds ?? [])]));
    q = q.in("tenant_id", accessible).not("job_status", "in", '("completed","paid")');
  } else {
    q = q.not("job_status", "in", '("completed","paid")');
  }

  if (statusFilter) {
    q = q.eq("job_status", statusFilter);
  }

  const { data: jobsRaw } = await q.order("created_at", { ascending: false });
  const sorted = (jobsRaw ?? []).map(formatJob).sort((a: Record<string, string>, b: Record<string, string>) => {
    const pOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return (pOrder[a.priority] ?? 1) - (pOrder[b.priority] ?? 1);
  });

  const heading = statusFilter ? (STATUS_LABEL[statusFilter] ?? "Jobs") : "My Jobs";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white px-4 py-6">
        <div className="flex items-center gap-3 mb-1">
          {statusFilter && (
            <a href="/technician" className="text-gray-400 hover:text-white text-sm">← All</a>
          )}
          <p className="text-gray-400 text-sm">Field View</p>
        </div>
        <h1 className="text-xl font-bold mt-0.5">{heading}</h1>
        <p className="text-gray-400 text-sm mt-1">{sorted.length} job{sorted.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-2xl mx-auto">
        {sorted.map((job: Record<string, string>) => (
          <div key={job.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className={`h-1 ${job.priority === "high" ? "bg-red-500" : job.priority === "medium" ? "bg-yellow-400" : "bg-green-400"}`} />
            <Link href={`/technician/jobs/${job.id}`} className="block p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-900">{job.propertyAddress}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{job.jobNumber} · {job.category}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLE[job.jobStatus] ?? "bg-gray-100 text-gray-600"}`}>
                  {job.jobStatus.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>
            </Link>
            <div className="px-4 pb-4 grid grid-cols-2 gap-2">
              <a
                href={`https://maps.apple.com/?q=${encodeURIComponent(job.propertyAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Navigate
              </a>
              <Link href={`/technician/jobs/${job.id}`} className="flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Chat &amp; Details
              </Link>
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-400 font-medium">All caught up!</p>
            <p className="text-gray-300 text-sm mt-1">No active jobs</p>
          </div>
        )}
      </div>
    </div>
  );
}
