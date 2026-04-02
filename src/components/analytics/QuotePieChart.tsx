"use client";

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

type Segment = { status: string; label: string; count: number; total: number };

const COLORS = ["#3b82f6", "#6366f1", "#10b981", "#f59e0b", "#ef4444"];

type Props = { onSegmentClick?: (status: string) => void };

export default function QuotePieChart({ onSegmentClick }: Props) {
  const [data, setData] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/quotations")
      .then((r) => r.json())
      .then((d) => {
        setData(d.breakdown ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  if (data.length === 0) return <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No quote data</div>;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={100}
          cursor="pointer"
          onClick={(entry) => onSegmentClick?.((entry as unknown as { status: string }).status)}
          label={(props) => `${(props as unknown as { label: string; percent: number }).label} (${Math.round(((props as unknown as { percent: number }).percent) * 100)}%)`}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value, name) => [value, name]} />
      </PieChart>
    </ResponsiveContainer>
  );
}
