"use client";

import { useState, useEffect, useRef, useCallback, useOptimistic, useTransition } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  type: "text" | "attachment" | "system";
  content: string;
  createdAt: string;
  sender: { id: string; name: string; role: string } | null;
  pending?: boolean;
};

type RawMessage = {
  id: string;
  type?: string;
  content?: string;
  createdAt?: string;
  created_at?: string;
  sender?: { id: string; name: string; role: string } | null;
  senderId?: string;
  sender_id?: string;
  senderName?: string;
  sender_name?: string;
  senderRole?: string;
  sender_role?: string;
  pending?: boolean;
};

function normalizeMessage(raw: RawMessage): Message {
  const sender =
    raw.sender !== undefined
      ? raw.sender
      : (raw.senderId || raw.sender_id)
      ? {
          id: raw.senderId ?? raw.sender_id ?? "",
          name: raw.senderName ?? raw.sender_name ?? "",
          role: raw.senderRole ?? raw.sender_role ?? "",
        }
      : null;

  return {
    id: raw.id,
    type: (raw.type as Message["type"]) ?? "text",
    content: raw.content ?? "",
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
    sender,
    pending: raw.pending,
  };
}

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

  const [messages, addOptimistic] = useOptimistic(
    committed,
    (state: Message[], optimistic: Message) => {
      const idx = state.findIndex((m) => m.id === optimistic.id);
      if (idx !== -1) {
        const next = [...state];
        next[idx] = optimistic;
        return next;
      }
      return [...state, optimistic];
    }
  );

  // ─── Scroll to bottom ──────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // ─── Supabase Realtime subscription ────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`thread:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const newMsg = normalizeMessage(payload.new as RawMessage);
          setCommitted((prev) => {
            // Avoid duplicates (might already be added optimistically)
            if (prev.find((m) => m.id === newMsg.id)) {
              return prev.map((m) => (m.id === newMsg.id ? { ...newMsg, pending: false } : m));
            }
            return [...prev, newMsg];
          });
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, scrollToBottom]);

  // ─── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isPending) return;

    setInput("");
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      type: "text",
      content: text,
      createdAt: new Date().toISOString(),
      sender: session?.user
        ? { id: session.user.id, name: session.user.name, role: session.user.role }
        : null,
      pending: true,
    };

    startTransition(async () => {
      addOptimistic(optimisticMsg);
      try {
        const res = await fetch(`/api/chat/${threadId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text }),
        });
        if (res.ok) {
          const saved = await res.json() as RawMessage;
          const realMsg = normalizeMessage(saved);
          setCommitted((prev) => {
            // Replace optimistic with real (real might already be there from Realtime)
            if (prev.find((m) => m.id === realMsg.id)) {
              return prev.filter((m) => m.id !== tempId).map((m) =>
                m.id === realMsg.id ? { ...realMsg, pending: false } : m
              );
            }
            return prev.filter((m) => m.id !== tempId).concat({ ...realMsg, pending: false });
          });
        } else {
          // Remove optimistic message on failure
          setCommitted((prev) => prev.filter((m) => m.id !== tempId));
          setInput(text);
        }
      } catch {
        setCommitted((prev) => prev.filter((m) => m.id !== tempId));
        setInput(text);
      }
    });
  }, [input, isPending, session, threadId, addOptimistic]);

  // ─── Keyboard shortcut ─────────────────────────────────────────────────────
  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function fmtTime(iso: string) {
    try {
      return new Date(iso).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  function fmtDate(iso: string) {
    try {
      const d = new Date(iso);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) return "Today";
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
      return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
    } catch {
      return "";
    }
  }

  // ─── Group by date ─────────────────────────────────────────────────────────
  const grouped: { date: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const d = fmtDate(msg.createdAt);
    const last = grouped[grouped.length - 1];
    if (last && last.date === d) {
      last.msgs.push(msg);
    } else {
      grouped.push({ date: d, msgs: [msg] });
    }
  }

  const myId = session?.user?.id;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {grouped.map((group) => (
          <div key={group.date}>
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wide px-1">{group.date}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            {group.msgs.map((msg) => {
              if (msg.type === "system") {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <span className="text-xs text-gray-400 bg-white border border-gray-200 rounded-full px-3 py-1 italic">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              const isMine = msg.sender?.id === myId;
              const isTeam = msg.sender?.role && msg.sender.role !== "client";

              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}>
                  <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                    {!isMine && msg.sender && (
                      <span className="text-[11px] text-gray-400 font-medium ml-1">
                        {msg.sender.name} · {(msg.sender.role || "").replace(/_/g, " ")}
                      </span>
                    )}
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMine
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : isTeam
                          ? "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
                          : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
                      } ${msg.pending ? "opacity-60" : ""}`}
                    >
                      {msg.type === "attachment" ? (
                        <AttachmentBubble content={msg.content} />
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                    <span className={`text-[10px] text-gray-400 ${isMine ? "mr-1" : "ml-1"}`}>
                      {msg.pending ? "Sending…" : fmtTime(msg.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">No messages yet — start the conversation</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-4 py-3 flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message..."
          className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
          disabled={isPending}
          data-testid="chat-message-input"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isPending}
          className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 transition-all active:scale-95"
          data-testid="chat-send-button"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function AttachmentBubble({ content }: { content: string }) {
  let url = content;
  let name = content.split("/").pop() ?? "File";
  try {
    const parsed = JSON.parse(content) as { url: string; name: string };
    url = parsed.url;
    name = parsed.name;
  } catch {
    /* not JSON */
  }
  const isPdf = name.endsWith(".pdf");
  const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(name);

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img src={url} alt={name} className="max-w-[200px] rounded-lg" />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-200 hover:text-white underline">
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isPdf ? "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" : "M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"} />
      </svg>
      {name}
    </a>
  );
}
