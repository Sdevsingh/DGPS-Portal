import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { formatJob, formatThread, formatMessage, formatQuoteItem } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ChatPanel from "@/components/chat/ChatPanel";
import QuotePanel from "@/components/jobs/QuotePanel";
import TechJobActions from "@/components/jobs/TechJobActions";
import QuoteRevisionModal from "@/components/jobs/QuoteRevisionModal";

type QuoteItem = { id: string; description: string; quantity: string; unitPrice: string; total: string };

const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  ready: "bg-purple-100 text-purple-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  invoiced: "bg-orange-100 text-orange-700",
  paid: "bg-emerald-100 text-emerald-700",
};

const PRIORITY_BAR: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-400",
  low: "bg-green-400",
};

export default async function TechnicianJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const { role, tenantId, id: userId } = session.user;

  if (role === "client") redirect("/client");

  const { data: jobData } = await supabaseAdmin.from("jobs").select("*").eq("id", id).single();
  if (!jobData) notFound();
  if (role !== "super_admin" && jobData.tenant_id !== tenantId) notFound();

  const job = formatJob(jobData);

  const [threadRes, quoteItemsRes] = await Promise.all([
    supabaseAdmin.from("chat_threads").select("*").eq("job_id", id).single(),
    supabaseAdmin.from("quote_items").select("*").eq("job_id", id).order("created_at", { ascending: true }),
  ]);

  const thread = threadRes.data ? formatThread(threadRes.data) : null;
  const quoteItems: QuoteItem[] = (quoteItemsRes.data ?? []).map(formatQuoteItem).map((item) => ({
    id: item.id, description: item.description, quantity: item.quantity, unitPrice: item.unitPrice, total: item.total,
  }));

  let messages: ReturnType<typeof formatMessage>[] = [];
  if (thread) {
    const { data: msgData } = await supabaseAdmin.from("messages").select("*").eq("thread_id", thread.id).order("created_at", { ascending: true });
    messages = (msgData ?? []).map(formatMessage);
  }

  const inspectionState = job.inspectionRequired;
  const isMyJob = job.assignedToId === userId;
  const canReviseQuote = role === "technician" && isMyJob && job.jobStatus === "in_progress" && job.quoteStatus === "approved";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`h-1.5 ${PRIORITY_BAR[job.priority] ?? "bg-gray-300"}`} />
      <div className="bg-gray-900 text-white px-4 pt-4 pb-5">
        <Link href="/technician" className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          My Jobs
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold">{job.propertyAddress}</h1>
            <p className="text-gray-400 text-sm mt-0.5">{job.jobNumber} · {job.category}</p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLE[job.jobStatus] ?? "bg-gray-700 text-gray-300"}`}>
            {job.jobStatus.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
        <a href={`https://maps.apple.com/?q=${encodeURIComponent(job.propertyAddress)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 w-full py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors justify-center">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Navigate to Site
        </a>

        <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
          {job.description && (
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Description</p>
              <div className="text-sm text-gray-700 leading-relaxed space-y-0.5">
                {job.description.split(/\n|(?= ?- )/).map((line: string, i: number) => {
                  const clean = line.replace(/^[\s\-–]+/, "").trim();
                  return clean ? <p key={i}>• {clean}</p> : null;
                })}
              </div>
            </div>
          )}
          <div className="px-5 py-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Priority</p>
              <p className={`text-sm font-semibold capitalize ${job.priority === "high" ? "text-red-600" : job.priority === "medium" ? "text-yellow-600" : "text-green-600"}`}>{job.priority}</p>
            </div>
            {job.slaDeadline && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">SLA Deadline</p>
                <p className="text-sm font-medium text-gray-800">{new Date(job.slaDeadline).toLocaleDateString("en-AU")}</p>
              </div>
            )}
            {job.agentName && <div><p className="text-xs text-gray-400 mb-0.5">Agent</p><p className="text-sm font-medium text-gray-800">{job.agentName}</p></div>}
            {job.agentContact && <div><p className="text-xs text-gray-400 mb-0.5">Agent Contact</p><a href={`tel:${job.agentContact}`} className="text-sm font-medium text-blue-600 hover:underline">{job.agentContact}</a></div>}
            {job.agentEmail && <div className="col-span-2"><p className="text-xs text-gray-400 mb-0.5">Agent Email</p><a href={`mailto:${job.agentEmail}`} className="text-sm font-medium text-blue-600 hover:underline">{job.agentEmail}</a></div>}
          </div>
          {(job.companyName || job.customerContact || job.customerEmail) && (
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Customer Details</p>
              {job.companyName && (
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{job.companyName}</p>
                    {job.customerContact && <p className="text-xs text-gray-500 mt-0.5">{job.customerContact}</p>}
                  </div>
                  {job.customerContact && (
                    <a
                      href={`tel:${job.customerContact.replace(/\s/g, "")}`}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Call
                    </a>
                  )}
                </div>
              )}
              {job.customerEmail && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Email</span>
                  <a href={`mailto:${job.customerEmail}`} className="text-sm text-blue-600 hover:underline">{job.customerEmail}</a>
                </div>
              )}
            </div>
          )}
          {(inspectionState === "true" || inspectionState === "done") && (
            <div className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Inspection Required</span>
                {inspectionState === "done" && <span className="text-xs text-green-600 font-medium">Done</span>}
              </div>
              {inspectionState !== "done" && (
                <Link href={`/jobs/${id}/inspection`} className="text-sm font-semibold text-purple-600 hover:text-purple-700">View →</Link>
              )}
            </div>
          )}
        </div>

        <TechJobActions jobId={job.id} jobStatus={job.jobStatus} />

        {canReviseQuote && <QuoteRevisionModal jobId={job.id} />}

        {job.quoteAmount && Number(job.quoteAmount) > 0 && (
          <QuotePanel jobId={job.id} quoteStatus={job.quoteStatus} quoteAmount={job.quoteAmount} quoteGst={job.quoteGst ?? ""} quoteTotalWithGst={job.quoteTotalWithGst ?? ""} quoteItems={quoteItems} role="technician" />
        )}

        {thread ? (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <p className="font-semibold text-sm text-gray-900">Job Chat</p>
              {thread.pendingOn && thread.pendingOn !== "none" && (
                <span className="ml-auto text-xs text-gray-400">Waiting on <span className="font-medium capitalize">{thread.pendingOn}</span></span>
              )}
            </div>
            <div className="h-[400px]">
              <ChatPanel threadId={thread.id} jobId={job.id} initialMessages={messages.map((m) => ({ id: m.id, type: m.type as "text" | "attachment" | "system", content: m.content, createdAt: m.createdAt, sender: m.senderId ? { id: m.senderId, name: m.senderName, role: m.senderRole ?? "" } : null }))} />
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-400 text-sm">No chat thread yet</div>
        )}
      </div>
    </div>
  );
}
