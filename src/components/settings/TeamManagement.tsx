"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UserRecord = { id: string; name: string; email: string; role: string; tenantId: string; isActive: string; phone: string };
type TenantRecord = { id: string; name: string; slug: string };

type Props = {
  users: UserRecord[];
  tenants: TenantRecord[];
  currentTenantId: string;
  currentUserId: string;
};

const ROLE_STYLE: Record<string, string> = {
  technician: "bg-blue-100 text-blue-700",
  operations_manager: "bg-purple-100 text-purple-700",
};

export default function TeamManagement({ users, tenants, currentTenantId }: Props) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", password: "", tenantId: currentTenantId });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const technicians = users.filter((u) => u.role === "technician");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, userRole: "technician" }),
    });

    setLoading(false);

    if (res.ok) {
      setSuccess("Technician account created successfully");
      setShowAdd(false);
      setFormData({ name: "", email: "", phone: "", password: "", tenantId: currentTenantId });
      router.refresh();
    } else {
      const d = await res.json() as { error?: string };
      setError(d.error ?? "Failed to create account");
    }
  }

  return (
    <div className="space-y-5">
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">{success}</div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{technicians.length} technician{technicians.length !== 1 ? "s" : ""}</p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          data-testid="add-technician-button"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Technician
        </button>
      </div>

      {showAdd && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">New Technician Account</h3>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="tech@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  value={formData.phone}
                  onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0400 000 000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Min. 8 characters"
                />
              </div>
              {tenants.length > 1 && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <select
                    value={formData.tenantId}
                    onChange={(e) => setFormData((f) => ({ ...f, tenantId: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {loading ? "Creating…" : "Create Account"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 shadow-sm">
        {technicians.map((user) => (
          <div key={user.id} className="flex items-center gap-4 px-5 py-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-blue-700 font-bold text-sm">{user.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              {user.phone && <p className="text-xs text-gray-400">{user.phone}</p>}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_STYLE[user.role] ?? "bg-gray-100 text-gray-600"}`}>
                {user.role.replace(/_/g, " ")}
              </span>
              <span className={`text-xs ${user.isActive === "true" ? "text-green-600" : "text-red-500"}`}>
                {user.isActive === "true" ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        ))}
        {technicians.length === 0 && (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">
            No technicians yet. Add your first technician above.
          </div>
        )}
      </div>
    </div>
  );
}
