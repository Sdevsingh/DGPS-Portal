import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { formatUser, formatTenant } from "@/lib/db";
import { redirect } from "next/navigation";
import UserManagement from "@/components/settings/UserManagement";

export default async function UsersSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { role, tenantId } = session.user;
  if (role !== "super_admin") redirect("/dashboard");

  const [{ data: usersRaw }, { data: tenantsRaw }] = await Promise.all([
    supabaseAdmin.from("users").select("*").order("name"),
    supabaseAdmin.from("tenants").select("*").order("name"),
  ]);

  const safeUsers = (usersRaw ?? []).map(formatUser);
  const tenants = (tenantsRaw ?? []).map(formatTenant);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 text-sm mt-0.5">All users across all companies</p>
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
