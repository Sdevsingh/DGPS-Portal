import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { formatThread, formatJob, formatMessage } from "@/lib/db";
import { jsPDF } from "jspdf";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId, assignedTenantIds } = session.user;
  const { threadId } = await params;

  const { data: threadData } = await supabaseAdmin
    .from("chat_threads")
    .select("*")
    .eq("id", threadId)
    .single();

  if (!threadData) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

  if (role !== "super_admin") {
    const accessible = new Set([tenantId, ...(assignedTenantIds ?? [])]);
    if (!accessible.has(threadData.tenant_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const thread = formatThread(threadData);

  const [{ data: jobData }, { data: messagesData }] = await Promise.all([
    supabaseAdmin.from("jobs").select("*").eq("id", thread.jobId).single(),
    supabaseAdmin
      .from("messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true }),
  ]);

  const job = jobData ? formatJob(jobData) : null;
  const messages = (messagesData ?? []).map(formatMessage);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Job Chat Transcript", margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  if (job) {
    doc.text(`${job.jobNumber} — ${job.propertyAddress}`, margin, y);
    y += 5;
    doc.text(`Category: ${job.category}   Status: ${job.jobStatus}`, margin, y);
    y += 5;
  }
  doc.text(`Exported: ${new Date().toLocaleString("en-AU")}`, margin, y);
  y += 3;

  doc.setDrawColor(220);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  doc.setTextColor(0);
  for (const msg of messages) {
    const isSystem = msg.type === "system";
    const sender = isSystem ? "System" : (msg.senderName || "Unknown");
    const time = msg.createdAt
      ? new Date(msg.createdAt).toLocaleString("en-AU", { dateStyle: "short", timeStyle: "short" })
      : "";

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(isSystem ? 120 : 40);
    doc.text(`${sender}  ·  ${time}`, margin, y);
    y += 4;

    doc.setFontSize(9);
    doc.setFont("helvetica", isSystem ? "italic" : "normal");
    doc.setTextColor(isSystem ? 130 : 30);

    const lines = doc.splitTextToSize(msg.content || "(attachment)", contentW);
    for (const line of lines) {
      if (y > 270) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += 4.5;
    }
    y += 3;
    if (y > 270) { doc.addPage(); y = margin; }
  }

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  const filename = job
    ? `chat-${job.jobNumber}-${new Date().toISOString().slice(0, 10)}.pdf`
    : `chat-${threadId}.pdf`;

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
