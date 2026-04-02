import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findRow, findRows } from "@/lib/sheets";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ChatPanel from "@/components/chat/ChatPanel";
import QuotePanel from "@/components/jobs/QuotePanel";
import TechJobActions from "@/components/jobs/TechJobActions";

type QuoteItem = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  total: string;
};

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

export default async function TechnicianJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const { role, tenantId } = session.user;

  if (role === "client") redirect("/client");

  const [job, thread, quoteItemsRaw] = await Promise.all([
    findRow("Jobs", (r) => r.id === id),
    findRow("ChatThreads", (r) => r.jobId === id),
    findRows("QuoteItems", (r) => r.jobId === id),
  ]);

  if (!job) notFound();
  if (role !== "super_admin" && job.tenantId !== tenantId) notFound();

  const messages = thread
    ? await findRows("Messages", (r) => r.threadId === thread.id)
    : [];

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const quoteItems: QuoteItem[] = quoteItemsRaw.map((item) => ({
    id: item.id ?? "",
    description: item.description ?? "",
    quantity: item.quantity ?? "",
    unitPrice: item.unitPrice ?? "",
    total: item.total ?? "",
  }));
  const inspectionState = (job.inspectionRequired ?? "") as string;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top priority bar */}
      <div className={`h-1.5 ${PRIORITY_BAR[job.priority] ?? "bg-gray-300"}`} />

      {/* Header */}
      <div className="bg-gray-900 text-white px-4 pt-4 pb-5">
        <Link
          href="/technician"
          className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-3"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          My Jobs
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold">{job.propertyAddress}</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {job.jobNumber} · {job.category}
            </p>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLE[job.jobStatus] ?? "bg-gray-700 text-gray-300"}`}
          >
            {job.jobStatus.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
        {/* Navigate button */}
        <a
          href={`https://maps.apple.com/?q=${encodeURIComponent(job.propertyAddress)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 w-full py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors justify-center"
        >
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Navigate to Site
        </a>

        {/* Job details card */}
        <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
          {job.description && (
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Description</p>
              <p className="text-sm text-gray-700 leading-relaxed">{job.description}</p>
            </div>
          )}
          <div className="px-5 py-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Priority</p>
              <p className={`text-sm font-semibold capitalize ${job.priority === "high" ? "text-red-600" : job.priority === "medium" ? "text-yellow-600" : "text-green-600"}`}>
                {job.priority}
              </p>
            </div>
            {job.slaDeadline && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">SLA Deadline</p>
                <p className="text-sm font-medium text-gray-800">
                  {new Date(job.slaDeadline).toLocaleDateString("en-AU")}
                </p>
              </div>
            )}
            {job.agentName && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Agent</p>
                <p className="text-sm font-medium text-gray-800">{job.agentName}</p>
              </div>
            )}
            {job.agentContact && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Contact</p>
                <a href={`tel:${job.agentContact}`} className="text-sm font-medium text-blue-600 hover:underline">
                  {job.agentContact}
                </a>
              </div>
            )}
          </div>
          {(inspectionState === "true" || inspectionState === "done") && (
            <div className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Inspection Required</span>
                {inspectionState === "done" && (
                  <span className="text-xs text-green-600 font-medium">✓ Done</span>
                )}
              </div>
              {inspectionState !== "done" && (
                <Link
                  href={`/jobs/${id}/inspection`}
                  className="text-sm font-semibold text-purple-600 hover:text-purple-700"
                >
                  Start →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Status + photo actions */}
        <TechJobActions jobId={job.id} jobStatus={job.jobStatus} />

        {/* Quote — read-only for technician */}
        {job.quoteAmount && Number(job.quoteAmount) > 0 && (
          <QuotePanel
            jobId={job.id}
            quoteStatus={job.quoteStatus}
            quoteAmount={job.quoteAmount}
            quoteGst={job.quoteGst ?? ""}
            quoteTotalWithGst={job.quoteTotalWithGst ?? ""}
            quoteItems={quoteItems}
            role="technician"
          />
        )}

        {/* Chat */}
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
                <span className="ml-auto text-xs text-gray-400">
                  Waiting on <span className="font-medium capitalize">{thread.pendingOn}</span>
                </span>
              )}
            </div>
            <div className="h-[400px]">
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
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-400 text-sm">
            No chat thread yet
          </div>
        )}
      </div>
    </div>
  );
}
