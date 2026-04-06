"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { ChartSkeleton } from "@/components/ui/Skeleton";

type MonthData = { month: string; label: string; revenue: number; pending: number; count: number };
type Props = { onMonthClick?: (month: string) => void };

interface TooltipEntry {
  dataKey?: string | number;
  name?: string | number;
  value?: number;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg border border-white/10">
      <p className="font-semibold text-gray-200 mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-gray-400">{p.name}:</span>
          <span className="font-medium">${Number(p.value ?? 0).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </p>
      ))}
    </div>
  );
}

export default function RevenueBarChart({ onMonthClick }: Props) {
  const [data, setData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/revenue")
      .then((r) => r.json())
      .then((d) => { setData(d.monthly ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="mb-4">
          <div className="h-4 w-32 bg-gray-100 rounded-lg animate-pulse mb-1" />
          <div className="h-3 w-20 bg-gray-100 rounded-lg animate-pulse" />
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="mb-4">
        <p className="text-base font-semibold text-gray-800">Revenue Overview</p>
        <p className="text-xs text-gray-400 mt-0.5">Monthly revenue vs pending</p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F9FAFB" }} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "#6B7280", paddingTop: 12 }}
            iconType="circle"
            iconSize={8}
          />
          <Bar
            dataKey="revenue"
            name="Revenue"
            fill="#10B981"
            radius={[4, 4, 0, 0]}
            cursor="pointer"
            onClick={(d) => onMonthClick?.((d as unknown as { month: string }).month)}
          />
          <Bar
            dataKey="pending"
            name="Pending"
            fill="#E5E7EB"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
