import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { registerClient, unregisterClient } from "@/lib/sse";

export const dynamic = "force-dynamic";

const PING_INTERVAL_MS = 25_000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { threadId } = await params;
  const { role, tenantId, id: userId, email, assignedTenantIds } = session.user;

  const { data: thread } = await supabaseAdmin
    .from("chat_threads")
    .select("*")
    .eq("id", threadId)
    .single();

  if (!thread) return new Response("Not found", { status: 404 });

  if (role !== "super_admin") {
    const accessible = new Set([tenantId, ...(assignedTenantIds ?? [])]);
    if (!accessible.has(thread.tenant_id)) return new Response("Forbidden", { status: 403 });
  }

  if (role === "client") {
    const { data: job } = await supabaseAdmin.from("jobs").select("*").eq("id", thread.job_id).single();
    if (!job) return new Response("Not found", { status: 404 });
    const canAccess =
      job.agent_email?.toLowerCase() === email?.toLowerCase() ||
      job.created_by_user_id === userId;
    if (!canAccess) return new Response("Forbidden", { status: 403 });
  }

  let streamController: ReadableStreamDefaultController<Uint8Array>;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  const encoder = new TextEncoder();

  function cleanup() {
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
    unregisterClient(threadId, streamController);
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;
      registerClient(threadId, controller);
      controller.enqueue(encoder.encode(": connected\n\n"));
      pingTimer = setInterval(() => {
        try { controller.enqueue(encoder.encode(": ping\n\n")); }
        catch { cleanup(); }
      }, PING_INTERVAL_MS);
    },
    cancel() { cleanup(); },
  });

  req.signal.addEventListener("abort", () => {
    cleanup();
    try { streamController.close(); } catch { /* ignore */ }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
