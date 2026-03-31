import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findRows, getRows } from "@/lib/sheets";
import { redirect } from "next/navigation";
import UserManagement from "@/components/settings/UserManagement";

export default async function UsersSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { role, tenantId } = session.user;
  if (role === "client") redirect("/client");
  if (role === "technician") redirect("/technician");

  const isSuperAdmin = role === "super_admin";

  const [users, tenants] = await Promise.all([
    findRows("Users", (r) => isSuperAdmin ? true : r.tenantId === tenantId),
    isSuperAdmin ? getRows("Tenants") : Promise.resolve([]),
  ]);

  const safeUsers = users.map(({ passwordHash: _, ...u }) => u);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {isSuperAdmin ? "All users across all tenants" : "Users in your organisation"}
        </p>
      </div>
      <UserManagement
        users={safeUsers}
        tenants={tenants}
        currentUserRole={role}
        currentTenantId={tenantId}
      />
    </div>
  );
}
