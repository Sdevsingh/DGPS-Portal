"use client";

import { motion } from "framer-motion";

type Props = {
  title: string;
  value: string | number;
  description: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
};

const TREND_STYLE = {
  up:      { color: "text-emerald-500", symbol: "↑" },
  down:    { color: "text-red-500",     symbol: "↓" },
  neutral: { color: "text-gray-400",   symbol: "→" },
};

export default function InsightCard({ title, value, description, icon, trend }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
      className="bg-white border border-gray-100 rounded-2xl p-5 flex items-start gap-4 shadow-sm"
    >
      {icon && (
        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 text-gray-400 border border-gray-100">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          {title}
        </p>
        <div className="flex items-end gap-2">
          <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
          {trend && (
            <span className={`text-xs font-semibold pb-0.5 ${TREND_STYLE[trend].color}`}>
              {TREND_STYLE[trend].symbol}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}
