"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Technician = { id: string; name: string; email: string };

type Props = {
  jobId: string;
  currentAssignedId?: string;
  currentAssignedName?: string;
  tenantId?: string;
};

export default function AssignTechnician({ jobId, currentAssignedId, currentAssignedName, tenantId }: Props) {
  const router = useRouter();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedId, setSelectedId] = useState(currentAssignedId ?? "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchTechnicians = useCallback(async () => {
    setLoading(true);
    try {
      const url = tenantId ? `/api/users?tenantId=${tenantId}` : "/api/users";
      const res = await fetch(url);
      if (!res.ok) return;
      const users: (Technician & { role: string })[] = await res.json();
      setTechnicians(users.filter((u) => u.role === "technician"));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  async function assign() {
    const tech = technicians.find((t) => t.id === selectedId);
    if (!tech) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: tech.id, assignedToName: tech.name }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to assign technician");
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const isDirty = selectedId !== (currentAssignedId ?? "");

  return (
    <div className="border border-gray-200 rounded-xl p-4 mb-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Assign Technician</p>

      {loading ? (
        <div className="h-9 bg-gray-100 rounded-lg animate-pulse" />
      ) : technicians.length === 0 ? (
        <p className="text-sm text-gray-400">No technicians found in this tenant.</p>
      ) : (
        <div className="flex gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">— Unassigned —</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            onClick={assign}
            disabled={saving || !isDirty || !selectedId}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
          >
            {saving ? "Saving…" : "Assign"}
          </button>
        </div>
      )}

      {currentAssignedName && !isDirty && (
        <p className="mt-2 text-xs text-gray-500">
          Currently assigned to <span className="font-medium text-gray-700">{currentAssignedName}</span>
        </p>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
