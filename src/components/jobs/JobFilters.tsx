"use client";

import * as Select from "@radix-ui/react-select";
import { useRouter, useSearchParams } from "next/navigation";

// Radix Select doesn't accept "" as an item value — use sentinel instead
const ALL = "__all__";
const toRadix = (v: string) => v || ALL;
const fromRadix = (v: string) => (v === ALL ? "" : v);

const JOB_STATUS_OPTIONS = [
  { value: ALL, label: "Status" },
  { value: "new", label: "New" },
  { value: "ready", label: "Ready" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "invoiced", label: "Invoiced" },
  { value: "paid", label: "Paid" },
];

const QUOTE_STATUS_OPTIONS = [
  { value: ALL, label: "Quote" },
  { value: "pending", label: "Pending" },
  { value: "sent", label: "Sent" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const PRIORITY_OPTIONS = [
  { value: ALL, label: "Priority" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

type Tenant = { id: string; name: string };

// ─── Custom Radix Select ──────────────────────────────────────────────────────

function FilterSelect({
  value,
  onChange,
  options,
  active,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  active: boolean;
}) {
  const radixValue = toRadix(value);
  const selected = options.find((o) => o.value === radixValue) ?? options[0];

  return (
    <Select.Root value={radixValue} onValueChange={(v) => onChange(fromRadix(v))}>
      <Select.Trigger
        className={`inline-flex items-center gap-2 pl-3 pr-2.5 py-2 text-sm rounded-xl border cursor-pointer font-medium transition-all outline-none focus:outline-none select-none shrink-0 ${
          active
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-white border-gray-200 text-gray-700 hover:border-blue-300"
        }`}
      >
        <Select.Value>{selected.label}</Select.Value>
        <Select.Icon>
          <svg
            className={`w-3.5 h-3.5 ${active ? "text-white" : "text-gray-400"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          className="z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[160px]"
        >
          <Select.Viewport className="p-1">
            {options.map((o) => (
              <Select.Item
                key={o.value}
                value={o.value}
                className="relative flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg cursor-pointer outline-none hover:bg-blue-50 hover:text-blue-700 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 data-[state=checked]:font-semibold data-[state=checked]:text-blue-700"
              >
                <Select.ItemText>{o.label}</Select.ItemText>
                <Select.ItemIndicator className="ml-auto">
                  <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function JobFilters({
  tenants = [],
  showCompanyFilter = false,
  agentNames = [],
  showAgentFilter = false,
}: {
  tenants?: Tenant[];
  showCompanyFilter?: boolean;
  agentNames?: string[];
  showAgentFilter?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "";
  const quoteStatus = searchParams.get("quoteStatus") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const paymentStatus = searchParams.get("paymentStatus") ?? "";
  const inspectionRequired = searchParams.get("inspectionRequired") ?? "";
  const company = searchParams.get("company") ?? "";
  const agentName = searchParams.get("agentName") ?? "";

  function buildUrl(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value); else p.delete(key);
    return `/jobs${p.toString() ? `?${p.toString()}` : ""}`;
  }

  function handleSelect(key: string, value: string) {
    router.push(buildUrl(key, value));
  }

  function toggle(key: string, value: string, current: string) {
    handleSelect(key, current === value ? "" : value);
  }

  const activeCount = [status, quoteStatus, priority, paymentStatus, inspectionRequired, company, agentName].filter(Boolean).length;

  const pillCls = (active: boolean, activeColor: string) =>
    `shrink-0 px-3 py-2 text-sm rounded-xl border font-medium transition-all ${
      active ? `${activeColor} text-white border-transparent` : "bg-white border-gray-200 text-gray-700 hover:border-blue-300"
    }`;

  const companyOptions = [
    { value: ALL, label: "Company" },
    ...tenants.map((t) => ({ value: t.id, label: t.name })),
  ];

  const agentOptions = [
    { value: ALL, label: "Agent" },
    ...agentNames.map((n) => ({ value: n, label: n })),
  ];

  return (
    <div className="flex items-center gap-2 mb-5 flex-wrap">

      {/* Agent filter */}
      {showAgentFilter && agentNames.length > 0 && (
        <FilterSelect
          value={agentName}
          onChange={(v) => handleSelect("agentName", v)}
          options={agentOptions}
          active={!!agentName}
        />
      )}

      {/* Company filter */}
      {showCompanyFilter && tenants.length > 0 && (
        <FilterSelect
          value={company}
          onChange={(v) => handleSelect("company", v)}
          options={companyOptions}
          active={!!company}
        />
      )}

      {/* Job Status */}
      <FilterSelect
        value={status}
        onChange={(v) => handleSelect("status", v)}
        options={JOB_STATUS_OPTIONS}
        active={!!status}
      />

      {/* Quote Status */}
      <FilterSelect
        value={quoteStatus}
        onChange={(v) => handleSelect("quoteStatus", v)}
        options={QUOTE_STATUS_OPTIONS}
        active={!!quoteStatus}
      />

      {/* Priority */}
      <FilterSelect
        value={priority}
        onChange={(v) => handleSelect("priority", v)}
        options={PRIORITY_OPTIONS}
        active={!!priority}
      />

      {/* Quick-toggle pills */}
      <button onClick={() => toggle("priority", "high", priority)} className={pillCls(priority === "high", "bg-red-600")}>High Priority</button>
      <button onClick={() => toggle("priority", "medium", priority)} className={pillCls(priority === "medium", "bg-yellow-500")}>Medium</button>
      <button onClick={() => toggle("priority", "low", priority)} className={pillCls(priority === "low", "bg-green-600")}>Low</button>
      <button onClick={() => toggle("inspectionRequired", "true", inspectionRequired)} className={pillCls(inspectionRequired === "true", "bg-purple-600")}>Needs Inspection</button>
      <button onClick={() => toggle("paymentStatus", "unpaid", paymentStatus)} className={pillCls(paymentStatus === "unpaid", "bg-orange-500")}>Unpaid</button>

      {activeCount > 0 && (
        <button onClick={() => router.push("/jobs")} className="px-3 py-2 text-sm text-red-500 hover:text-red-700 font-medium">
          Clear ({activeCount})
        </button>
      )}
    </div>
  );
}
