import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findRow, findRows } from "@/lib/sheets";
import { jsPDF } from "jspdf";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId } = session.user;

  const { threadId } = await params;
  const thread = await findRow("ChatThreads", (r) => r.id === threadId);
  if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  if (role !== "super_admin" && thread.tenantId !== tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [job, messages] = await Promise.all([
    findRow("Jobs", (r) => r.id === thread.jobId),
    findRows("Messages", (r) => r.threadId === threadId),
  ]);

  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Build PDF
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  // Header
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

  // Messages
  doc.setTextColor(0);
  for (const msg of sorted) {
    const isSystem = msg.type === "system";
    const sender = isSystem ? "System" : (msg.senderName || "Unknown");
    const time = msg.createdAt
      ? new Date(msg.createdAt).toLocaleString("en-AU", { dateStyle: "short", timeStyle: "short" })
      : "";

    // Sender + time header
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(isSystem ? 120 : 40);
    doc.text(`${sender}  ·  ${time}`, margin, y);
    y += 4;

    // Message body
    doc.setFontSize(9);
    doc.setFont("helvetica", isSystem ? "italic" : "normal");
    doc.setTextColor(isSystem ? 130 : 30);

    const lines = doc.splitTextToSize(msg.content || "(attachment)", contentW);
    for (const line of lines) {
      if (y > 270) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 4.5;
    }

    y += 3;

    if (y > 270) {
      doc.addPage();
      y = margin;
    }
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
