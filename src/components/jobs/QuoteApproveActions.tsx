"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function QuoteApproveActions({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function act(quoteStatus: string) {
    setLoading(quoteStatus);
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteStatus }),
      });
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

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 text-center">Do you approve this quote?</p>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => act("rejected")}
          disabled={!!loading}
          className="py-3 bg-white border-2 border-red-200 text-red-600 font-semibold rounded-2xl hover:bg-red-50 disabled:opacity-60 transition-colors"
        >
          {loading === "rejected" ? "..." : "❌ Decline"}
        </button>
        <button
          onClick={() => act("approved")}
          disabled={!!loading}
          className="py-3 bg-green-600 text-white font-semibold rounded-2xl hover:bg-green-700 disabled:opacity-60 transition-colors"
        >
          {loading === "approved" ? "..." : "✅ Approve"}
        </button>
      </div>
    </div>
  );
}
