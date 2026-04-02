import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findRow, findRows } from "@/lib/sheets";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ChatPanel from "@/components/chat/ChatPanel";
import QuoteApproveActions from "@/components/jobs/QuoteApproveActions";
import { ensureChatThreadForJob } from "@/lib/chat";

const STEPS = ["new", "ready", "in_progress", "completed", "invoiced", "paid"];
const STEP_LABELS = ["Submitted", "Ready", "In Progress", "Completed", "Invoiced", "Paid"];

export default async function ClientJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "client") redirect("/dashboard");

  const { id } = await params;

  const [job, existingThread, quoteItems] = await Promise.all([
    findRow("Jobs", (r) => r.id === id),
    findRow("ChatThreads", (r) => r.jobId === id),
    findRows("QuoteItems", (r) => r.jobId === id),
  ]);

  if (!job) notFound();

  // Security: clients can only see their own jobs within their tenant
  const isOwner =
    job.tenantId === session.user.tenantId &&
    (
      job.agentEmail?.toLowerCase() === session.user.email?.toLowerCase() ||
      job.createdByUserId === session.user.id
    );
  if (!isOwner) notFound();

  const thread = existingThread ?? await ensureChatThreadForJob(job.id, job.tenantId);

  const messages = thread
    ? await findRows("Messages", (r) => r.threadId === thread.id)
    : [];

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const stepIndex = STEPS.indexOf(job.jobStatus);
  const hasQuote = job.quoteAmount && Number(job.quoteAmount) > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-14 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/client"
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 truncate">{job.propertyAddress}</p>
            <p className="text-xs text-gray-400">{job.jobNumber} · {job.category}</p>
          </div>
          {job.inspectionRequired === "true" && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
              Inspection
            </span>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Status timeline */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Job Status</p>
          <div className="flex items-center gap-1 mb-3">
            {STEPS.map((step, i) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`w-3 h-3 rounded-full shrink-0 border-2 ${
                    i < stepIndex
                      ? "bg-blue-600 border-blue-600"
                      : i === stepIndex
                      ? "bg-blue-600 border-blue-600 ring-4 ring-blue-100"
                      : "bg-white border-gray-300"
                  }`}
                />
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 ${
                      i < stepIndex ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            {STEP_LABELS.map((label, i) => (
              <p
                key={label}
                className={`text-xs text-center flex-1 ${
                  i === stepIndex ? "text-blue-600 font-semibold" : "text-gray-400"
                }`}
              >
                {label}
              </p>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Problem Description</p>
          <p className="text-sm text-gray-700 leading-relaxed">{job.description}</p>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
            <span>Submitted {new Date(job.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</span>
            {job.inspectionRequired === "true" && (
              <span className="text-purple-500 font-medium">· Inspection required</span>
            )}
          </div>
        </div>

        {/* Quote breakdown */}
        {hasQuote && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Quote Breakdown</p>
              {job.quoteStatus === "sent" && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                  Awaiting Approval
                </span>
              )}
              {job.quoteStatus === "approved" && (
                <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                  Approved
                </span>
              )}
              {job.quoteStatus === "rejected" && (
                <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium">
                  Declined
                </span>
              )}
            </div>

            {quoteItems.length > 0 && (
              <div className="space-y-2 mb-4">
                {quoteItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm text-gray-800">{item.description}</p>
                      <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium text-gray-900 whitespace-nowrap">
                      ${Number(item.total).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-gray-100 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>${Number(job.quoteAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>GST (10%)</span>
                <span>${Number(job.quoteGst || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                <span>Total</span>
                <span>${Number(job.quoteTotalWithGst).toFixed(2)}</span>
              </div>
            </div>

            {/* Approve/Decline actions */}
            {job.quoteStatus === "sent" && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <QuoteApproveActions jobId={job.id} />
              </div>
            )}
          </div>
        )}

        {/* Chat */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Messages</p>
              <p className="text-xs text-gray-400">Chat with our team</p>
            </div>
          </div>
          <div className="h-80">
            {thread ? (
              <ChatPanel
                threadId={thread.id}
                jobId={job.id}
                initialMessages={sortedMessages.map((m) => ({
                  id: m.id,
                  type: m.type as "text" | "attachment" | "system",
                  content: m.content,
                  createdAt: m.createdAt,
                  sender: m.senderId
                    ? { id: m.senderId, name: m.senderName, role: m.senderRole ?? "" }
                    : null,
                }))}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No messages yet
              </div>
            )}
          </div>
        </div>

        <div className="pb-8" />
      </div>
    </div>
  );
}
