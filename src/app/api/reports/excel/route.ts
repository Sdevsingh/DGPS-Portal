import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRows, findRows } from "@/lib/sheets";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Reports are super_admin only
  if (session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden — reports are admin only" }, { status: 403 });
  }

  const [jobs, threads] = await Promise.all([
    getRows("Jobs"),
    getRows("ChatThreads"),
  ]);

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Job Summary ──────────────────────────────────────────────────
  const jobRows = jobs.map((j) => ({
    "Job ID": j.jobNumber,
    Company: j.companyName,
    Address: j.propertyAddress,
    Category: j.category,
    Priority: j.priority,
    Status: j.jobStatus,
    "Quote Status": j.quoteStatus,
    "Payment Status": j.paymentStatus,
    "Quote Subtotal": j.quoteAmount ? `$${Number(j.quoteAmount).toFixed(2)}` : "",
    "GST (10%)": j.quoteGst ? `$${Number(j.quoteGst).toFixed(2)}` : "",
    "Total incl. GST": j.quoteTotalWithGst ? `$${Number(j.quoteTotalWithGst).toFixed(2)}` : "",
    Technician: j.assignedToName ?? "",
    "Inspection Required": j.inspectionRequired === "true" ? "Yes" : "No",
    "Date Created": j.createdAt ? new Date(j.createdAt).toLocaleDateString("en-AU") : "",
    "SLA Deadline": j.slaDeadline ? new Date(j.slaDeadline).toLocaleDateString("en-AU") : "",
    Source: j.source,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(jobRows), "Job Summary");

  // ── Sheet 2: Performance ──────────────────────────────────────────────────
  const perfRows = [
    { Metric: "Total Jobs", Value: jobs.length },
    { Metric: "New Jobs", Value: jobs.filter((j) => j.jobStatus === "new").length },
    { Metric: "In Progress", Value: jobs.filter((j) => j.jobStatus === "in_progress").length },
    { Metric: "Completed Jobs", Value: jobs.filter((j) => j.jobStatus === "completed").length },
    { Metric: "Invoiced", Value: jobs.filter((j) => j.jobStatus === "invoiced").length },
    { Metric: "Paid", Value: jobs.filter((j) => j.paymentStatus === "paid").length },
    { Metric: "High Priority", Value: jobs.filter((j) => j.priority === "high").length },
    { Metric: "Quotes Sent", Value: jobs.filter((j) => j.quoteStatus === "sent").length },
    { Metric: "Quotes Approved", Value: jobs.filter((j) => j.quoteStatus === "approved").length },
    { Metric: "Quotes Pending", Value: jobs.filter((j) => j.quoteStatus === "pending").length },
    {
      Metric: "Total Revenue (approved quotes)",
      Value: `$${jobs
        .filter((j) => j.quoteStatus === "approved" && j.quoteTotalWithGst)
        .reduce((sum, j) => sum + Number(j.quoteTotalWithGst), 0)
        .toFixed(2)}`,
    },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(perfRows), "Performance");

  // ── Sheet 3: Communication ────────────────────────────────────────────────
  const threadMap = new Map(threads.map((t) => [t.jobId, t]));
  const commRows = jobs.map((j) => {
    const t = threadMap.get(j.id);
    const isOverdue = t?.responseDueTime && new Date(t.responseDueTime) < new Date();
    return {
      "Job ID": j.jobNumber,
      Address: j.propertyAddress,
      "Pending On": t?.pendingOn ?? "none",
      "Last Message": t?.lastMessage ?? "",
      "Last Message By": t?.lastMessageBy ?? "",
      "Last Message At": t?.lastMessageAt ? new Date(t.lastMessageAt).toLocaleDateString("en-AU") : "",
      "Response Due": t?.responseDueTime ? new Date(t.responseDueTime).toLocaleDateString("en-AU") : "",
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
