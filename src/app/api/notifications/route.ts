import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRows, findRows } from "@/lib/sheets";

export type Notification = {
  id: string;
  type: "chat_reply" | "overdue" | "pending_quote" | "job_assigned" | "client_message";
  title: string;
  body: string;
  href: string;
  at: string;
};

export async function GET(req: NextRequest) {
  void req;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId, email } = session.user;
  const now = new Date();
  const notifications: Notification[] = [];

  if (role === "super_admin" || role === "operations_manager") {
    const [allJobs, allThreads] = await Promise.all([
      getRows("Jobs"),
      getRows("ChatThreads"),
    ]);

    const jobs = role === "super_admin" ? allJobs : allJobs.filter((j) => j.tenantId === tenantId);
    const threads = role === "super_admin" ? allThreads : allThreads.filter((t) => t.tenantId === tenantId);

    const jobMap = new Map(jobs.map((j) => [j.id, j]));

    // Chats needing team reply
    for (const t of threads) {
      if (t.pendingOn !== "team") continue;
      const job = jobMap.get(t.jobId);
      if (!job) continue;
      notifications.push({
        id: `reply-${t.id}`,
        type: "chat_reply",
        title: "Reply needed",
        body: `${job.jobNumber} · ${job.propertyAddress}`,
        href: `/jobs/${job.id}`,
        at: t.lastMessageAt,
      });
    }

    // Overdue chats
    for (const t of threads) {
      if (!t.responseDueTime || new Date(t.responseDueTime) >= now) continue;
      if (t.pendingOn === "none") continue;
      const job = jobMap.get(t.jobId);
      if (!job) continue;
      notifications.push({
        id: `overdue-${t.id}`,
        type: "overdue",
        title: "Overdue chat",
        body: `${job.jobNumber} · response was due`,
        href: `/jobs/${job.id}`,
        at: t.responseDueTime,
      });
    }

    // Pending quotes (job received but no quote sent)
    for (const j of jobs) {
      if (j.quoteStatus !== "pending") continue;
      notifications.push({
        id: `quote-${j.id}`,
        type: "pending_quote",
        title: "Quote needed",
        body: `${j.jobNumber} · ${j.propertyAddress}`,
        href: `/jobs/${j.id}`,
        at: j.createdAt,
      });
    }
  }

  if (role === "technician") {
    const allJobs = await getRows("Jobs");
    const myJobs = allJobs.filter(
      (j) => j.tenantId === tenantId && j.assignedToId === session.user.id && j.jobStatus !== "completed"
    );
    for (const j of myJobs) {
      notifications.push({
        id: `assigned-${j.id}`,
        type: "job_assigned",
        title: "Job assigned to you",
        body: `${j.jobNumber} · ${j.propertyAddress}`,
        href: `/technician/jobs/${j.id}`,
        at: j.updatedAt || j.createdAt,
      });
    }
  }

  if (role === "client") {
    const myJobs = await findRows("Jobs", (j) => j.agentEmail === email && j.tenantId === tenantId);
    const threads = await getRows("ChatThreads");

    for (const j of myJobs) {
      const thread = threads.find((t) => t.jobId === j.id);
      if (!thread) continue;
      if (thread.pendingOn === "client") {
        notifications.push({
          id: `msg-${thread.id}`,
          type: "client_message",
          title: "Message from your team",
          body: `${j.jobNumber} · ${j.propertyAddress}`,
          href: `/client/jobs/${j.id}`,
          at: thread.lastMessageAt,
        });
      }
      if (j.quoteStatus === "sent") {
        notifications.push({
          id: `approve-${j.id}`,
          type: "pending_quote",
          title: "Quote ready to review",
          body: `${j.jobNumber} · $${Number(j.quoteTotalWithGst).toFixed(2)} incl. GST`,
          href: `/client/jobs/${j.id}`,
          at: j.updatedAt || j.createdAt,
        });
      }
    }
  }

  // Sort newest first, cap at 20
  notifications.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return NextResponse.json({ notifications: notifications.slice(0, 20) });
}
