import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  void req;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId, assignedTenantIds } = session.user;

  let jobQ = supabaseAdmin.from("jobs").select("*");
  let threadQ = supabaseAdmin.from("chat_threads").select("response_due_time, pending_on");

  if (role !== "super_admin") {
    const accessible = Array.from(new Set([tenantId, ...(assignedTenantIds ?? [])]));
    jobQ = jobQ.in("tenant_id", accessible);
    threadQ = threadQ.in("tenant_id", accessible);
  }

  const [{ data: jobs }, { data: threads }] = await Promise.all([jobQ, threadQ]);
  const allJobs = jobs ?? [];
  const allThreads = threads ?? [];

  const now = new Date();

  // Avg quote value
  const approvedJobs = allJobs.filter((j) => j.quote_status === "approved" && j.quote_total_with_gst);
  const avgQuoteValue = approvedJobs.length > 0
    ? approvedJobs.reduce((s, j) => s + Number(j.quote_total_with_gst), 0) / approvedJobs.length
    : 0;

  // Quote approval rate
  const quotedJobs = allJobs.filter((j) => ["approved", "rejected", "sent"].includes(j.quote_status));
  const approvalRate = quotedJobs.length > 0
    ? Math.round((approvedJobs.length / quotedJobs.length) * 100)
    : 0;

  // Overdue chats
  const overdueChats = allThreads.filter(
    (t) => t.pending_on !== "none" && t.response_due_time && new Date(t.response_due_time) < now
  ).length;

  // High priority unresolved
  const highPriorityOpen = allJobs.filter(
    (j) => j.priority === "high" && !["completed", "paid"].includes(j.job_status)
  ).length;

  // Jobs by category
  const categoryMap: Record<string, number> = {};
  for (const j of allJobs) {
    const cat = j.category ?? "Other";
    categoryMap[cat] = (categoryMap[cat] ?? 0) + 1;
  }
  const byCategory = Object.entries(categoryMap)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // Conversion this month
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthJobs = allJobs.filter((j) => j.created_at && new Date(j.created_at) >= thisMonth);
  const thisMonthApproved = thisMonthJobs.filter((j) => j.quote_status === "approved").length;

  return NextResponse.json({
    avgQuoteValue: Math.round(avgQuoteValue * 100) / 100,
    approvalRate,
    overdueChats,
    highPriorityOpen,
    byCategory,
    thisMonthJobs: thisMonthJobs.length,
    thisMonthApproved,
  });
}
