import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findRow, findRows, updateRow, appendRow } from "@/lib/sheets";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId } = session.user;
  const { id } = await params;

  const job = await findRow("Jobs", (r) => r.id === id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role !== "super_admin" && job.tenantId !== tenantId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [thread, quoteItems] = await Promise.all([
    findRow("ChatThreads", (r) => r.jobId === id),
    findRows("QuoteItems", (r) => r.jobId === id),
  ]);

  let messages: Record<string, string>[] = [];
  if (thread) {
    messages = await findRows("Messages", (r) => r.threadId === thread.id);
    messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  return NextResponse.json({ ...job, chatThread: thread ? { ...thread, messages } : null, quoteItems });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId, id: userId, name: userName } = session.user;
  const { id } = await params;

  const job = await findRow("Jobs", (r) => r.id === id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role !== "super_admin" && job.tenantId !== tenantId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  // Clients can only approve/reject quotes
  if (role === "client") {
    const allowedKeys = ["quoteStatus"];
    const hasDisallowed = Object.keys(body).some((k) => !allowedKeys.includes(k));
    if (hasDisallowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await updateRow("Jobs", id, body);

  // Post system messages for status/quote changes
  const thread = await findRow("ChatThreads", (r) => r.jobId === id);

  if (thread) {
    const statusLabels: Record<string, string> = {
      new: "Job marked as New",
      ready: "Job marked as Ready",
      in_progress: "Job Started",
      completed: "Job Completed ✅",
      invoiced: "Job Invoiced",
      paid: "Payment Received ✅",
    };

    const quoteLabels: Record<string, string> = {
      sent: "Quote Sent",
      approved: "Quote Approved ✅",
      rejected: "Quote Declined ❌",
    };

    let systemMsg = "";
    let newPendingOn = "";

    if (body.jobStatus && statusLabels[body.jobStatus]) {
      systemMsg = statusLabels[body.jobStatus];
      newPendingOn = "none";
    }

    if (body.quoteStatus && quoteLabels[body.quoteStatus]) {
      systemMsg = quoteLabels[body.quoteStatus];
      // If client approved/declined → notify team
      if (role === "client" && (body.quoteStatus === "approved" || body.quoteStatus === "rejected")) {
        newPendingOn = "team";
      } else if (body.quoteStatus === "sent") {
        newPendingOn = "client";
      }
    }

    if (systemMsg) {
      await appendRow("Messages", {
        tenantId: job.tenantId,
        threadId: thread.id,
        senderId: "",
        senderName: "System",
        type: "system",
        content: systemMsg,
        metadata: "",
      });

      if (newPendingOn) {
        await updateRow("ChatThreads", thread.id, {
          pendingOn: newPendingOn,
          lastMessage: systemMsg,
          lastMessageAt: new Date().toISOString(),
          lastMessageBy: role === "client" ? "client" : "team",
        });
      }
    }
  }

  return NextResponse.json(updated);
}
