import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { formatMessage, formatThread } from "@/lib/db";
import { broadcastToThread } from "@/lib/sse";

function toChatMessage(row: Record<string, string>) {
  return {
    id: row.id,
    type: row.type as "text" | "attachment" | "system",
    content: row.content,
    createdAt: row.createdAt,
    sender: row.senderId ? { id: row.senderId, name: row.senderName, role: row.senderRole } : null,
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId, id: userId, email, assignedTenantIds } = session.user;
  const { threadId } = await params;

  const { data: thread } = await supabaseAdmin
    .from("chat_threads")
    .select("*")
    .eq("id", threadId)
    .single();

  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (role !== "super_admin") {
    const accessible = new Set([tenantId, ...(assignedTenantIds ?? [])]);
    if (!accessible.has(thread.tenant_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (role === "client") {
    const { data: job } = await supabaseAdmin.from("jobs").select("*").eq("id", thread.job_id).single();
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const canAccess =
      job.agent_email?.toLowerCase() === email?.toLowerCase() ||
      job.created_by_user_id === userId;
    if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const since = req.nextUrl.searchParams.get("since");

  let q = supabaseAdmin
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (since) q = q.gt("created_at", since);

  const { data: messages } = await q;
  return NextResponse.json((messages ?? []).map(formatMessage).map(toChatMessage));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId, id: userId, name: userName, assignedTenantIds } = session.user;
  const { threadId } = await params;

  const { data: thread } = await supabaseAdmin
    .from("chat_threads")
    .select("*")
    .eq("id", threadId)
    .single();

  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (role !== "super_admin") {
    const accessible = new Set([tenantId, ...(assignedTenantIds ?? [])]);
    if (!accessible.has(thread.tenant_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (role === "client") {
    const { data: job } = await supabaseAdmin.from("jobs").select("*").eq("id", thread.job_id).single();
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const canAccess =
      job.agent_email?.toLowerCase() === session.user.email?.toLowerCase() ||
      job.created_by_user_id === userId;
    if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const content: string = (body.content ?? "").trim();
  if (!content) return NextResponse.json({ error: "content is required" }, { status: 400 });

  const { data: message, error } = await supabaseAdmin
    .from("messages")
    .insert({
      tenant_id: thread.tenant_id,
      thread_id: threadId,
      sender_id: userId,
      sender_name: userName,
      sender_role: role,
      type: body.type ?? "text",
      content,
      metadata: body.metadata ?? null,
    })
    .select()
    .single();

  if (error || !message) {
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }

  const isClient = role === "client";
  const pendingOn = isClient ? "team" : "client";
  const lastMessageBy = isClient ? "client" : "team";

  await supabaseAdmin.from("chat_threads").update({
    last_message: content,
    last_message_at: new Date().toISOString(),
    last_message_by: lastMessageBy,
    pending_on: pendingOn,
    last_response_time: new Date().toISOString(),
    response_due_time: new Date(Date.now() + 4 * 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", threadId);

  const formatted = formatMessage(message);

  // Also broadcast via SSE for backward compat / non-Realtime clients
  broadcastToThread(threadId, {
    id: formatted.id,
    type: formatted.type,
    content: formatted.content,
    createdAt: formatted.createdAt,
    sender: userId ? { id: userId, name: userName, role } : null,
  });

  return NextResponse.json(toChatMessage(formatted), { status: 201 });
}
