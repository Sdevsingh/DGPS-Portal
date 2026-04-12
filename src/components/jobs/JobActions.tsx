"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Job = {
  id: string;
  jobStatus: string;
  quoteStatus: string;
  paymentStatus: string;
  quoteAmount?: unknown;
};

export default function JobActions({ job, role }: { job: Job; role: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  async function updateJob(data: Record<string, string>) {
    const key = Object.keys(data)[0];
    setLoading(key);
    setActionError("");
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setActionError(body.error ?? "Update failed — please try again.");
        return;
      }
      router.refresh();
    } catch {
      setActionError("Network error — please check your connection.");
    } finally {
      setLoading(null);
    }
  }

  const isOpsOrAdmin = role === "operations_manager" || role === "super_admin";
  const isClient = role === "client";

  return (
    <div className="space-y-2">
      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
          {actionError}
        </div>
      )}

      {/* Client: quote actions */}
      {isClient && job.quoteStatus === "sent" && (
        <>
          <button
            onClick={() => updateJob({ quoteStatus: "approved" })}
            disabled={!!loading}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
          >
            {loading === "quoteStatus" ? "..." : "✅ Approve Quote"}
          </button>
          <button
            onClick={() => updateJob({ quoteStatus: "rejected" })}
            disabled={!!loading}
            className="w-full py-3 bg-red-50 hover:bg-red-100 disabled:opacity-60 text-red-600 font-semibold rounded-xl border border-red-200 transition-colors"
          >
            ❌ Reject Quote
          </button>
        </>
      )}

      {/* Ops/Admin: job workflow */}
      {isOpsOrAdmin && (
        <div className="space-y-2">
          {(job.jobStatus === "ready" || job.jobStatus === "new") && (
            <button
              onClick={() => updateJob({ jobStatus: "in_progress" })}
              disabled={!!loading}
              className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 text-white font-medium rounded-xl transition-colors"
            >
              {loading === "jobStatus" ? "..." : "Start Job"}
            </button>
          )}
          {job.jobStatus === "in_progress" && (
            <button
              onClick={() => updateJob({ jobStatus: "completed" })}
              disabled={!!loading}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-medium rounded-xl transition-colors"
            >
              {loading === "jobStatus" ? "..." : "Mark Completed"}
            </button>
          )}
          {job.jobStatus === "completed" && job.paymentStatus !== "invoiced" && job.paymentStatus !== "paid" && (
            <button
              onClick={() => updateJob({ jobStatus: "invoiced", paymentStatus: "invoiced" })}
              disabled={!!loading}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-medium rounded-xl transition-colors"
            >
              {loading === "jobStatus" ? "..." : "Mark Invoiced"}
            </button>
          )}
          {(job.jobStatus === "invoiced" || job.paymentStatus === "invoiced") && job.paymentStatus !== "paid" && (
            <button
              onClick={() => updateJob({ jobStatus: "paid", paymentStatus: "paid" })}
              disabled={!!loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium rounded-xl transition-colors"
            >
              {loading === "jobStatus" ? "..." : "Mark Paid"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
