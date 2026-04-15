import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";

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

  const { role, tenantId, id: userId, email, assignedTenantIds } = session.user;
  const now = new Date();
  const notifications: Notification[] = [];

  if (role === "super_admin" || role === "operations_manager") {
    // Get jobs for accessible tenants
    let jobQ = supabaseAdmin.from("jobs").select("id, job_number, property_address, tenant_id, quote_status, created_at, updated_at").or("is_archived.eq.false,is_archived.is.null");
    let threadQ = supabaseAdmin.from("chat_threads").select("id, job_id, pending_on, last_message_at, response_due_time, tenant_id");

    if (role === "operations_manager") {
      const accessible = Array.from(new Set([tenantId, ...(assignedTenantIds ?? [])]));
      jobQ = jobQ.in("tenant_id", accessible);
      threadQ = threadQ.in("tenant_id", accessible);
    }

    const [{ data: jobs }, { data: threads }] = await Promise.all([jobQ, threadQ]);

    const jobMap = new Map((jobs ?? []).map((j) => [j.id, j]));

    for (const t of threads ?? []) {
      if (t.pending_on !== "team") continue;
      const job = jobMap.get(t.job_id);
      if (!job) continue;
      notifications.push({
        id: `reply-${t.id}`,
        type: "chat_reply",
        title: "Reply needed",
        body: `${job.job_number} · ${job.property_address}`,
        href: `/jobs/${job.id}`,
        at: t.last_message_at ?? now.toISOString(),
      });
    }

    for (const t of threads ?? []) {
      if (!t.response_due_time || new Date(t.response_due_time) >= now) continue;
      if (t.pending_on === "none") continue;
      const job = jobMap.get(t.job_id);
      if (!job) continue;
      notifications.push({
        id: `overdue-${t.id}`,
        type: "overdue",
        title: "Overdue chat",
        body: `${job.job_number} · response was due`,
        href: `/jobs/${job.id}`,
        at: t.response_due_time,
      });
    }

    for (const j of jobs ?? []) {
      if (j.quote_status !== "pending") continue;
      notifications.push({
        id: `quote-${j.id}`,
        type: "pending_quote",
        title: "Quote needed",
        body: `${j.job_number} · ${j.property_address}`,
        href: `/jobs/${j.id}`,
        at: j.updated_at ?? j.created_at,
      });
    }
  }

  if (role === "technician") {
    const { data: myJobs } = await supabaseAdmin
      .from("jobs")
      .select("id, job_number, property_address, updated_at, created_at")
      .eq("tenant_id", tenantId)
      .eq("assigned_to_id", userId)
      .neq("job_status", "completed")
      .or("is_archived.eq.false,is_archived.is.null");

    for (const j of myJobs ?? []) {
      notifications.push({
        id: `assigned-${j.id}`,
        type: "job_assigned",
        title: "Job assigned to you",
        body: `${j.job_number} · ${j.property_address}`,
        href: `/technician/jobs/${j.id}`,
        at: j.updated_at ?? j.created_at,
      });
    }
  }

  if (role === "client") {
    const { data: myJobs } = await supabaseAdmin
      .from("jobs")
      .select("id, job_number, property_address, quote_status, quote_total_with_gst, updated_at, created_at")
      .eq("tenant_id", tenantId)
      .eq("agent_email", email?.toLowerCase() ?? "")
      .or("is_archived.eq.false,is_archived.is.null");

    if (myJobs && myJobs.length > 0) {
      const jobIds = myJobs.map((j) => j.id);
      const { data: threads } = await supabaseAdmin
        .from("chat_threads")
        .select("id, job_id, pending_on, last_message_at")
        .in("job_id", jobIds);

      const threadMap = new Map((threads ?? []).map((t) => [t.job_id, t]));

      for (const j of myJobs) {
        const thread = threadMap.get(j.id);
        if (thread?.pending_on === "client") {
          notifications.push({
            id: `msg-${thread.id}`,
            type: "client_message",
            title: "Message from your team",
            body: `${j.job_number} · ${j.property_address}`,
            href: `/client/jobs/${j.id}`,
            at: thread.last_message_at ?? now.toISOString(),
          });
        }
        if (j.quote_status === "sent") {
          notifications.push({
            id: `approve-${j.id}`,
            type: "pending_quote",
            title: "Quote ready to review",
            body: `${j.job_number} · $${Number(j.quote_total_with_gst ?? 0).toFixed(2)} incl. GST`,
            href: `/client/jobs/${j.id}`,
            at: j.updated_at ?? j.created_at,
          });
        }
      }
    }
  }

  notifications.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return NextResponse.json({ notifications: notifications.slice(0, 20) });
}
