import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findRow, appendRow, updateRow } from "@/lib/sheets";

export async function POST(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId, id: userId, name: userName } = session.user;
  const { threadId } = await params;

  const thread = await findRow("ChatThreads", (r) => r.id === threadId);
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (role !== "super_admin" && thread.tenantId !== tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const message = await appendRow("Messages", {
    tenantId: thread.tenantId,
    threadId: threadId,
    senderId: userId,
    senderName: userName,
    senderRole: role,
    type: body.type ?? "text",
    content: body.content,
    metadata: body.metadata ? JSON.stringify(body.metadata) : "",
  });

  // Update thread pendingOn and last message
  const isClient = role === "client";
  const pendingOn = isClient ? "team" : "client";
  const lastMessageBy = isClient ? "client" : "team";

  await updateRow("ChatThreads", threadId, {
    lastMessage: body.content,
    lastMessageAt: new Date().toISOString(),
    lastMessageBy,
    pendingOn,
    lastResponseTime: new Date().toISOString(),
    responseDueTime: new Date(Date.now() + 4 * 3600000).toISOString(),
  });

  return NextResponse.json(message, { status: 201 });
}
