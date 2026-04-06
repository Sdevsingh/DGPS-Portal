"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Slice { name: string; value: number; color: string }

interface AiInsight {
  label: string;
  value: string;
  sub: string;
  color: "emerald" | "blue" | "amber" | "red";
}

interface Props {
  statusSlices: Slice[];
  quoteSlices: Slice[];
  totalRevenue: number;
  pendingRevenue: number;
  insights: AiInsight[];
}

// ─── Recharts v3 tooltip types ────────────────────────────────────────────────

interface TooltipEntry {
  name?: string;
  value?: number;
  payload?: { color?: string };
}
interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
}

// ─── Colors for insight cards ─────────────────────────────────────────────────

const INSIGHT_STYLE: Record<AiInsight["color"], { bg: string; border: string; value: string; sub: string; dot: string }> = {
  emerald: { bg: "bg-emerald-50",  border: "border-emerald-100", value: "text-emerald-700", sub: "text-emerald-500",  dot: "bg-emerald-400" },
  blue:    { bg: "bg-blue-50",     border: "border-blue-100",    value: "text-blue-700",    sub: "text-blue-400",    dot: "bg-blue-400"    },
  amber:   { bg: "bg-amber-50",    border: "border-amber-100",   value: "text-amber-700",   sub: "text-amber-500",   dot: "bg-amber-400"   },
  red:     { bg: "bg-red-50",      border: "border-red-100",     value: "text-red-700",     sub: "text-red-400",     dot: "bg-red-400"     },
};

// ─── Custom dark tooltip ──────────────────────────────────────────────────────

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-xl shadow-xl border border-white/10">
      <span style={{ color: item.payload?.color ?? "#fff" }}>●</span>{" "}
      {item.name}: <strong>{item.value}</strong>
    </div>
  );
}

// ─── Donut chart sub-component ────────────────────────────────────────────────

function DonutCard({ title, slices }: { title: string; slices: Slice[] }) {
  const active = slices.filter((s) => s.value > 0);
  const total = active.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{title}</p>
      {active.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-xs text-gray-300">No data yet</div>
      ) : (
        <>
          <div className="relative">
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie
                  data={active}
                  cx="50%"
                  cy="50%"
                  innerRadius={44}
                  outerRadius={62}
                  paddingAngle={2}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {active.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Centre total */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-gray-900 leading-none">{total}</span>
              <span className="text-[10px] text-gray-400 mt-0.5">total</span>
            </div>
          </div>

          <div className="space-y-1.5 mt-3">
            {active.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-gray-500">{s.name}</span>
                </div>
                <span className="font-semibold text-gray-700">{s.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function DashboardCharts({ statusSlices, quoteSlices, totalRevenue, pendingRevenue, insights }: Props) {
  return (
    <div className="space-y-4">

      {/* AI Insight cards */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Insights</span>
          <span className="flex items-center gap-1 text-[10px] font-medium text-blue-500 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">
            <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
            Auto-calculated
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {insights.map((ins, i) => {
            const s = INSIGHT_STYLE[ins.color];
            return (
              <motion.div
                key={ins.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.38, ease: "easeOut" }}
                className={`${s.bg} border ${s.border} rounded-2xl p-4`}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{ins.label}</p>
                </div>
                <p className={`text-2xl font-bold leading-none mb-1 ${s.value}`}>{ins.value}</p>
                <p className={`text-[11px] leading-snug ${s.sub}`}>{ins.sub}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
          <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider mb-1">Collected</p>
          <p className="text-xl font-bold text-emerald-700">
            ${totalRevenue.toLocaleString("en-AU", { maximumFractionDigits: 0 })}
          </p>
          <p className="text-[11px] text-emerald-400 mt-0.5">Paid invoices</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider mb-1">Pending</p>
          <p className="text-xl font-bold text-amber-700">
            ${pendingRevenue.toLocaleString("en-AU", { maximumFractionDigits: 0 })}
          </p>
          <p className="text-[11px] text-amber-400 mt-0.5">Active invoices</p>
        </div>
      </div>

      {/* Donut charts */}
      <div className="grid grid-cols-2 gap-4">
        <DonutCard title="Job Status" slices={statusSlices} />
        <DonutCard title="Quote Status" slices={quoteSlices} />
      </div>
    </div>
  );
}
