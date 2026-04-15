import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { formatJob, formatThread, formatMessage, formatQuoteItem } from "@/lib/db";
import { ensureChatThreadForJob } from "@/lib/chat";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ChatPanel from "@/components/chat/ChatPanel";
import JobActions from "@/components/jobs/JobActions";
import QuotePanel from "@/components/jobs/QuotePanel";
import AssignTechnician from "@/components/jobs/AssignTechnician";

type QuoteItem = { id: string; description: string; quantity: string; unitPrice: string; total: string };

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
  const { role, tenantId, id: userId, email, assignedTenantIds } = session.user;

  const { data: jobData } = await supabaseAdmin.from("jobs").select("*").eq("id", id).single();
  if (!jobData) notFound();

  // Access control
  if (role !== "super_admin") {
    const accessible = new Set([tenantId, ...(assignedTenantIds ?? [])]);
    if (!accessible.has(jobData.tenant_id)) notFound();
  }
  if (role === "client") {
    const canAccess = jobData.agent_email?.toLowerCase() === email?.toLowerCase() || jobData.created_by_user_id === userId;
    if (!canAccess) notFound();
  }

  const job = formatJob(jobData);

  const [threadRes, quoteItemsRes] = await Promise.all([
    supabaseAdmin.from("chat_threads").select("*").eq("job_id", id).single(),
    supabaseAdmin.from("quote_items").select("*").eq("job_id", id).order("created_at", { ascending: true }),
  ]);

  let thread = threadRes.data ? formatThread(threadRes.data) : null;
  if (!thread) thread = await ensureChatThreadForJob(id, jobData.tenant_id);

  const quoteItems: QuoteItem[] = (quoteItemsRes.data ?? []).map(formatQuoteItem).map((item) => ({
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.total,
  }));

  let messages: ReturnType<typeof formatMessage>[] = [];
  if (thread) {
    const { data: msgData } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: true });
    messages = (msgData ?? []).map(formatMessage);
  }

  return (
    <div className="flex h-full">
      <div className="w-full md:w-[420px] shrink-0 border-r border-gray-200 overflow-y-auto bg-white">
        <div className="p-6">
          <Link href="/jobs" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All Jobs
          </Link>

          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{job.jobNumber}</h1>
              {role === "super_admin" && <p className="text-sm text-gray-400">{job.companyName}</p>}
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

          <div className="flex items-start gap-2 mb-5 p-3 bg-gray-50 rounded-xl">
            <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm text-gray-700">{job.propertyAddress}</p>
          </div>

          <div className="space-y-3 mb-5">
            <DetailRow label="Category" value={job.category} />
            <DetailRow label="Priority">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[job.priority] ?? "bg-gray-100 text-gray-600"}`}>{job.priority}</span>
            </DetailRow>
            <DetailRow label="Source" value={job.source ? job.source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—"} />
            <DetailRow label="Created By" value={job.createdByName || (job.source === "public_form" ? "Client Request Form" : "Team")} />
            <DetailRow label="Agent" value={job.agentName || "—"} />
            <DetailRow label="Agent Contact" value={job.agentContact || "—"} />
            {job.agentEmail && <DetailRow label="Agent Email" value={job.agentEmail} />}
          </div>

          {/* Customer Details — end customer who requested the service */}
          {(job.companyName || job.customerContact || job.customerEmail) && (
            <div className="space-y-3 mb-5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Customer Details</p>
              {job.companyName && (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{job.companyName}</p>
                    {job.customerContact && <p className="text-xs text-gray-500 mt-0.5">{job.customerContact}</p>}
                  </div>
                  {job.customerContact && (
                    <a
                      href={`tel:${job.customerContact.replace(/\s/g, "")}`}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Call
                    </a>
                  )}
                </div>
              )}
              {!job.companyName && job.customerContact && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{job.customerContact}</span>
                  <a
                    href={`tel:${job.customerContact.replace(/\s/g, "")}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                  >
                    Call
                  </a>
                </div>
              )}
              {job.customerEmail && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Email</span>
                  <a href={`mailto:${job.customerEmail}`} className="text-sm text-blue-600 hover:underline">{job.customerEmail}</a>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3 mb-5">
            {job.assignedToName && <DetailRow label="Technician" value={job.assignedToName} />}
            {job.slaDeadline && <DetailRow label="SLA Deadline" value={new Date(job.slaDeadline).toLocaleDateString("en-AU")} />}
            {job.inspectionRequired === "true" && (
              <DetailRow label="Inspection">
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Required</span>
              </DetailRow>
            )}
          </div>

          <div className="mb-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Description</p>
            <div className="text-sm text-gray-700 leading-relaxed space-y-0.5">
              {job.description.split(/\n|(?= ?- )/).map((line, i) => {
                const clean = line.replace(/^[\s\-–]+/, "").trim();
                return clean ? <p key={i}>• {clean}</p> : null;
              })}
            </div>
          </div>

          <QuotePanel
            jobId={job.id}
            quoteStatus={job.quoteStatus}
            quoteAmount={job.quoteAmount}
            quoteGst={job.quoteGst}
            quoteTotalWithGst={job.quoteTotalWithGst}
            quoteItems={quoteItems}
            role={role}
          />

          {(role === "super_admin" || role === "operations_manager") && (
            <AssignTechnician
              jobId={job.id}
              currentAssignedId={job.assignedToId}
              currentAssignedName={job.assignedToName}
              tenantId={role === "super_admin" ? job.tenantId : undefined}
            />
          )}

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

      <div className="hidden md:flex flex-1 flex-col min-w-0 bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Job Chat</p>
            {thread?.pendingOn && thread.pendingOn !== "none" && (
              <p className="text-xs text-gray-500">Waiting on: <span className="font-medium capitalize">{thread.pendingOn}</span></p>
            )}
          </div>
          {thread && (
            <a href={`/api/chat/${thread.id}/pdf`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
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
            initialMessages={messages.map((m) => ({
              id: m.id,
              type: m.type as "text" | "attachment" | "system",
              content: m.content,
              createdAt: m.createdAt,
              sender: m.senderId ? { id: m.senderId, name: m.senderName, role: m.senderRole } : null,
            }))}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">No chat thread found</div>
        )}
      </div>

      {thread && (
        <Link href={`/jobs/${job.id}/chat`} className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </Link>
      )}
    </div>
  );
}

function DetailRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-500">{label}</span>
      {children ?? <span className="text-sm font-medium text-gray-900">{value}</span>}
    </div>
  );
}
