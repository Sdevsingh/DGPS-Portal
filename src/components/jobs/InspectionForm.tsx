"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CHECKLIST_ITEMS = [
  "Water pressure checked",
  "Pipe connections secure",
  "No visible leaks",
  "Drainage functioning",
  "Hot water system operational",
  "Fixtures tested",
  "Shutoff valves operational",
  "Safety compliance confirmed",
];

type CheckResult = "pass" | "fail" | "na";
type Checklist = Record<string, CheckResult>;

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
  const [saved, setSaved] = useState(false);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [checklist, setChecklist] = useState<Checklist>(() => {
    if (existing?.checklist) {
      try { return JSON.parse(existing.checklist); } catch { return {}; }
    }
    return {};
  });

  function setCheck(item: string, result: CheckResult) {
    setChecklist((prev) => ({ ...prev, [item]: result }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, tenantId, checklist, notes }),
      });
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const allChecked = CHECKLIST_ITEMS.every((item) => checklist[item]);
  const passCount = Object.values(checklist).filter((v) => v === "pass").length;
  const failCount = Object.values(checklist).filter((v) => v === "fail").length;

  const btnCls = (item: string, val: CheckResult) => {
    const active = checklist[item] === val;
    if (val === "pass") return `px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${active ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-700"}`;
    if (val === "fail") return `px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${active ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-700"}`;
    return `px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${active ? "bg-gray-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`;
  };

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      {Object.keys(checklist).length > 0 && (
        <div className="flex gap-3 p-3 bg-gray-50 rounded-xl">
          <span className="text-sm text-green-600 font-medium">✓ {passCount} Pass</span>
          {failCount > 0 && <span className="text-sm text-red-600 font-medium">✗ {failCount} Fail</span>}
          <span className="text-sm text-gray-400">{CHECKLIST_ITEMS.length - Object.keys(checklist).length} remaining</span>
        </div>
      )}

      {/* Checklist */}
      <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
        {CHECKLIST_ITEMS.map((item) => (
          <div key={item} className="flex items-center justify-between px-5 py-4 gap-3">
            <p className="text-sm text-gray-800 font-medium flex-1">{item}</p>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={() => setCheck(item, "pass")} className={btnCls(item, "pass")}>Pass</button>
              <button onClick={() => setCheck(item, "fail")} className={btnCls(item, "fail")}>Fail</button>
              <button onClick={() => setCheck(item, "na")} className={btnCls(item, "na")}>N/A</button>
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Inspector Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Describe findings, issues, or recommendations..."
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {saved && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium text-center">
          ✓ Inspection saved successfully
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || !allChecked}
        className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
      >
        {saving ? "Saving..." : !allChecked ? `Complete all ${CHECKLIST_ITEMS.length} items to save` : "Save Inspection Report"}
      </button>
    </div>
  );
}
