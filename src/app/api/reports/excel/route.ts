import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  void req;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden — reports are admin only" }, { status: 403 });
  }

  const [{ data: jobs }, { data: threads }] = await Promise.all([
    supabaseAdmin.from("jobs").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("chat_threads").select("*"),
  ]);

  const wb = XLSX.utils.book_new();

  const jobRows = (jobs ?? []).map((j) => ({
    "Job ID": j.job_number,
    Company: j.company_name,
    Address: j.property_address,
    Category: j.category,
    Priority: j.priority,
    Status: j.job_status,
    "Quote Status": j.quote_status,
    "Payment Status": j.payment_status,
    "Quote Subtotal": j.quote_amount ? `$${Number(j.quote_amount).toFixed(2)}` : "",
    "GST (10%)": j.quote_gst ? `$${Number(j.quote_gst).toFixed(2)}` : "",
    "Total incl. GST": j.quote_total_with_gst ? `$${Number(j.quote_total_with_gst).toFixed(2)}` : "",
    Technician: j.assigned_to_name ?? "",
    "Inspection Required": j.inspection_required === "required" ? "Yes" : j.inspection_required === "done" ? "Done" : "No",
    "Date Created": j.created_at ? new Date(j.created_at).toLocaleDateString("en-AU") : "",
    "SLA Deadline": j.sla_deadline ? new Date(j.sla_deadline).toLocaleDateString("en-AU") : "",
    Source: j.source,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(jobRows), "Job Summary");

  const allJobs = jobs ?? [];
  const perfRows = [
    { Metric: "Total Jobs", Value: allJobs.length },
    { Metric: "New Jobs", Value: allJobs.filter((j) => j.job_status === "new").length },
    { Metric: "In Progress", Value: allJobs.filter((j) => j.job_status === "in_progress").length },
    { Metric: "Completed Jobs", Value: allJobs.filter((j) => j.job_status === "completed").length },
    { Metric: "Invoiced", Value: allJobs.filter((j) => j.job_status === "invoiced").length },
    { Metric: "Paid", Value: allJobs.filter((j) => j.payment_status === "paid").length },
    { Metric: "High Priority", Value: allJobs.filter((j) => j.priority === "high").length },
    { Metric: "Quotes Sent", Value: allJobs.filter((j) => j.quote_status === "sent").length },
    { Metric: "Quotes Approved", Value: allJobs.filter((j) => j.quote_status === "approved").length },
    {
      Metric: "Total Revenue (approved quotes)",
      Value: `$${allJobs
        .filter((j) => j.quote_status === "approved" && j.quote_total_with_gst)
        .reduce((sum, j) => sum + Number(j.quote_total_with_gst), 0)
        .toFixed(2)}`,
    },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(perfRows), "Performance");

  const threadMap = new Map((threads ?? []).map((t) => [t.job_id, t]));
  const commRows = (jobs ?? []).map((j) => {
    const t = threadMap.get(j.id);
    const isOverdue = t?.response_due_time && new Date(t.response_due_time) < new Date();
    return {
      "Job ID": j.job_number,
      Address: j.property_address,
      "Pending On": t?.pending_on ?? "none",
      "Last Message": t?.last_message ?? "",
      "Last Message By": t?.last_message_by ?? "",
      "Last Message At": t?.last_message_at ? new Date(t.last_message_at).toLocaleDateString("en-AU") : "",
      "Response Due": t?.response_due_time ? new Date(t.response_due_time).toLocaleDateString("en-AU") : "",
      Overdue: isOverdue ? "Yes" : "No",
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(commRows), "Communication");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="dgps-report-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
