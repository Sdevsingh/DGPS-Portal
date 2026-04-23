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

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Run all queries in parallel with only the columns we need
  const [
    { data: approvedJobs },
    { data: quotedJobs },
    { data: overdueThreads },
    { data: highPriorityJobs },
    { data: allJobsForCategory },
    { data: thisMonthJobs },
    { data: thisMonthApproved },
  ] = await Promise.all([
    (() => {
      let q = supabaseAdmin.from("jobs").select("quote_total_with_gst").eq("quote_status", "approved").not("quote_total_with_gst", "is", null).or("is_archived.eq.false,is_archived.is.null");
      if (accessible) q = q.in("tenant_id", accessible);
      return q;
    })(),
    (() => {
      let q = supabaseAdmin.from("jobs").select("id").in("quote_status", ["approved", "rejected", "sent"]).or("is_archived.eq.false,is_archived.is.null");
      if (accessible) q = q.in("tenant_id", accessible);
      return q;
    })(),
    (() => {
      let q = supabaseAdmin.from("chat_threads").select("id").neq("pending_on", "none").not("response_due_time", "is", null).lt("response_due_time", now.toISOString());
      if (accessible) q = q.in("tenant_id", accessible);
      return q;
    })(),
    (() => {
      let q = supabaseAdmin.from("jobs").select("id").eq("priority", "high").not("job_status", "in", '("completed","paid")').or("is_archived.eq.false,is_archived.is.null");
      if (accessible) q = q.in("tenant_id", accessible);
      return q;
    })(),
    (() => {
      let q = supabaseAdmin.from("jobs").select("category").or("is_archived.eq.false,is_archived.is.null");
      if (accessible) q = q.in("tenant_id", accessible);
      return q;
    })(),
    (() => {
      let q = supabaseAdmin.from("jobs").select("id").gte("created_at", thisMonthStart).or("is_archived.eq.false,is_archived.is.null");
      if (accessible) q = q.in("tenant_id", accessible);
      return q;
    })(),
    (() => {
      let q = supabaseAdmin.from("jobs").select("id").eq("quote_status", "approved").gte("created_at", thisMonthStart).or("is_archived.eq.false,is_archived.is.null");
      if (accessible) q = q.in("tenant_id", accessible);
      return q;
    })(),
  ]);

  const approved = approvedJobs ?? [];
  const avgQuoteValue = approved.length > 0
    ? approved.reduce((s, j) => s + Number(j.quote_total_with_gst), 0) / approved.length
    : 0;

  const approvalRate = (quotedJobs?.length ?? 0) > 0
    ? Math.round((approved.length / (quotedJobs?.length ?? 1)) * 100)
    : 0;

  const categoryMap: Record<string, number> = {};
  for (const j of allJobsForCategory ?? []) {
    const cat = j.category ?? "Other";
    categoryMap[cat] = (categoryMap[cat] ?? 0) + 1;
  }
  const byCategory = Object.entries(categoryMap)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    avgQuoteValue: Math.round(avgQuoteValue * 100) / 100,
    approvalRate,
    overdueChats: overdueThreads?.length ?? 0,
    highPriorityOpen: highPriorityJobs?.length ?? 0,
    byCategory,
    thisMonthJobs: thisMonthJobs?.length ?? 0,
    thisMonthApproved: thisMonthApproved?.length ?? 0,
  });
}
