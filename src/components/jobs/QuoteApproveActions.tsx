"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function QuoteApproveActions({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [confirm, setConfirm] = useState<"approved" | "rejected" | null>(null);

  async function act(quoteStatus: string) {
    setLoading(quoteStatus);
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteStatus }),
      });
      setConfirm(null);
      setDone(true);
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  if (done) {
    return (
      <div className="p-4 bg-gray-50 rounded-2xl text-center text-sm text-gray-500">
        Response recorded. Our team has been notified.
      </div>
    );
  }

  // Confirmation step
  if (confirm) {
    const isApprove = confirm === "approved";
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-800">
            {isApprove ? "Confirm Quote Approval" : "Confirm Quote Decline"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {isApprove
              ? "By approving, you authorise us to proceed with the work."
              : "Are you sure you want to decline this quote?"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setConfirm(null)}
            disabled={!!loading}
            className="py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl text-sm hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => act(confirm)}
            disabled={!!loading}
            className={`py-2.5 font-semibold rounded-xl text-sm disabled:opacity-60 transition-colors text-white ${
              isApprove ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {loading ? "…" : isApprove ? "Yes, Approve" : "Yes, Decline"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 text-center">Do you approve this quote?</p>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setConfirm("rejected")}
          disabled={!!loading}
          className="py-3 bg-white border-2 border-red-200 text-red-600 font-semibold rounded-2xl hover:bg-red-50 disabled:opacity-60 transition-colors"
        >
          ❌ Decline
        </button>
        <button
          onClick={() => setConfirm("approved")}
          disabled={!!loading}
          className="py-3 bg-green-600 text-white font-semibold rounded-2xl hover:bg-green-700 disabled:opacity-60 transition-colors"
        >
          ✅ Approve
        </button>
      </div>
    </div>
  );
}
