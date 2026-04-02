import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findRow, findRows } from "@/lib/sheets";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ChatPanel from "@/components/chat/ChatPanel";
import JobActions from "@/components/jobs/JobActions";
import QuotePanel from "@/components/jobs/QuotePanel";
import AssignTechnician from "@/components/jobs/AssignTechnician";
import { ensureChatThreadForJob } from "@/lib/chat";

const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  ready: "bg-purple-100 text-purple-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  invoiced: "bg-orange-100 text-orange-700",
  paid: "bg-emerald-100 text-emerald-700",
};

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-600",
};

const PAYMENT_STYLE: Record<string, string> = {
  unpaid: "bg-gray-100 text-gray-600",
  invoiced: "bg-orange-100 text-orange-700",
  paid: "bg-emerald-100 text-emerald-700",
};

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const { role, tenantId } = session.user;

  const [job, existingThread, quoteItems] = await Promise.all([
    findRow("Jobs", (r) => r.id === id),
    findRow("ChatThreads", (r) => r.jobId === id),
    findRows("QuoteItems", (r) => r.jobId === id),
  ]);

  if (!job) notFound();
  if (role !== "super_admin" && job.tenantId !== tenantId) notFound();

  const thread = existingThread ?? await ensureChatThreadForJob(job.id, job.tenantId);

  const messages = thread
    ? await findRows("Messages", (r) => r.threadId === thread.id)
    : [];

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div className="flex h-full">
      {/* LEFT: Job Details */}
      <div className="w-full md:w-[420px] shrink-0 border-r border-gray-200 overflow-y-auto bg-white">
        <div className="p-6">
          {/* Back */}
          <Link href="/jobs" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All Jobs
          </Link>

          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{job.jobNumber}</h1>
              {role === "super_admin" && (
                <p className="text-sm text-gray-400">{job.companyName}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLE[job.jobStatus] ?? "bg-gray-100 text-gray-600"}`}>
                {job.jobStatus.replace(/_/g, " ")}
              </span>
              {job.paymentStatus && job.paymentStatus !== "unpaid" && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${PAYMENT_STYLE[job.paymentStatus] ?? "bg-gray-100 text-gray-600"}`}>
                  {job.paymentStatus}
                </span>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-2 mb-5 p-3 bg-gray-50 rounded-xl">
            <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm text-gray-700">{job.propertyAddress}</p>
          </div>

          {/* Details grid */}
          <div className="space-y-3 mb-5">
            <DetailRow label="Category" value={job.category} />
            <DetailRow label="Priority">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[job.priority] ?? "bg-gray-100 text-gray-600"}`}>
                {job.priority}
              </span>
            </DetailRow>
            <DetailRow label="Source" value={job.source ? job.source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—"} />
            <DetailRow
              label="Created By"
              value={job.createdByName || (job.source === "public_form" ? "Client Request Form" : "Team")}
            />
            <DetailRow label="Agent" value={job.agentName || "—"} />
            <DetailRow label="Contact" value={job.agentContact || "—"} />
            {job.assignedToName && (
              <DetailRow label="Technician" value={job.assignedToName} />
            )}
            {job.slaDeadline && (
              <DetailRow
                label="SLA Deadline"
                value={new Date(job.slaDeadline).toLocaleDateString("en-AU")}
              />
            )}
            {job.inspectionRequired === "true" && (
              <DetailRow label="Inspection">
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Required</span>
              </DetailRow>
            )}
          </div>

          {/* Description */}
          <div className="mb-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Description</p>
            <p className="text-sm text-gray-700 leading-relaxed">{job.description}</p>
          </div>

          {/* Quote */}
          <QuotePanel
            jobId={job.id}
            quoteStatus={job.quoteStatus}
            quoteAmount={job.quoteAmount || ""}
            quoteGst={job.quoteGst || ""}
            quoteTotalWithGst={job.quoteTotalWithGst || ""}
            quoteItems={quoteItems}
            role={role}
          />

          {/* Assign Technician — ops/admin only */}
          {(role === "super_admin" || role === "operations_manager") && (
            <AssignTechnician
              jobId={job.id}
              currentAssignedId={job.assignedToId || ""}
              currentAssignedName={job.assignedToName || ""}
              tenantId={role === "super_admin" ? job.tenantId : undefined}
            />
          )}

          {/* Actions */}
          <JobActions
            job={{
              id: job.id,
              jobStatus: job.jobStatus,
              quoteStatus: job.quoteStatus,
              paymentStatus: job.paymentStatus || "unpaid",
              quoteAmount: job.quoteAmount,
            }}
            role={role}
          />
        </div>
      </div>

      {/* RIGHT: Chat — hidden on mobile, full-screen link instead */}
      <div className="hidden md:flex flex-1 flex-col min-w-0 bg-gray-50">
        {/* Chat header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Job Chat</p>
            {thread?.pendingOn && thread.pendingOn !== "none" && (
              <p className="text-xs text-gray-500">
                Waiting on: <span className="font-medium capitalize">{thread.pendingOn}</span>
              </p>
            )}
          </div>
          {thread && (
            <a
              href={`/api/chat/${thread.id}/pdf`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              title="Download chat as PDF"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </a>
          )}
        </div>

        {thread ? (
          <ChatPanel
            threadId={thread.id}
            jobId={job.id}
            initialMessages={sortedMessages.map((m) => ({
              id: m.id,
              type: m.type as "text" | "attachment" | "system",
              content: m.content,
              createdAt: m.createdAt,
              sender: m.senderId ? { id: m.senderId, name: m.senderName, role: m.senderRole ?? "" } : null,
            }))}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            No chat thread found
          </div>
        )}
      </div>

      {/* Mobile: open chat button */}
      {thread && (
        <Link
          href={`/jobs/${job.id}/chat`}
          className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </Link>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-500">{label}</span>
      {children ?? <span className="text-sm font-medium text-gray-900">{value}</span>}
    </div>
  );
}
