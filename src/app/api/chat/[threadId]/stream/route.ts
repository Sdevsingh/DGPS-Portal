import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findRow } from "@/lib/sheets";
import { registerClient, unregisterClient } from "@/lib/sse";

// Never cache this route — it's a long-lived stream
export const dynamic = "force-dynamic";

const PING_INTERVAL_MS = 25_000; // 25 s — keeps proxies and browsers from closing idle connections

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { threadId } = await params;
  const { role, tenantId } = session.user;

  const thread = await findRow("ChatThreads", (r) => r.id === threadId);
  if (!thread) return new Response("Not found", { status: 404 });
  if (role !== "super_admin" && thread.tenantId !== tenantId) {
    return new Response("Forbidden", { status: 403 });
  }

  let streamController: ReadableStreamDefaultController<Uint8Array>;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  const encoder = new TextEncoder();

  function cleanup() {
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
    unregisterClient(threadId, streamController);
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;
      registerClient(threadId, controller);

      // Tell the browser the connection is live
      controller.enqueue(encoder.encode(": connected\n\n"));

      // Periodic ping — prevents proxy/browser from killing the idle stream
      pingTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          cleanup();
        }
      }, PING_INTERVAL_MS);
    },
    cancel() {
      cleanup();
    },
  });

  req.signal.addEventListener("abort", () => {
    cleanup();
    try {
      streamController.close();
    } catch {
      // already closed — ignore
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable Nginx / proxy buffering
    },
  });
}
