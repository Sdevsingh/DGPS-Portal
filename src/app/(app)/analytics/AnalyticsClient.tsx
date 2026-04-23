"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import KpiCard from "@/components/analytics/KpiCard";
import InsightCard from "@/components/analytics/InsightCard";

const QuotePieChart = dynamic(() => import("@/components/analytics/QuotePieChart"), { ssr: false });
const RevenueBarChart = dynamic(() => import("@/components/analytics/RevenueBarChart"), { ssr: false });

type OverviewData = {
  total: number; newJobs: number; inProgress: number; completed: number; invoiced: number; paid: number;
  approvedRevenue: number; pendingRevenue: number;
};
type InsightsData = {
  avgQuoteValue: number; approvalRate: number; overdueChats: number;
  highPriorityOpen: number; byCategory: { category: string; count: number }[];
  thisMonthJobs: number; thisMonthApproved: number;
};

export default function AnalyticsClient() {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "revenue" | "quotations" | "insights">("overview");
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics/overview").then((r) => r.json()),
      fetch("/api/analytics/insights").then((r) => r.json()),
    ]).then(([ov, ins]) => {
      setOverview(ov);
      setInsights(ins);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "revenue", label: "Revenue" },
    { key: "quotations", label: "Quotations" },
    { key: "insights", label: "Insights" },
  ] as const;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-0.5">Performance metrics and insights</p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            data-testid={`analytics-tab-${t.key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {tab === "overview" && overview && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard title="Total Jobs" value={overview.total} color="blue" data-testid="kpi-total" />
                <KpiCard title="In Progress" value={overview.inProgress} color="orange" />
                <KpiCard title="Completed" value={overview.completed} color="green" />
                <KpiCard title="Revenue" value={`$${overview.approvedRevenue.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} color="green" data-testid="kpi-revenue" />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard title="New" value={overview.newJobs} color="blue" />
                <KpiCard title="Invoiced" value={overview.invoiced} color="orange" />
                <KpiCard title="Paid" value={overview.paid} color="green" />
                <KpiCard title="Pending Revenue" value={`$${overview.pendingRevenue.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} color="purple" />
              </div>
            </div>
          )}

          {tab === "revenue" && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-gray-900 mb-4">Revenue by Month (last 12 months)</h2>
                <RevenueBarChart onMonthClick={(month) => console.log("Month clicked:", month)} />
              </div>
            </div>
          )}

          {tab === "quotations" && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-gray-900 mb-1">Quote Status Breakdown</h2>
                <p className="text-sm text-gray-500 mb-4">Click a segment to view jobs with that status</p>
                <QuotePieChart onSegmentClick={(status) => router.push(`/analytics/quotations?status=${status}`)} />
              </div>
            </div>
          )}

          {tab === "insights" && insights && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InsightCard
                title="Avg Quote Value"
                value={`$${insights.avgQuoteValue.toFixed(2)}`}
                description="Average approved quote value per job"
                trend="neutral"
              />
              <InsightCard
                title="Quote Approval Rate"
                value={`${insights.approvalRate}%`}
                description="Percentage of quotes approved by clients"
                trend={insights.approvalRate >= 70 ? "up" : "down"}
              />
              <InsightCard
                title="Overdue Chats"
                value={insights.overdueChats}
                description="Threads past their response due time"
                trend={insights.overdueChats === 0 ? "up" : "down"}
              />
              <InsightCard
                title="High Priority Open"
                value={insights.highPriorityOpen}
                description="High priority jobs not yet completed"
                trend={insights.highPriorityOpen === 0 ? "up" : "down"}
              />
              <InsightCard
                title="This Month — New Jobs"
                value={insights.thisMonthJobs}
                description="Jobs created this calendar month"
                trend="neutral"
              />
              <InsightCard
                title="This Month — Approved"
                value={insights.thisMonthApproved}
                description="Quotes approved this month"
                trend="neutral"
              />
              {insights.byCategory.slice(0, 2).map((c) => (
                <InsightCard
                  key={c.category}
                  title={c.category}
                  value={c.count}
                  description={`Jobs in ${c.category} category`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
