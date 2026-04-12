import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  void req;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId, assignedTenantIds } = session.user;

  const accessible = role !== "super_admin"
    ? Array.from(new Set([tenantId, ...(assignedTenantIds ?? [])]))
    : null;

  // Run all counts in parallel — only fetch what each query needs
  const [
    { data: statusRows },
    { data: priorityRows },
    { data: approvedRows },
    { data: pendingRows },
    { data: paidRows },
  ] = await Promise.all([
    (() => {
      let q = supabaseAdmin.from("jobs").select("job_status");
      if (accessible) q = q.in("tenant_id", accessible);
      return q;
    })(),
    (() => {
      let q = supabaseAdmin.from("jobs").select("priority");
      if (accessible) q = q.in("tenant_id", accessible);
      return q;
    })(),
    (() => {
      let q = supabaseAdmin.from("jobs").select("quote_total_with_gst").eq("quote_status", "approved").not("quote_total_with_gst", "is", null);
      if (accessible) q = q.in("tenant_id", accessible);
      return q;
    })(),
    (() => {
      let q = supabaseAdmin.from("jobs").select("quote_total_with_gst").eq("quote_status", "sent").not("quote_total_with_gst", "is", null);
      if (accessible) q = q.in("tenant_id", accessible);
      return q;
    })(),
    (() => {
      let q = supabaseAdmin.from("jobs").select("id").eq("payment_status", "paid");
      if (accessible) q = q.in("tenant_id", accessible);
      return q;
    })(),
  ]);

  const statuses = statusRows ?? [];
  const total = statuses.length;
  const newJobs = statuses.filter((j) => j.job_status === "new").length;
  const inProgress = statuses.filter((j) => j.job_status === "in_progress").length;
  const completed = statuses.filter((j) => j.job_status === "completed").length;
  const invoiced = statuses.filter((j) => j.job_status === "invoiced").length;
  const paid = paidRows?.length ?? 0;

  const approvedRevenue = (approvedRows ?? []).reduce((sum, j) => sum + Number(j.quote_total_with_gst ?? 0), 0);
  const pendingRevenue = (pendingRows ?? []).reduce((sum, j) => sum + Number(j.quote_total_with_gst ?? 0), 0);

  const priorities = priorityRows ?? [];
  const statusBreakdown = [
    { status: "new", count: newJobs, label: "New" },
    { status: "in_progress", count: inProgress, label: "In Progress" },
    { status: "completed", count: completed, label: "Completed" },
    { status: "invoiced", count: invoiced, label: "Invoiced" },
    { status: "paid", count: paid, label: "Paid" },
  ];

  const priorityBreakdown = [
    { priority: "high", count: priorities.filter((j) => j.priority === "high").length },
    { priority: "medium", count: priorities.filter((j) => j.priority === "medium").length },
    { priority: "low", count: priorities.filter((j) => j.priority === "low").length },
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
