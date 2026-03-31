"use client";

import { useState, useEffect, useRef, useCallback, useOptimistic, useTransition } from "react";
import { useSession } from "next-auth/react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  type: "text" | "attachment" | "system";
  content: string;
  createdAt: string;
  sender: { id: string; name: string; role: string } | null;
  pending?: boolean; // true only for optimistic messages
};

type Props = {
  threadId: string;
  jobId: string;
  initialMessages: Message[];
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatPanel({ threadId, initialMessages }: Props) {
  const { data: session } = useSession();
  const [committed, setCommitted] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // useOptimistic: layer pending messages on top of committed ones
  const [messages, addOptimistic] = useOptimistic(
    committed,
    (state: Message[], optimistic: Message) => {
      // Replace temp message with real one (same id) or append
      const idx = state.findIndex((m) => m.id === optimistic.id);
      if (idx !== -1) {
        const next = [...state];
        next[idx] = optimistic;
        return next;
      }
      return [...state, optimistic];
    }
  );

  // Track the timestamp of the last message we've seen — used for backfill on reconnect
  const lastSeenAtRef = useRef<string>(
    initialMessages.length > 0
      ? initialMessages[initialMessages.length - 1].createdAt
      : new Date(0).toISOString()
  );

  // ─── SSE: receive messages from other users in real-time ──────────────────
  useEffect(() => {
    let es: EventSource;

    function connect() {
      es = new EventSource(`/api/chat/${threadId}/stream`);

      es.onmessage = (e: MessageEvent<string>) => {
        // SSE comment lines (keepalive pings) have no data — skip them
        if (!e.data || e.data.startsWith(":")) return;

        const incoming: Message = JSON.parse(e.data);
        lastSeenAtRef.current = incoming.createdAt;
        setCommitted((prev) => {
          if (prev.find((m) => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
      };

      es.onerror = () => {
        // Browser will auto-reconnect SSE. When it does, backfill any
        // messages we missed while the connection was down.
        es.addEventListener("open", () => backfill(), { once: true });
      };
    }

    async function backfill() {
      try {
        const res = await fetch(
          `/api/chat/${threadId}?since=${encodeURIComponent(lastSeenAtRef.current)}`
        );
        if (!res.ok) return;
        const missed: Message[] = await res.json();
        if (missed.length === 0) return;
        setCommitted((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = missed.filter((m) => !existingIds.has(m.id));
          if (fresh.length === 0) return prev;
          const last = fresh[fresh.length - 1];
          lastSeenAtRef.current = last.createdAt;
          return [...prev, ...fresh];
        });
      } catch {
        // Network still down — next reconnect will try again
      }
    }

    connect();
    return () => es?.close();
  }, [threadId]);

  // ─── Auto-scroll to bottom on new messages ────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Send ─────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const content = input.trim();
      if (!content || isPending) return;

      setInput("");

      const tempId = `temp-${crypto.randomUUID()}`;
      const tempMsg: Message = {
        id: tempId,
        type: "text",
        content,
        createdAt: new Date().toISOString(),
        sender: session?.user
          ? { id: session.user.id, name: session.user.name, role: session.user.role }
          : null,
        pending: true,
      };

      // Show immediately via useOptimistic (instant feedback)
      startTransition(async () => {
        addOptimistic(tempMsg);

        try {
          const res = await fetch(`/api/chat/${threadId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, type: "text" }),
          });

          if (res.ok) {
            const saved: Message = await res.json();
            // Commit the real message — replaces the optimistic temp entry
            setCommitted((prev) => {
              const withoutTemp = prev.filter((m) => m.id !== tempId);
              if (withoutTemp.find((m) => m.id === saved.id)) return withoutTemp;
              return [...withoutTemp, saved];
            });
          } else {
            // Revert — remove the temp message and restore input
            setCommitted((prev) => prev.filter((m) => m.id !== tempId));
            setInput(content);
          }
        } catch {
          setCommitted((prev) => prev.filter((m) => m.id !== tempId));
          setInput(content);
        }
      });

      // Keep focus on input after send
      inputRef.current?.focus();
    },
    [input, isPending, threadId, session, addOptimistic]
  );

  // ─── Keyboard: Enter to send ──────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(e as unknown as React.FormEvent);
      }
    },
    [sendMessage]
  );

  const myId = session?.user?.id;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => {
          if (msg.type === "system") {
            return <SystemMessage key={msg.id} content={msg.content} />;
          }
          const isMe = msg.sender?.id === myId;
          return (
            <ChatBubble key={msg.id} msg={msg} isMe={isMe} />
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="border-t border-gray-200 px-4 py-3 bg-white"
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            autoComplete="off"
            className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
          />
          <button
            type="submit"
            disabled={!input.trim() || isPending}
            className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-colors shrink-0"
            aria-label="Send message"
          >
            <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SystemMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-center">
      <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
        {content}
      </span>
    </div>
  );
}

function ChatBubble({ msg, isMe }: { msg: Message; isMe: boolean }) {
  const time = msg.pending
    ? "Sending…"
    : new Date(msg.createdAt).toLocaleTimeString("en-AU", {
        hour: "2-digit",
        minute: "2-digit",
      });

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
        {!isMe && msg.sender && (
          <span className="text-xs text-gray-400 px-1">{msg.sender.name}</span>
        )}
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition-opacity duration-150 ${
            isMe
              ? `bg-blue-600 text-white rounded-br-md ${msg.pending ? "opacity-60" : "opacity-100"}`
              : "bg-white border border-gray-200 text-gray-900 rounded-bl-md shadow-sm"
          }`}
        >
          {msg.content}
        </div>
        <span className="text-xs text-gray-400 px-1">{time}</span>
      </div>
    </div>
  );
}
