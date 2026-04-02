import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { formatUser, formatTenant } from "@/lib/db";
import { redirect } from "next/navigation";
import TeamManagement from "@/components/settings/TeamManagement";

export default async function TeamSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { role, tenantId, assignedTenantIds } = session.user;

  if (role !== "operations_manager" && role !== "super_admin") {
    redirect("/dashboard");
  }

  const accessible = Array.from(new Set([tenantId, ...(assignedTenantIds ?? [])]));

  const [{ data: usersRaw }, { data: tenantsRaw }] = await Promise.all([
    supabaseAdmin.from("users")
      .select("*")
      .in("tenant_id", accessible)
      .order("name"),
    supabaseAdmin.from("tenants")
      .select("*")
      .in("id", accessible),
  ]);

  const users = (usersRaw ?? []).map(formatUser) as unknown as Array<{ id: string; name: string; email: string; role: string; tenantId: string; isActive: string; phone: string }>;
  const tenants = (tenantsRaw ?? []).map(formatTenant) as unknown as Array<{ id: string; name: string; slug: string }>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage technician accounts</p>
      </div>
      <TeamManagement
        users={users}
        tenants={tenants}
        currentTenantId={tenantId}
        currentUserId={session.user.id}
      />
    </div>
  );
}
