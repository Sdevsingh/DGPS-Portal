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
    .select("quote_total_with_gst, quote_status, payment_status, created_at, tenant_id, company_name");

  if (role !== "super_admin") {
    const accessible = Array.from(new Set([tenantId, ...(assignedTenantIds ?? [])]));
    jobQ = jobQ.in("tenant_id", accessible);
  }

  const { data: jobs } = await jobQ;
  const allJobs = jobs ?? [];

  // Group by month (last 12 months)
  const now = new Date();
  const monthlyData: Record<string, { revenue: number; pending: number; count: number }> = {};

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyData[key] = { revenue: 0, pending: 0, count: 0 };
  }

  for (const job of allJobs) {
    if (!job.created_at) continue;
    const d = new Date(job.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyData[key]) continue;

    monthlyData[key].count++;
    const amount = Number(job.quote_total_with_gst ?? 0);
    if (job.quote_status === "approved") monthlyData[key].revenue += amount;
    if (job.quote_status === "sent") monthlyData[key].pending += amount;
  }

  const monthly = Object.entries(monthlyData).map(([month, data]) => ({
    month,
    label: new Date(month + "-01").toLocaleDateString("en-AU", { month: "short", year: "numeric" }),
    revenue: Math.round(data.revenue * 100) / 100,
    pending: Math.round(data.pending * 100) / 100,
    count: data.count,
  }));

  // Company breakdown (super admin only)
  let byCompany: Array<{ name: string; revenue: number; count: number }> = [];
  if (role === "super_admin") {
    const companyMap: Record<string, { name: string; revenue: number; count: number }> = {};
    for (const job of allJobs) {
      const k = job.company_name ?? "Unknown";
      if (!companyMap[k]) companyMap[k] = { name: k, revenue: 0, count: 0 };
      companyMap[k].count++;
      if (job.quote_status === "approved") {
        companyMap[k].revenue += Number(job.quote_total_with_gst ?? 0);
      }
    }
    byCompany = Object.values(companyMap).sort((a, b) => b.revenue - a.revenue);
  }

  return NextResponse.json({ monthly, byCompany });
}
