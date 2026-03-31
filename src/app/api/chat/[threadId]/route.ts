import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findRow, findRows, appendRow, updateRow } from "@/lib/sheets";
import { broadcastToThread } from "@/lib/sse";

/**
 * GET /api/chat/[threadId]?since=ISO_TIMESTAMP
 * Returns all messages in this thread after the given timestamp.
 * Used by ChatPanel to backfill missed messages after an SSE reconnect.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId } = session.user;
  const { threadId } = await params;

  const thread = await findRow("ChatThreads", (r) => r.id === threadId);
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role !== "super_admin" && thread.tenantId !== tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const since = req.nextUrl.searchParams.get("since");
  const sinceTime = since ? new Date(since).getTime() : 0;

  const messages = await findRows("Messages", (r) => {
    if (r.threadId !== threadId) return false;
    if (sinceTime && new Date(r.createdAt).getTime() <= sinceTime) return false;
    return true;
  });

  messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return NextResponse.json(messages);
}

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

  const content: string = (body.content ?? "").trim();
  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  let message: Record<string, string>;
  try {
    message = await appendRow("Messages", {
      tenantId: thread.tenantId,
      threadId: threadId,
      senderId: userId,
      senderName: userName,
      senderRole: role,
      type: body.type ?? "text",
      content,
      metadata: body.metadata ? JSON.stringify(body.metadata) : "",
    });
  } catch (err) {
    console.error("[chat POST] appendRow failed:", err);
    return NextResponse.json({ error: "Failed to save message — please try again" }, { status: 500 });
  }

  // Update thread pendingOn and last message (non-fatal if this fails)
  const isClient = role === "client";
  const pendingOn = isClient ? "team" : "client";
  const lastMessageBy = isClient ? "client" : "team";

  try {
    await updateRow("ChatThreads", threadId, {
      lastMessage: content,
      lastMessageAt: new Date().toISOString(),
      lastMessageBy,
      pendingOn,
      lastResponseTime: new Date().toISOString(),
      responseDueTime: new Date(Date.now() + 4 * 3600000).toISOString(),
    });
  } catch (err) {
    console.error("[chat POST] updateRow ChatThreads failed (non-fatal):", err);
  }

  // Push to every browser tab watching this thread in real-time
  broadcastToThread(threadId, {
    id: message.id,
    type: message.type,
    content: message.content,
    createdAt: message.createdAt,
    sender: userId
      ? { id: userId, name: userName, role }
      : null,
  });

  return NextResponse.json(message, { status: 201 });
}
