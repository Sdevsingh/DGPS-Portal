import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { formatJob, formatThread, formatMessage } from "@/lib/db";
import { ensureChatThreadForJob } from "@/lib/chat";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ChatPanel from "@/components/chat/ChatPanel";

export default async function JobChatMobilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const { role, tenantId, assignedTenantIds } = session.user;

  const { data: jobData } = await supabaseAdmin.from("jobs").select("*").eq("id", id).single();
  if (!jobData) notFound();

  if (role !== "super_admin") {
    const accessible = new Set([tenantId, ...(assignedTenantIds ?? [])]);
    if (!accessible.has(jobData.tenant_id)) notFound();
  }

  const job = formatJob(jobData);

  const { data: threadData } = await supabaseAdmin.from("chat_threads").select("*").eq("job_id", id).single();
  let thread = threadData ? formatThread(threadData) : null;
  if (!thread) thread = await ensureChatThreadForJob(id, jobData.tenant_id);

  let messages: ReturnType<typeof formatMessage>[] = [];
  if (thread) {
    const { data: msgData } = await supabaseAdmin.from("messages").select("*").eq("thread_id", thread.id).order("created_at", { ascending: true });
    messages = (msgData ?? []).map(formatMessage);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <Link href={`/jobs/${id}`} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{job.jobNumber}</p>
          <p className="text-xs text-gray-400 truncate">{job.propertyAddress}</p>
        </div>
        {thread && (
          <a href={`/api/chat/${thread.id}/pdf`} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF
          </a>
        )}
      </div>
      <div className="flex-1 min-h-0">
        {thread ? (
          <ChatPanel
            threadId={thread.id}
            jobId={job.id}
            initialMessages={messages.map((m) => ({
              id: m.id,
              type: m.type as "text" | "attachment" | "system",
              content: m.content,
              createdAt: m.createdAt,
              sender: m.senderId ? { id: m.senderId, name: m.senderName, role: m.senderRole ?? "" } : null,
            }))}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">No chat thread found</div>
        )}
      </div>
    </div>
  );
}
