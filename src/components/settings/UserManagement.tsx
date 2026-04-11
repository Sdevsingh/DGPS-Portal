"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Select from "@radix-ui/react-select";

type User = Record<string, string>;
type Tenant = Record<string, string>;

const ROLE_BADGE: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700",
  operations_manager: "bg-purple-100 text-purple-700",
  technician: "bg-blue-100 text-blue-700",
  client: "bg-gray-100 text-gray-600",
};

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  operations_manager: "Ops Manager",
  technician: "Technician",
  client: "Client",
};

const ROLE_DOT: Record<string, string> = {
  super_admin: "bg-red-500",
  operations_manager: "bg-purple-500",
  technician: "bg-blue-500",
  client: "bg-emerald-500",
};

export default function UserManagement({
  users,
  tenants,
  currentUserRole,
  currentTenantId,
}: {
  users: User[];
  tenants: Tenant[];
  currentUserRole: string;
  currentTenantId: string;
}) {
  const router = useRouter();
  const isSuperAdmin = currentUserRole === "super_admin";

  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    userRole: "technician",
    password: "",
    tenantId: currentTenantId,
  });

  function setField(key: string, val: string) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create user"); return; }
      setShowAdd(false);
      setForm({ name: "", email: "", phone: "", userRole: "technician", password: "", tenantId: currentTenantId });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: User) {
    setTogglingId(user.id);
    try {
      await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: user.isActive === "true" ? "false" : "true" }),
      });
      router.refresh();
    } finally {
      setTogglingId(null);
    }
  }

  const allowedRoles = isSuperAdmin
    ? ["super_admin", "operations_manager", "technician", "client"]
    : ["technician", "client"];

  const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));

  return (
    <div className="space-y-4">
      {/* Add user button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </button>
      </div>

      {/* Add user form */}
      {showAdd && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4">New User</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                <input required value={form.name} onChange={(e) => setField("name", e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input required type="email" value={form.email} onChange={(e) => setField("email", e.target.value)}
                  placeholder="jane@company.com"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input value={form.phone} onChange={(e) => setField("phone", e.target.value)}
                  placeholder="04xx xxx xxx"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role *</label>
                <Select.Root value={form.userRole} onValueChange={(v) => setField("userRole", v)}>
                  <Select.Trigger className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${ROLE_DOT[form.userRole] ?? "bg-gray-400"}`} />
                      <Select.Value />
                    </div>
                    <Select.Icon><svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content position="popper" sideOffset={4} className="z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[200px]">
                      <Select.Viewport className="p-1">
                        {allowedRoles.map((r) => (
                          <Select.Item key={r} value={r} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 rounded-lg cursor-pointer outline-none data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 data-[state=checked]:font-semibold data-[state=checked]:text-blue-700">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${ROLE_DOT[r] ?? "bg-gray-400"}`} />
                            <Select.ItemText>{ROLE_LABEL[r]}</Select.ItemText>
                            <Select.ItemIndicator className="ml-auto"><svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
              {isSuperAdmin && tenants.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Company *</label>
                  <Select.Root value={form.tenantId} onValueChange={(v) => setField("tenantId", v)}>
                    <Select.Trigger className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 cursor-pointer">
                      <Select.Value />
                      <Select.Icon><svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content position="popper" sideOffset={4} className="z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[220px]">
                        <Select.Viewport className="p-1">
                          {tenants.map((t) => (
                            <Select.Item key={t.id} value={t.id} className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 rounded-lg cursor-pointer outline-none data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 data-[state=checked]:font-semibold data-[state=checked]:text-blue-700">
                              <Select.ItemText>{t.name}</Select.ItemText>
                              <Select.ItemIndicator className="ml-auto"><svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>
              )}
            </div>

            {/* Welcome email notice */}
            <div className="flex items-start gap-2.5 px-3 py-3 bg-blue-50 border border-blue-100 rounded-xl">
              <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-xs text-blue-700 leading-relaxed">
                A welcome email will be sent to <strong>{form.email || "the user"}</strong> with a link to set their password and instructions to sign in with Google.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => { setShowAdd(false); setError(""); }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-xl text-sm">
                {saving ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users list */}
      <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
        {users.length === 0 && (
          <div className="p-10 text-center text-gray-400 text-sm">No users found</div>
        )}
        {users.map((user) => (
          <div key={user.id} className="flex items-center gap-3 px-5 py-4">
            <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-gray-600">{user.name?.[0]?.toUpperCase() ?? "?"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[user.role] ?? "bg-gray-100 text-gray-600"}`}>
                  {ROLE_LABEL[user.role] ?? user.role}
                </span>
                {isSuperAdmin && tenantMap.get(user.tenantId) && (
                  <span className="text-xs text-gray-400">{tenantMap.get(user.tenantId)}</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{user.email}{user.phone ? ` · ${user.phone}` : ""}</p>
            </div>
            
            {/* PERFECTED TOGGLE WITH LOADING STATE */}
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-sm font-medium ${user.isActive === "true" ? 'text-emerald-600' : 'text-slate-500'}`}>
                {user.isActive === "true" ? 'Active' : 'Inactive'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={user.isActive === "true"}
                onClick={() => toggleActive(user)}
                disabled={togglingId === user.id}
                className={`
                  relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full 
                  border-2 border-transparent transition-colors duration-200 ease-in-out 
                  focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2
                  disabled:opacity-50 disabled:cursor-wait
                  ${user.isActive === "true" ? "bg-emerald-500" : "bg-slate-300"}
                `}
              >
                <span
                  aria-hidden="true"
                  className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full 
                    bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${user.isActive === "true" ? "translate-x-5" : "translate-x-0"}
                  `}
                />
              </button>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}