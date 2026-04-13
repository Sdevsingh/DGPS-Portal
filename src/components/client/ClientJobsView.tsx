"use client";

import { useState } from "react";
import Link from "next/link";
import SwipeToDelete from "@/components/jobs/SwipeToDelete";

type Job = Record<string, string>;
type FilterView = "all" | "active" | "awaiting" | "completed";

const STATUS_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  new:         { label: "New",         bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  in_progress: { label: "In Progress", bg: "#fffbeb", color: "#b45309", dot: "#f59e0b" },
  ready:       { label: "In Progress", bg: "#fffbeb", color: "#b45309", dot: "#f59e0b" },
  completed:   { label: "Completed",   bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
  invoiced:    { label: "Invoiced",    bg: "#fff7ed", color: "#c2410c", dot: "#f97316" },
  paid:        { label: "Paid",        bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
};

const PRIORITY_CFG: Record<string, { label: string; bg: string; color: string }> = {
  high:   { label: "High",   bg: "#fef2f2", color: "#b91c1c" },
  medium: { label: "Medium", bg: "#fffbeb", color: "#b45309" },
  low:    { label: "Low",    bg: "#f0fdf4", color: "#15803d" },
};

function resolveStatus(job: Job) {
  return job.jobStatus === "ready" ? "in_progress" : job.jobStatus;
}

function isActive(job: Job)    { return !["completed", "paid"].includes(resolveStatus(job)); }
function isCompleted(job: Job) { return ["completed", "paid"].includes(resolveStatus(job)); }

export default function ClientJobsView({
  jobs,
  tenantSlug,
}: {
  jobs: Job[];
  tenantSlug: string;
}) {
  const [view, setView]     = useState<FilterView>("all");
  const [search, setSearch] = useState("");

  const counts = {
    all:       jobs.length,
    active:    jobs.filter(isActive).length,
    awaiting:  jobs.filter((j) => j.quoteStatus === "sent").length,
    completed: jobs.filter(isCompleted).length,
  };

  const TABS: { key: FilterView; label: string }[] = [
    { key: "all",       label: "All" },
    { key: "active",    label: "Active" },
    { key: "awaiting",  label: "Awaiting" },
    { key: "completed", label: "Completed" },
  ];

  const filtered = jobs.filter((job) => {
    const q = search.trim().toLowerCase();
    if (q && !job.jobNumber?.toLowerCase().includes(q)) return false;
    if (view === "active")    return isActive(job);
    if (view === "awaiting")  return job.quoteStatus === "sent";
    if (view === "completed") return isCompleted(job);
    return true;
  });

  return (
    // Solid white card — fixes all transparency & gradient-bleed issues
    <div style={{
      background: "#ffffff",
      borderRadius: "20px",
      border: "1px solid #e5e7eb",
      boxShadow: "0 8px 40px rgba(30,58,138,0.12), 0 2px 8px rgba(0,0,0,0.06)",
      overflow: "hidden",
    }}>

      {/* ── Search + filter tabs ── */}
      <div style={{ padding: "16px 16px 0", borderBottom: "1px solid #f3f4f6" }}>

        {/* Search bar */}
        <div style={{ position: "relative", marginBottom: "14px" }}>
          {/* Search icon */}
          <div style={{
            position: "absolute", top: 0, bottom: 0, left: 0,
            display: "flex", alignItems: "center", paddingLeft: "14px",
            pointerEvents: "none",
          }}>
            <svg width="16" height="16" fill="none" stroke="#9ca3af" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Job ID — e.g. JOB-003"
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              background: "#f9fafb",
              border: "1.5px solid #e5e7eb",
              borderRadius: "12px",
              padding: "11px 40px 11px 44px",
              fontSize: "14px",
              color: "#111827",
              outline: "none",
              fontFamily: "inherit",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#3b82f6";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)";
              e.currentTarget.style.background = "#ffffff";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#e5e7eb";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.background = "#f9fafb";
            }}
          />

          {/* Clear button */}
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                position: "absolute", top: "50%", right: "12px",
                transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "#9ca3af", padding: "4px", display: "flex", alignItems: "center",
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "4px", paddingBottom: "12px" }}>
          {TABS.map((tab) => {
            const active = view === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setView(tab.key)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                  padding: "8px 4px",
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  background: active ? "#2563eb" : "transparent",
                  color: active ? "#ffffff" : "#6b7280",
                  transition: "all 0.15s",
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "18px",
                  height: "18px",
                  borderRadius: "9px",
                  padding: "0 5px",
                  fontSize: "10px",
                  fontWeight: 700,
                  background: active ? "rgba(255,255,255,0.25)" : "#f3f4f6",
                  color: active ? "#fff" : "#6b7280",
                }}>
                  {counts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Job list ── */}
      <div style={{ padding: "14px 16px" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <div style={{
              width: "48px", height: "48px", background: "#f3f4f6",
              borderRadius: "14px", display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 12px",
            }}>
              <svg width="22" height="22" fill="none" stroke="#d1d5db" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p style={{ fontSize: "14px", fontWeight: 500, color: "#9ca3af" }}>
              {search ? `No jobs matching "${search}"` : "Nothing here yet"}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{ marginTop: "8px", fontSize: "13px", color: "#2563eb", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.map((job) => {
              const status   = resolveStatus(job);
              const cfg      = STATUS_CFG[status] ?? { label: status, bg: "#f9fafb", color: "#6b7280", dot: "#9ca3af" };
              const hasQuote = job.quoteAmount && Number(job.quoteAmount) > 0;
              const quoteReady = job.quoteStatus === "sent";
              const approved   = job.quoteStatus === "approved";
              const pri        = PRIORITY_CFG[job.priority] ?? { label: job.priority ?? "—", bg: "#f9fafb", color: "#6b7280" };

              return (
                <SwipeToDelete key={job.id} jobId={job.id}>
                <Link
                  href={`/client/jobs/${job.id}`}
                  style={{ display: "block", textDecoration: "none" }}
                >
                  <div
                    style={{
                      background: "#fff",
                      border: `1.5px solid ${quoteReady ? "#bfdbfe" : "#f3f4f6"}`,
                      borderRadius: "16px",
                      padding: "16px",
                      cursor: "pointer",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "#93c5fd";
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(37,99,235,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = quoteReady ? "#bfdbfe" : "#f3f4f6";
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                    }}
                  >
                    {/* Top row: job meta + status badge */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
                          <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", color: "#9ca3af", textTransform: "uppercase" }}>
                            {job.jobNumber}
                          </span>
                          <span style={{ color: "#e5e7eb" }}>·</span>
                          <span style={{ fontSize: "11px", color: "#9ca3af" }}>{job.category}</span>
                        </div>
                        <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827", lineHeight: 1.3, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {job.propertyAddress}
                        </p>
                      </div>

                      {/* Status badge */}
                      <div style={{ flexShrink: 0, paddingTop: "1px" }}>
                        {quoteReady ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#1d4ed8", color: "#fff", borderRadius: "999px", padding: "4px 11px", fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap" }}>
                            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "rgba(255,255,255,0.75)" }} />
                            Quote Ready
                          </span>
                        ) : approved ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", borderRadius: "999px", padding: "4px 11px", fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap" }}>
                            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e" }} />
                            Approved
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: cfg.bg, color: cfg.color, borderRadius: "999px", padding: "4px 11px", fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap" }}>
                            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: cfg.dot }} />
                            {cfg.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quote CTA banner */}
                    {quoteReady && (
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: "#eff6ff", border: "1px solid #dbeafe",
                        borderRadius: "10px", padding: "10px 14px", margin: "10px 0",
                      }}>
                        <p style={{ fontSize: "12px", fontWeight: 600, color: "#1d4ed8", margin: 0 }}>
                          Review &amp; approve your quote
                        </p>
                        {hasQuote && (
                          <p style={{ fontSize: "15px", fontWeight: 700, color: "#1e40af", margin: 0, whiteSpace: "nowrap" }}>
                            ${Number(job.quoteTotalWithGst).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span style={{ fontSize: "10px", fontWeight: 400, color: "#60a5fa", marginLeft: "4px" }}>incl. GST</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Bottom row: priority + date + view arrow */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center",
                          background: pri.bg, color: pri.color,
                          borderRadius: "999px", padding: "3px 9px",
                          fontSize: "11px", fontWeight: 600,
                        }}>
                          {pri.label}
                        </span>
                        <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                          {new Date(job.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      <span style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "12px", fontWeight: 600, color: "#3b82f6" }}>
                        View
                        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
                </SwipeToDelete>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Submit another request ── */}
      <div style={{ padding: "4px 16px 16px" }}>
        <Link
          href={`/request/${tenantSlug}`}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: "8px", width: "100%", padding: "14px",
            background: "#f9fafb", border: "1.5px dashed #e5e7eb",
            borderRadius: "14px", fontSize: "13px", fontWeight: 600,
            color: "#9ca3af", textDecoration: "none", boxSizing: "border-box",
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "#93c5fd";
            (e.currentTarget as HTMLAnchorElement).style.color = "#2563eb";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "#e5e7eb";
            (e.currentTarget as HTMLAnchorElement).style.color = "#9ca3af";
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Submit another request
        </Link>
      </div>
    </div>
  );
}
