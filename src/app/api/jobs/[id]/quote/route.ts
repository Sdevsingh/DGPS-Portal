import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findRow, appendRow, updateRow, deleteRows } from "@/lib/sheets";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId } = session.user;
  if (role === "client" || role === "technician") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const job = await findRow("Jobs", (r) => r.id === id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role !== "super_admin" && job.tenantId !== tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const items: { description: string; quantity: number; unitPrice: number }[] = body.items ?? [];

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const gst = parseFloat((subtotal * 0.1).toFixed(2));
  const total = parseFloat((subtotal + gst).toFixed(2));

  // Clear any existing quote items for this job before saving new ones
  await deleteRows("QuoteItems", (r) => r.jobId === id);

  // Save quote items
  for (const item of items) {
    const itemTotal = parseFloat((item.quantity * item.unitPrice).toFixed(2));
    await appendRow("QuoteItems", {
      jobId: id,
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
      total: String(itemTotal),
    });
  }

  // Update job with quote amounts and status
  await updateRow("Jobs", id, {
    quoteAmount: String(subtotal),
    quoteGst: String(gst),
    quoteTotalWithGst: String(total),
    quoteStatus: "sent",
  });

  // Post quote message to chat
  const thread = await findRow("ChatThreads", (r) => r.jobId === id);
  if (thread) {
    const metadata = JSON.stringify({
      quoteItems: items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: parseFloat((item.quantity * item.unitPrice).toFixed(2)),
      })),
      subtotal,
      gst,
      total,
    });

    await appendRow("Messages", {
      tenantId: job.tenantId,
      threadId: thread.id,
      senderId: "",
      senderName: "System",
      type: "system",
      content: `Quote Sent — $${total.toFixed(2)} incl. GST`,
      metadata,
    });

    await updateRow("ChatThreads", thread.id, {
      pendingOn: "client",
      lastMessage: `Quote Sent — $${total.toFixed(2)} incl. GST`,
      lastMessageAt: new Date().toISOString(),
      lastMessageBy: "team",
      responseDueTime: new Date(Date.now() + 48 * 3600000).toISOString(),
    });
  }

  return NextResponse.json({ subtotal, gst, total }, { status: 201 });
}
