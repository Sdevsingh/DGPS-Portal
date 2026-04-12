"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InspectionForm({
  jobId,
  tenantId,
  existing,
}: {
  jobId: string;
  tenantId: string;
  existing: Record<string, string> | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!existing);
  const [notes, setNotes] = useState(existing?.notes ?? "");

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, tenantId, checklist: {}, notes }),
      });
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {saved && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">Inspection completed</p>
            <p className="text-xs text-green-600 mt-0.5">Ops team has been notified</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Site Findings & Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          placeholder="Describe what you found on site — scope of work, materials needed, any issues observed..."
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
      >
        {saving ? "Saving..." : saved ? "Update Inspection" : "Mark Inspection Complete"}
      </button>
    </div>
  );
}
