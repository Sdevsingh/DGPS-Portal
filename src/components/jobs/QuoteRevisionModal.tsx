"use client";

import { useState } from "react";

type Props = {
  jobId: string;
};

export default function QuoteRevisionModal({ jobId }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    await fetch(`/api/jobs/${jobId}/quote/revision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setLoading(false);
    setDone(true);
    setTimeout(() => setOpen(false), 1500);
  }

  if (done) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center">
        <p className="text-sm font-semibold text-orange-800">Revision request sent</p>
        <p className="text-xs text-orange-600 mt-1">The ops team will review and update the quote</p>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-testid="request-revision-button"
        className="w-full py-3 border border-orange-300 text-orange-700 rounded-2xl text-sm font-medium hover:bg-orange-50 transition-colors"
      >
        Request Quote Revision
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-900 mb-1">Request Quote Revision</h3>
            <p className="text-sm text-gray-500 mb-4">Explain why the quote needs to be revised</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. additional parts required, scope changed..."
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !reason.trim()}
                className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Sending…" : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
