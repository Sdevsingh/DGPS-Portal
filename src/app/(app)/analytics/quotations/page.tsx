"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type QuoteJob = {
  id: string; jobNumber: string; propertyAddress: string; quoteStatus: string;
  quoteTotalWithGst: string; companyName: string; createdAt: string;
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-gray-100 text-gray-500",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  tech_revision_pending: "bg-orange-100 text-orange-600",
};

export default function QuotationsPage() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "";
  const [jobs, setJobs] = useState<QuoteJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = statusFilter ? `/api/analytics/quotations?status=${statusFilter}` : "/api/analytics/quotations";
    fetch(url)
      .then((r) => r.json())
      .then((d) => { setJobs(d.jobs ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/analytics" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Analytics
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-lg font-bold text-gray-900">
          Quotations {statusFilter && <span className={`ml-2 text-sm px-2 py-0.5 rounded-full ${STATUS_STYLE[statusFilter] ?? "bg-gray-100 text-gray-600"}`}>{statusFilter.replace(/_/g, " ")}</span>}
        </h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 shadow-sm">
          {jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors group">
              <div>
                <p className="font-semibold text-gray-900">{job.jobNumber}</p>
                <p className="text-sm text-gray-500">{job.propertyAddress}</p>
                {job.companyName && <p className="text-xs text-gray-400">{job.companyName}</p>}
              </div>
              <div className="flex items-center gap-3">
                {job.quoteTotalWithGst && (
                  <span className="text-sm font-bold text-gray-900">${Number(job.quoteTotalWithGst).toFixed(2)}</span>
                )}
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLE[job.quoteStatus] ?? "bg-gray-100 text-gray-600"}`}>
                  {job.quoteStatus.replace(/_/g, " ")}
                </span>
              </div>
            </Link>
          ))}
          {jobs.length === 0 && (
            <div className="px-5 py-12 text-center text-gray-400">
              {statusFilter ? `No jobs with "${statusFilter.replace(/_/g, " ")}" status` : "Select a quote status segment from the chart"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
