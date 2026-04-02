import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { formatJob, formatThread, formatMessage, formatQuoteItem, toDbJobPatch } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId, id: userId, email, assignedTenantIds } = session.user;
  const { id } = await params;

  const { data: job } = await supabaseAdmin.from("jobs").select("*").eq("id", id).single();
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Access control
  if (role === "super_admin") {
    // ok
  } else if (role === "operations_manager") {
    const accessible = new Set([tenantId, ...(assignedTenantIds ?? [])]);
    if (!accessible.has(job.tenant_id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else if (role === "technician") {
    if (job.tenant_id !== tenantId || job.assigned_to_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (role === "client") {
    if (job.tenant_id !== tenantId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const canAccess =
      job.agent_email?.toLowerCase() === email?.toLowerCase() ||
      job.created_by_user_id === userId;
    if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else {
    if (job.tenant_id !== tenantId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [threadRes, quoteItemsRes] = await Promise.all([
    supabaseAdmin.from("chat_threads").select("*").eq("job_id", id).single(),
    supabaseAdmin.from("quote_items").select("*").eq("job_id", id).order("created_at", { ascending: true }),
  ]);

  const thread = threadRes.data ? formatThread(threadRes.data) : null;
  const quoteItems = (quoteItemsRes.data ?? []).map(formatQuoteItem);

  let messages: Record<string, string>[] = [];
  if (thread) {
    const { data: msgData } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: true });
    messages = (msgData ?? []).map(formatMessage);
  }

  return NextResponse.json({
    ...formatJob(job),
    chatThread: thread ? { ...thread, messages } : null,
    quoteItems,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, tenantId, id: userId, assignedTenantIds } = session.user;
  const { id } = await params;

  const { data: job } = await supabaseAdmin.from("jobs").select("*").eq("id", id).single();
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Access control
  if (role !== "super_admin") {
    const accessible = new Set([tenantId, ...(assignedTenantIds ?? [])]);
    if (!accessible.has(job.tenant_id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  // Clients can only approve/reject quotes
  if (role === "client") {
    const allowed = ["quoteStatus"];
    if (Object.keys(body).some((k) => !allowed.includes(k))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Technicians can only update jobStatus
  if (role === "technician") {
    const allowed = ["jobStatus"];
    if (Object.keys(body).some((k) => !allowed.includes(k))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const dbPatch = toDbJobPatch(body);
  dbPatch.updated_at = new Date().toISOString();

  const { data: updated, error } = await supabaseAdmin
    .from("jobs")
    .update(dbPatch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Post system messages for status/quote changes
  const { data: thread } = await supabaseAdmin
    .from("chat_threads")
    .select("*")
    .eq("job_id", id)
    .single();

  if (thread) {
    const statusLabels: Record<string, string> = {
      new: "Job marked as New",
      ready: "Job marked as Ready",
      in_progress: "Job Started",
      completed: "Job Completed ✅",
      invoiced: "Job Invoiced",
      paid: "Payment Received ✅",
    };
    const quoteLabels: Record<string, string> = {
      sent: "Quote Sent",
      approved: "Quote Approved ✅",
      rejected: "Quote Declined ❌",
    };

    let systemMsg = "";
    let newPendingOn = "";

    if (body.jobStatus && statusLabels[body.jobStatus]) {
      systemMsg = statusLabels[body.jobStatus];
      newPendingOn = "none";
    }
    if (body.quoteStatus && quoteLabels[body.quoteStatus]) {
      systemMsg = quoteLabels[body.quoteStatus];
      if (role === "client" && (body.quoteStatus === "approved" || body.quoteStatus === "rejected")) {
        newPendingOn = "team";
      } else if (body.quoteStatus === "sent") {
        newPendingOn = "client";
      }
    }

    if (systemMsg) {
      await supabaseAdmin.from("messages").insert({
        tenant_id: job.tenant_id,
        thread_id: thread.id,
        sender_id: null,
        sender_name: "System",
        sender_role: "system",
        type: "system",
        content: systemMsg,
      });

      if (newPendingOn) {
        await supabaseAdmin.from("chat_threads").update({
          pending_on: newPendingOn,
          last_message: systemMsg,
          last_message_at: new Date().toISOString(),
          last_message_by: role === "client" ? "client" : "team",
          updated_at: new Date().toISOString(),
        }).eq("id", thread.id);
      }
    }
  }

  return NextResponse.json(formatJob(updated));
}
