"use client";

import Link from "next/link";
import { motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActivityItem {
  id: string;
  jobNumber: string;
  address: string;
  status: string;
  company: string;
  priority: string;
  href: string;
  time: string;
  needsReply: boolean;
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  new:         "#3B82F6",
  ready:       "#8B5CF6",
  in_progress: "#F59E0B",
  completed:   "#10B981",
  invoiced:    "#F97316",
  paid:        "#059669",
};

const STATUS_BG: Record<string, string> = {
  new:         "bg-blue-50 text-blue-700",
  ready:       "bg-purple-50 text-purple-700",
  in_progress: "bg-amber-50 text-amber-700",
  completed:   "bg-green-50 text-green-700",
  invoiced:    "bg-orange-50 text-orange-700",
  paid:        "bg-emerald-50 text-emerald-700",
};

const PRIORITY_DOT: Record<string, string> = {
  high:   "bg-red-500",
  medium: "bg-yellow-400",
  low:    "bg-green-400",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActivityScroll({ items }: { items: ActivityItem[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="font-semibold text-gray-900">Live Activity</h2>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>
        <Link href="/jobs" className="text-xs text-blue-600 hover:underline font-medium">View all →</Link>
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-50">
        {items.map((item, i) => {
          const dotColor = STATUS_COLOR[item.status] ?? "#9CA3AF";
          const badgeCls = STATUS_BG[item.status] ?? "bg-gray-100 text-gray-600";
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.055, duration: 0.32, ease: "easeOut" }}
            >
              <Link
                href={item.href}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group"
              >
                {/* Priority dot */}
                <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[item.priority] ?? "bg-gray-300"}`} />

                {/* Left: job info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{item.jobNumber}</span>
                    {item.company && (
                      <span className="text-xs text-gray-400 truncate max-w-[140px]">{item.company}</span>
                    )}
                    {item.needsReply && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold animate-pulse">
                        Reply needed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{item.address}</p>
                </div>

                {/* Right: status + time */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full font-medium ${badgeCls}`}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
                    {item.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] text-gray-400">{item.time}</span>
                </div>

                {/* Chevron */}
                <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </motion.div>
          );
        })}

        {items.length === 0 && (
          <div className="px-5 py-14 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
}
