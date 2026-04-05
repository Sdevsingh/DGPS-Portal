import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { formatJob, formatThread, formatMessage, formatQuoteItem } from "@/lib/db";
import { ensureChatThreadForJob } from "@/lib/chat";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ChatPanel from "@/components/chat/ChatPanel";
import QuoteApproveActions from "@/components/jobs/QuoteApproveActions";

const PRIORITY_STYLE: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-emerald-100 text-emerald-700",
};
const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  invoiced: "bg-orange-100 text-orange-700",
  paid: "bg-emerald-100 text-emerald-700",
};

function normalizeClientStatus(status: string): string {
  if (status === "ready") return "in_progress";
  return status;
}

export default async function ClientJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "client") redirect("/dashboard");

  const { id } = await params;
  const { tenantId, id: userId, email } = session.user;

  const { data: jobData } = await supabaseAdmin.from("jobs").select("*").eq("id", id).single();
  if (!jobData) notFound();

  const isOwner =
    jobData.tenant_id === tenantId &&
    (jobData.agent_email?.toLowerCase() === email?.toLowerCase() || jobData.created_by_user_id === userId);
  if (!isOwner) notFound();

  const job = formatJob(jobData);

  const [threadRes, quoteItemsRes] = await Promise.all([
    supabaseAdmin.from("chat_threads").select("*").eq("job_id", id).single(),
    supabaseAdmin.from("quote_items").select("*").eq("job_id", id).order("created_at", { ascending: true }),
  ]);

  let thread = threadRes.data ? formatThread(threadRes.data) : null;
  if (!thread) thread = await ensureChatThreadForJob(id, jobData.tenant_id);

  const quoteItems = (quoteItemsRes.data ?? []).map(formatQuoteItem);

  let messages: ReturnType<typeof formatMessage>[] = [];
  if (thread) {
    const { data: msgData } = await supabaseAdmin.from("messages").select("*").eq("thread_id", thread.id).order("created_at", { ascending: true });
    messages = (msgData ?? []).map(formatMessage);
  }

  const normalizedStatus = normalizeClientStatus(job.jobStatus);
  const hasQuote = job.quoteAmount && Number(job.quoteAmount) > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-14 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/client" className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 truncate">{job.propertyAddress}</p>
            <p className="text-xs text-gray-400">{job.jobNumber} · {job.category}</p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PRIORITY_STYLE[job.priority] ?? "bg-gray-100 text-gray-600"}`}>{job.priority || "medium"}</span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLE[normalizedStatus] ?? "bg-gray-100 text-gray-600"}`}>{(normalizedStatus || "new").replace(/_/g, " ")}</span>
          {job.inspectionRequired === "true" && <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">Inspection</span>}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Job Status</p>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-sm font-semibold text-gray-900 capitalize">{(normalizedStatus || "new").replace(/_/g, " ")}</p>
            <p className="text-xs text-gray-500 mt-1">We&apos;ll notify you here whenever the status changes.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-200 p-3">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Priority</p>
            <p className="text-sm font-semibold text-gray-900 mt-1 capitalize">{job.priority || "medium"}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-3">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Quote</p>
            <p className="text-sm font-semibold text-gray-900 mt-1 capitalize">{job.quoteStatus || "pending"}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-3">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Submitted</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{new Date(job.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</p>
          </div>
        </div>

        {/* Customer Details — who this job was raised for */}
        {(job.companyName || job.customerContact || job.customerEmail) && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Customer Details</p>
            <div className="space-y-3">
              {/* Name + Phone on same row */}
              {job.companyName && (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{job.companyName}</p>
                    {job.customerContact && (
                      <p className="text-xs text-gray-500 mt-0.5">{job.customerContact}</p>
                    )}
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
          </div>
        )}

        {/* Submitted by — which agent from the company raised this job */}
        {(job.agentName || job.agentContact) && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Submitted By</p>
            <div className="space-y-2">
              {job.agentName && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Agent</span>
                  <span className="text-sm font-medium text-gray-800">{job.agentName}</span>
                </div>
              )}
              {job.agentContact && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Contact</span>
                  <span className="text-sm font-medium text-gray-800">{job.agentContact}</span>
                </div>
              )}
              {job.agentEmail && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Email</span>
                  <span className="text-sm font-medium text-gray-800">{job.agentEmail}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Problem Description</p>
          <p className="text-sm text-gray-700 leading-relaxed">{job.description}</p>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
            <span>Submitted {new Date(job.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</span>
            {job.inspectionRequired === "true" && <span className="text-purple-500 font-medium">· Inspection required</span>}
          </div>
        </div>

        {hasQuote && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Quote Breakdown</p>
              {job.quoteStatus === "sent" && <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">Awaiting Approval</span>}
              {job.quoteStatus === "approved" && <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">Approved</span>}
              {job.quoteStatus === "rejected" && <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium">Declined</span>}
            </div>
            {quoteItems.length > 0 && (
              <div className="space-y-2 mb-4">
                {quoteItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm text-gray-800">{item.description}</p>
                      <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium text-gray-900 whitespace-nowrap">${Number(item.total).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-gray-100 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>${Number(job.quoteAmount).toFixed(2)}</span></div>
              <div className="flex justify-between text-sm text-gray-500"><span>GST (10%)</span><span>${Number(job.quoteGst || 0).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200"><span>Total</span><span>${Number(job.quoteTotalWithGst).toFixed(2)}</span></div>
            </div>
            {job.quoteStatus === "sent" && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <QuoteApproveActions jobId={job.id} />
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Messages</p>
              <p className="text-xs text-gray-400">{thread?.pendingOn === "team" ? "Our team will reply shortly" : thread?.pendingOn === "client" ? "Waiting on your response" : "Chat with our team"}</p>
            </div>
          </div>
          <div className="h-80">
            {thread ? (
              <ChatPanel threadId={thread.id} jobId={job.id} initialMessages={messages.map((m) => ({ id: m.id, type: m.type as "text" | "attachment" | "system", content: m.content, createdAt: m.createdAt, sender: m.senderId ? { id: m.senderId, name: m.senderName, role: m.senderRole ?? "" } : null }))} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">No messages yet</div>
            )}
          </div>
        </div>
        <div className="pb-8" />
      </div>
    </div>
  );
}
