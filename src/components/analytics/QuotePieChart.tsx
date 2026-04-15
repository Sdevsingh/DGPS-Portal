"use client";

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ChartSkeleton } from "@/components/ui/Skeleton";

type Segment = { status: string; label: string; count: number; total: number };
type Props = { onSegmentClick?: (status: string) => void };

const COLORS = ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: Segment }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg border border-white/10">
      <p className="font-semibold text-gray-200">{entry.name}</p>
      <p className="text-gray-400 mt-0.5">
        {entry.value} quote{entry.value !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

export default function QuotePieChart({ onSegmentClick }: Props) {
  const [data, setData] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/quotations")
      .then((r) => r.json())
      .then((d) => { setData(d.breakdown ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="mb-4">
          <div className="h-4 w-36 bg-gray-100 rounded-lg animate-pulse mb-1" />
          <div className="h-3 w-24 bg-gray-100 rounded-lg animate-pulse" />
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-base font-semibold text-gray-800 mb-1">Quote Breakdown</p>
        <p className="text-xs text-gray-400 mb-4">Status distribution</p>
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
          No quote data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="mb-4">
        <p className="text-base font-semibold text-gray-800">Quote Breakdown</p>
        <p className="text-xs text-gray-400 mt-0.5">Status distribution</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Pie */}
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={48}
                paddingAngle={2}
                cursor="pointer"
                onClick={(entry) =>
                  onSegmentClick?.((entry as unknown as { status: string }).status)
                }
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="shrink-0 space-y-2 pr-1">
          {data.map((seg, i) => (
            <button
              key={seg.status}
              onClick={() => onSegmentClick?.(seg.status)}
              className="flex items-center gap-2 text-left w-full hover:opacity-70 transition-opacity"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-sm text-gray-600 leading-none">{seg.label}</span>
              <span className="text-sm font-semibold text-gray-900 ml-1">{seg.count}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
