"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

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

const ROLE_DESC: Record<string, string> = {
  super_admin: "Full platform access. Can manage all tenants, users, and settings.",
  operations_manager: "Tenant-scoped access. Can manage jobs, analytics, and reports.",
  technician: "Field access only. Sees assigned jobs via the field app.",
  client: "Client portal access. Sees their own jobs. Requires a client company name.",
};

const ALL_ROLES = ["super_admin", "operations_manager", "technician", "client"];

export default function PrivilegeManagement({
  users,
  tenants,
}: {
  users: User[];
  tenants: Tenant[];
}) {
  const router = useRouter();
  const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));

  // ── Email lookup ────────────────────────────────────────────────────────────
  const [emailQuery, setEmailQuery] = useState("");
  const [lookupResult, setLookupResult] = useState<
    { found: true; users: User[] } | { found: false; message: string } | null
  >(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleEmailLookup(e: React.FormEvent) {
    e.preventDefault();
    const email = emailQuery.trim();
    if (!email) return;
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const res = await fetch(
        `/api/users/lookup?email=${encodeURIComponent(email)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setLookupResult({ found: false, message: data.error });
      } else {
        setLookupResult({ found: true, users: data });
      }
    } finally {
      setLookupLoading(false);
    }
  }

  function clearLookup() {
    setEmailQuery("");
    setLookupResult(null);
    inputRef.current?.focus();
  }

  // ── Inline privilege editing ────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ role: "", clientCompanyName: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // ── List filters ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  function startEdit(user: User) {
    setEditingId(user.id);
    setEditData({
      role: user.role,
      clientCompanyName: user.clientCompanyName ?? "",
    });
    setSaveError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setSaveError("");
  }

  async function saveEdit(userId: string) {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editData.role,
          clientCompanyName:
            editData.role === "client" ? editData.clientCompanyName : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "Failed to update privilege");
        return;
      }
      setEditingId(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const filtered = users.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)
      );
    }
    return true;
  });

  // Users shown in the email lookup result (or all filtered users)
  const lookupIds =
    lookupResult?.found ? new Set(lookupResult.users.map((u) => u.id)) : null;
  const displayUsers = lookupIds
    ? users.filter((u) => lookupIds.has(u.id))
    : filtered;

  return (
    <div className="space-y-5">

      {/* ── Email Lookup ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Look up account by email
        </h2>
        <form onSubmit={handleEmailLookup} className="flex gap-2">
          <input
            ref={inputRef}
            type="email"
            value={emailQuery}
            onChange={(e) => {
              setEmailQuery(e.target.value);
              if (lookupResult) setLookupResult(null);
            }}
            placeholder="Enter email address..."
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={lookupLoading || !emailQuery.trim()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-xl text-sm transition-colors"
          >
            {lookupLoading ? "Searching..." : "Find User"}
          </button>
          {lookupResult && (
            <button
              type="button"
              onClick={clearLookup}
              className="px-3 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm text-gray-500 transition-colors"
            >
              Clear
            </button>
          )}
        </form>

        {/* Lookup result feedback */}
        {lookupResult && !lookupResult.found && (
          <div className="mt-3 flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
            </svg>
            {lookupResult.message}
          </div>
        )}
        {lookupResult?.found && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Found {lookupResult.users.length} account{lookupResult.users.length !== 1 ? "s" : ""} — showing below.
          </div>
        )}
      </div>

      {/* ── Filters (only when not in lookup mode) ───────────────────────────── */}
      {!lookupResult?.found && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Filter by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Privileges</option>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>

          {/* Stats chips */}
          <div className="flex gap-2 flex-wrap">
            {ALL_ROLES.map((r) => {
              const count = users.filter((u) => u.role === r).length;
              return (
                <button
                  key={r}
                  onClick={() => setRoleFilter(roleFilter === r ? "" : r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
                    roleFilter === r
                      ? `${ROLE_BADGE[r]} border-current`
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {ROLE_LABEL[r]}: {count}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ── Users list ────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
        {displayUsers.length === 0 && (
          <div className="p-10 text-center text-gray-400 text-sm">
            No accounts found
          </div>
        )}
        {displayUsers.map((user) => {
          const isEditing = editingId === user.id;
          return (
            <div key={user.id} className="px-5 py-4">
              {!isEditing ? (
                /* ── View row ──────────────────────────────────────────── */
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-gray-600">
                      {user.name?.[0]?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 text-sm">
                        {user.name}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          ROLE_BADGE[user.role] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {ROLE_LABEL[user.role] ?? user.role}
                      </span>
                      {user.role === "client" && user.clientCompanyName && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 border border-amber-200">
                          {user.clientCompanyName}
                        </span>
                      )}
                      {tenantMap.get(user.tenantId) && (
                        <span className="text-xs text-gray-400">
                          {tenantMap.get(user.tenantId)}
                        </span>
                      )}
                      {user.isActive === "false" && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-500">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                  </div>
                  <button
                    onClick={() => startEdit(user)}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                  >
                    Change Privilege
                  </button>
                </div>
              ) : (
                /* ── Edit row ──────────────────────────────────────────── */
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-blue-600">
                        {user.name?.[0]?.toUpperCase() ?? "?"}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Privilege / Role
                      </label>
                      <select
                        value={editData.role}
                        onChange={(e) =>
                          setEditData((p) => ({ ...p, role: e.target.value }))
                        }
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        {ALL_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    </div>

                    {editData.role === "client" && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Client Company Name{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editData.clientCompanyName}
                          onChange={(e) =>
                            setEditData((p) => ({
                              ...p,
                              clientCompanyName: e.target.value,
                            }))
                          }
                          placeholder="e.g. Acme Corp Pty Ltd"
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Shown as a badge on the account to identify this client.
                        </p>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 italic">
                    {ROLE_DESC[editData.role]}
                  </p>

                  {saveError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                      {saveError}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEdit(user.id)}
                      disabled={
                        saving ||
                        (editData.role === "client" &&
                          !editData.clientCompanyName.trim())
                      }
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-xl text-sm transition-colors"
                    >
                      {saving ? "Saving..." : "Save Privilege"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
