/**
 * Server-Sent Events (SSE) manager.
 *
 * Keeps a per-thread registry of open SSE stream controllers.
 * When a new chat message is saved, call broadcastToThread() to
 * push it to every browser tab watching that thread — no separate
 * Socket.io process needed.
 *
 * Works because Next.js (next start / Railway) runs as a single
 * long-lived Node.js process, so module-level state is shared
 * across all route handlers in that process.
 */

type SSEController = ReadableStreamDefaultController<Uint8Array>;

// threadId → set of open stream controllers
const clients = new Map<string, Set<SSEController>>();

export function registerClient(threadId: string, controller: SSEController): void {
  if (!clients.has(threadId)) clients.set(threadId, new Set());
  clients.get(threadId)!.add(controller);
}

export function unregisterClient(threadId: string, controller: SSEController): void {
  const set = clients.get(threadId);
  if (!set) return;
  set.delete(controller);
  if (set.size === 0) clients.delete(threadId);
}

export function broadcastToThread(threadId: string, data: object): void {
  const set = clients.get(threadId);
  if (!set || set.size === 0) return;

  const payload = new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);

  for (const controller of set) {
    try {
      controller.enqueue(payload);
    } catch {
      // Stream was closed — clean it up
      set.delete(controller);
    }
  }
}
