import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  void req;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId, assignedTenantIds } = session.user;

  let jobQ = supabaseAdmin
    .from("jobs")
    .select("id, job_number, property_address, quote_status, quote_total_with_gst, tenant_id, company_name, created_at");

  const statusFilter = req.nextUrl.searchParams.get("status");
  if (statusFilter) jobQ = jobQ.eq("quote_status", statusFilter);

  if (role !== "super_admin") {
    const accessible = Array.from(new Set([tenantId, ...(assignedTenantIds ?? [])]));
    jobQ = jobQ.in("tenant_id", accessible);
  }

  const { data: jobs } = await jobQ.order("created_at", { ascending: false });
  const allJobs = jobs ?? [];

  // Breakdown by quote_status
  const breakdown = [
    { status: "pending", label: "Pending", count: 0, total: 0 },
    { status: "sent", label: "Sent", count: 0, total: 0 },
    { status: "approved", label: "Approved", count: 0, total: 0 },
    { status: "rejected", label: "Rejected", count: 0, total: 0 },
    { status: "tech_revision_pending", label: "Revision Pending", count: 0, total: 0 },
  ];

  for (const job of allJobs) {
    const b = breakdown.find((b) => b.status === job.quote_status);
    if (b) {
      b.count++;
      b.total += Number(job.quote_total_with_gst ?? 0);
    }
  }

  return NextResponse.json({
    breakdown: breakdown.filter((b) => b.count > 0),
    jobs: statusFilter ? allJobs.map((j) => ({
      id: j.id,
      jobNumber: j.job_number,
      propertyAddress: j.property_address,
      quoteStatus: j.quote_status,
      quoteTotalWithGst: j.quote_total_with_gst ? String(j.quote_total_with_gst) : "",
      companyName: j.company_name,
      createdAt: j.created_at,
    })) : [],
  });
}
