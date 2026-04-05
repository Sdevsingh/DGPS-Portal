"use client";

import { useRouter, useSearchParams } from "next/navigation";

const JOB_STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "invoiced", label: "Invoiced" },
  { value: "paid", label: "Paid" },
];

const QUOTE_STATUS_OPTIONS = [
  { value: "", label: "All Quotes" },
  { value: "pending", label: "Pending" },
  { value: "sent", label: "Sent" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "All Priorities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

type Tenant = { id: string; name: string };

export default function JobFilters({
  tenants = [],
  showCompanyFilter = false,
}: {
  tenants?: Tenant[];
  showCompanyFilter?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "";
  const quoteStatus = searchParams.get("quoteStatus") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const paymentStatus = searchParams.get("paymentStatus") ?? "";
  const inspectionRequired = searchParams.get("inspectionRequired") ?? "";
  const company = searchParams.get("company") ?? "";

  function buildUrl(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value); else p.delete(key);
    const qs = p.toString();
    return `/jobs${qs ? `?${qs}` : ""}`;
  }

  function handleSelect(key: string, value: string) {
    router.push(buildUrl(key, value));
  }

  const activeCount = [status, quoteStatus, priority, paymentStatus, inspectionRequired, company].filter(Boolean).length;

  const selectCls = (active: boolean) =>
    `appearance-none pl-3 pr-8 py-2 text-sm rounded-xl border cursor-pointer font-medium transition-all outline-none ${
      active
        ? "bg-blue-600 text-white border-blue-600"
        : "bg-white border-gray-200 text-gray-700 hover:border-blue-300"
    }`;

  return (
    <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
      {/* Company filter — super_admin only, dynamic from DB */}
      {showCompanyFilter && tenants.length > 0 && (
        <div className="relative shrink-0">
          <select
            value={company}
            onChange={(e) => handleSelect("company", e.target.value)}
            className={selectCls(!!company)}
          >
            <option value="">All Companies</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
            <svg className={`w-3.5 h-3.5 ${company ? "text-white" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      )}

      {/* Job Status */}
      <div className="relative shrink-0">
        <select value={status} onChange={(e) => handleSelect("status", e.target.value)} className={selectCls(!!status)}>
          {JOB_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
          <svg className={`w-3.5 h-3.5 ${status ? "text-white" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Quote Status */}
      <div className="relative shrink-0">
        <select value={quoteStatus} onChange={(e) => handleSelect("quoteStatus", e.target.value)} className={selectCls(!!quoteStatus)}>
          {QUOTE_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
          <svg className={`w-3.5 h-3.5 ${quoteStatus ? "text-white" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Priority */}
      <div className="relative shrink-0">
        <select value={priority} onChange={(e) => handleSelect("priority", e.target.value)} className={selectCls(!!priority)}>
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
          <svg className={`w-3.5 h-3.5 ${priority ? "text-white" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <button
        onClick={() => handleSelect("priority", priority === "high" ? "" : "high")}
        className={`shrink-0 px-3 py-2 text-sm rounded-xl border font-medium transition-all ${
          priority === "high"
            ? "bg-red-600 text-white border-red-600"
            : "bg-white border-gray-200 text-gray-700 hover:border-red-300"
        }`}
      >
        High Priority
      </button>
      <button
        onClick={() => handleSelect("priority", priority === "medium" ? "" : "medium")}
        className={`shrink-0 px-3 py-2 text-sm rounded-xl border font-medium transition-all ${
          priority === "medium"
            ? "bg-yellow-500 text-white border-yellow-500"
            : "bg-white border-gray-200 text-gray-700 hover:border-yellow-300"
        }`}
      >
        Medium
      </button>
      <button
        onClick={() => handleSelect("priority", priority === "low" ? "" : "low")}
        className={`shrink-0 px-3 py-2 text-sm rounded-xl border font-medium transition-all ${
          priority === "low"
            ? "bg-green-600 text-white border-green-600"
            : "bg-white border-gray-200 text-gray-700 hover:border-green-300"
        }`}
      >
        Low
      </button>

      {/* Inspection toggle pill */}
      <button
        onClick={() => handleSelect("inspectionRequired", inspectionRequired === "true" ? "" : "true")}
        className={`shrink-0 px-3 py-2 text-sm rounded-xl border font-medium transition-all ${
          inspectionRequired === "true"
            ? "bg-purple-600 text-white border-purple-600"
            : "bg-white border-gray-200 text-gray-700 hover:border-purple-300"
        }`}
      >
        Needs Inspection
      </button>

      {/* Unpaid toggle pill */}
      <button
        onClick={() => handleSelect("paymentStatus", paymentStatus === "unpaid" ? "" : "unpaid")}
        className={`shrink-0 px-3 py-2 text-sm rounded-xl border font-medium transition-all ${
          paymentStatus === "unpaid"
            ? "bg-orange-500 text-white border-orange-500"
            : "bg-white border-gray-200 text-gray-700 hover:border-orange-300"
        }`}
      >
        Unpaid
      </button>

      {activeCount > 0 && (
        <button
          onClick={() => router.push("/jobs")}
          className="px-3 py-2 text-sm text-red-500 hover:text-red-700 font-medium"
        >
          Clear ({activeCount})
        </button>
      )}
    </div>
  );
}
