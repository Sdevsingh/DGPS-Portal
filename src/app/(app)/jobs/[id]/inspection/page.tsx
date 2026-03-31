import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findRow, findRows } from "@/lib/sheets";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import InspectionForm from "@/components/jobs/InspectionForm";

export default async function InspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const { role, tenantId } = session.user;

  if (role === "client") redirect("/client");

  const [job, existingInspections] = await Promise.all([
    findRow("Jobs", (r) => r.id === id),
    findRows("Inspections", (r) => r.jobId === id),
  ]);

  if (!job) notFound();
  if (role !== "super_admin" && job.tenantId !== tenantId) notFound();

  const latestInspection = existingInspections.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0] ?? null;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <Link href={`/jobs/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to job
      </Link>

      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-gray-900">Inspection Report</h1>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Required</span>
        </div>
        <p className="text-sm text-gray-500">{job.jobNumber} · {job.propertyAddress}</p>
      </div>

      <InspectionForm jobId={id} tenantId={job.tenantId} existing={latestInspection} />
    </div>
  );
}
