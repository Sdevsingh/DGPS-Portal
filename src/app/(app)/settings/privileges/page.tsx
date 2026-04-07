import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { formatUser, formatTenant } from "@/lib/db";
import { redirect } from "next/navigation";
import PrivilegeManagement from "@/components/settings/PrivilegeManagement";

export default async function PrivilegesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { role } = session.user;
  if (role !== "super_admin") redirect("/dashboard");

  const [{ data: usersRaw }, { data: tenantsRaw }] = await Promise.all([
    supabaseAdmin.from("users").select("*").order("name"),
    supabaseAdmin.from("tenants").select("*").order("name"),
  ]);

  const users = (usersRaw ?? []).map(formatUser);
  const tenants = (tenantsRaw ?? []).map(formatTenant);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Privilege Management</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Upgrade or downgrade account privileges. Assign client company names to client accounts.
        </p>
      </div>
      <PrivilegeManagement users={users} tenants={tenants} />
    </div>
  );
}
