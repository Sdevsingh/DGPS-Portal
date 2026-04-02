import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  void req;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId, assignedTenantIds } = session.user;

  let jobQ = supabaseAdmin.from("jobs").select("job_status, quote_status, payment_status, quote_total_with_gst, tenant_id, created_at, priority");

  if (role !== "super_admin") {
    const accessible = Array.from(new Set([tenantId, ...(assignedTenantIds ?? [])]));
    jobQ = jobQ.in("tenant_id", accessible);
  }

  const { data: jobs } = await jobQ;
  const allJobs = jobs ?? [];

  const total = allJobs.length;
  const newJobs = allJobs.filter((j) => j.job_status === "new").length;
  const inProgress = allJobs.filter((j) => j.job_status === "in_progress").length;
  const completed = allJobs.filter((j) => j.job_status === "completed").length;
  const invoiced = allJobs.filter((j) => j.job_status === "invoiced").length;
  const paid = allJobs.filter((j) => j.payment_status === "paid").length;

  const approvedRevenue = allJobs
    .filter((j) => j.quote_status === "approved" && j.quote_total_with_gst)
    .reduce((sum, j) => sum + Number(j.quote_total_with_gst ?? 0), 0);

  const pendingRevenue = allJobs
    .filter((j) => j.quote_status === "sent" && j.quote_total_with_gst)
    .reduce((sum, j) => sum + Number(j.quote_total_with_gst ?? 0), 0);

  // Status breakdown for chart
  const statusBreakdown = [
    { status: "new", count: newJobs, label: "New" },
    { status: "in_progress", count: inProgress, label: "In Progress" },
    { status: "completed", count: completed, label: "Completed" },
    { status: "invoiced", count: invoiced, label: "Invoiced" },
    { status: "paid", count: paid, label: "Paid" },
  ];

  // Priority breakdown
  const priorityBreakdown = [
    { priority: "high", count: allJobs.filter((j) => j.priority === "high").length },
    { priority: "medium", count: allJobs.filter((j) => j.priority === "medium").length },
    { priority: "low", count: allJobs.filter((j) => j.priority === "low").length },
  ];

  return NextResponse.json({
    total,
    newJobs,
    inProgress,
    completed,
    invoiced,
    paid,
    approvedRevenue,
    pendingRevenue,
    statusBreakdown,
    priorityBreakdown,
  });
}
