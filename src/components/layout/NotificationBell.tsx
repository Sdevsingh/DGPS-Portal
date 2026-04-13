"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import type { Notification } from "@/app/api/notifications/route";

const SEEN_KEY = "dgps_seen_notifications";
const SEEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const TYPE_ICON: Record<string, { icon: string; color: string; bg: string }> = {
  chat_reply:     { icon: "💬", color: "text-red-600",    bg: "bg-red-50" },
  overdue:        { icon: "⏰", color: "text-orange-600", bg: "bg-orange-50" },
  pending_quote:  { icon: "📋", color: "text-purple-600", bg: "bg-purple-50" },
  job_assigned:   { icon: "🔧", color: "text-blue-600",   bg: "bg-blue-50" },
  client_message: { icon: "💬", color: "text-blue-600",   bg: "bg-blue-50" },
};

function timeAgo(dateStr: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Load seen IDs from localStorage, purging entries older than TTL
function loadSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed: Record<string, number> = JSON.parse(raw);
    const now = Date.now();
    const valid = new Set<string>();
    for (const [id, ts] of Object.entries(parsed)) {
      if (now - ts < SEEN_TTL_MS) valid.add(id);
    }
    return valid;
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>) {
  try {
    const now = Date.now();
    const obj: Record<string, number> = {};
    for (const id of ids) obj[id] = now;
    localStorage.setItem(SEEN_KEY, JSON.stringify(obj));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  // Load seen IDs from localStorage on mount
  useEffect(() => {
    setSeenIds(loadSeenIds());
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      if (!document.hidden) fetchNotifications();
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markSeen = useCallback((id: string) => {
    setSeenIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveSeenIds(next);
      return next;
    });
  }, []);

  const markAllSeen = useCallback(() => {
    setSeenIds((prev) => {
      const next = new Set(prev);
      for (const n of notifications) next.add(n.id);
      saveSeenIds(next);
      return next;
    });
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !seenIds.has(n.id)).length;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-12 left-0 w-80 max-w-[calc(100vw-1rem)] bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={markAllSeen}
                  className="text-[11px] text-gray-400 hover:text-blue-600 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {loading && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">Loading…</div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-2xl mb-2">🎉</p>
                <p className="text-sm font-medium text-gray-500">All caught up!</p>
                <p className="text-xs text-gray-400 mt-0.5">No pending actions</p>
              </div>
            )}
            {notifications.map((n) => {
              const style = TYPE_ICON[n.type] ?? { icon: "•", color: "text-gray-500", bg: "bg-gray-50" };
              const isSeen = seenIds.has(n.id);
              return (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => { markSeen(n.id); setOpen(false); }}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group ${isSeen ? "opacity-60" : ""}`}
                >
                  <div className={`w-8 h-8 ${style.bg} rounded-xl flex items-center justify-center shrink-0 text-sm`}>
                    {style.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-xs font-semibold ${style.color}`}>{n.title}</p>
                      {!isSeen && <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-600 truncate mt-0.5">{n.body}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(n.at)}</p>
                  </div>
                  <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 shrink-0 mt-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
              <Link href="/jobs" onClick={() => setOpen(false)} className="text-xs text-blue-600 font-medium hover:underline">
                View all jobs →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
