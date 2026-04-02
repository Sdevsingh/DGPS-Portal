import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { redirect } from "next/navigation";
import Link from "next/link";
import CreateCompanyButton from "@/components/companies/CreateCompanyButton";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
};

type Job = { id: string; tenantId: string; jobStatus: string };
type User = { id: string; tenantId: string };

export default async function CompaniesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "super_admin") redirect("/dashboard");

  const [{ data: tenantsRaw }, { data: jobsRaw }, { data: usersRaw }] = await Promise.all([
    supabaseAdmin.from("tenants").select("id, name, slug, email, phone, address, created_at").order("name"),
    supabaseAdmin.from("jobs").select("id, tenant_id, job_status"),
    supabaseAdmin.from("users").select("id, tenant_id"),
  ]);

  const allJobs = (jobsRaw ?? []).map((j) => ({ id: j.id, tenantId: j.tenant_id, jobStatus: j.job_status }));
  const allUsers = (usersRaw ?? []).map((u) => ({ id: u.id, tenantId: u.tenant_id }));
  const uniqueTenants = (tenantsRaw ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    email: t.email ?? "",
    phone: t.phone ?? "",
    address: t.address ?? "",
    createdAt: t.created_at ?? "",
  }));

  const tenantsWithStats = uniqueTenants
    .map((t) => ({
      ...t,
      jobCount: allJobs.filter((j) => j.tenantId === t.id).length,
      userCount: allUsers.filter((u) => u.tenantId === t.id).length,
      activeJobs: allJobs.filter(
        (j) => j.tenantId === t.id && !["completed", "paid"].includes(j.jobStatus)
      ).length,
    }))
    .sort((a, b) => b.jobCount - a.jobCount);

  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-green-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-500 text-sm mt-0.5">{uniqueTenants.length} tenants on the platform</p>
        </div>
        <CreateCompanyButton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tenantsWithStats.map((tenant, i) => (
          <div
            key={tenant.id}
            className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-11 h-11 ${colors[i % colors.length]} rounded-xl flex items-center justify-center shrink-0`}
              >
                <span className="text-white font-bold text-lg">{tenant.name[0].toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 truncate">{tenant.name}</p>
                <p className="text-xs text-gray-400">/request/{tenant.slug}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{tenant.jobCount}</p>
                <p className="text-xs text-gray-400 mt-0.5">Total</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-yellow-700">{tenant.activeJobs}</p>
                <p className="text-xs text-yellow-500 mt-0.5">Active</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{tenant.userCount}</p>
                <p className="text-xs text-blue-400 mt-0.5">Users</p>
              </div>
            </div>

            {/* Contact */}
            {(tenant.email || tenant.phone) && (
              <div className="space-y-1 border-t border-gray-100 pt-3">
                {tenant.email && (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <svg
                      className="w-3.5 h-3.5 text-gray-400 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    {tenant.email}
                  </p>
                )}
                {tenant.phone && (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <svg
                      className="w-3.5 h-3.5 text-gray-400 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    {tenant.phone}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              <Link
                href={`/jobs?company=${tenant.id}`}
                className="flex-1 text-center py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
              >
                View Jobs
              </Link>
              <a
                href={`/request/${tenant.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Public Form ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
